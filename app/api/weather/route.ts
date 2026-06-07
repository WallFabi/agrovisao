const OWM_KEY = process.env.OWM_API_KEY ?? ''
const GURUPI = { lat: -11.7307, lon: -49.0694, city: 'Gurupi-TO' }

// Maps wttr.in weather codes to OWM-equivalent IDs (for the widget icon function)
function wttrToOwmId(code: number): number {
  if (code === 113) return 800
  if (code === 116) return 801
  if (code <= 122) return 803
  if (code === 143 || code === 248 || code === 260) return 741
  if (code === 200 || code >= 386) return 211
  if (code === 263 || code === 266 || code === 281 || code === 284 || code === 176) return 310
  if (code >= 179 && code <= 230) return 601
  if ([320, 323, 326, 329, 332, 335, 338, 341, 350, 368, 371, 374, 377].includes(code)) return 601
  if (code >= 293 && code <= 377) return 501
  return 800
}

const WTTR_DESC: Record<number, string> = {
  113: 'ensolarado', 116: 'parcialmente nublado', 119: 'nublado', 122: 'encoberto',
  143: 'névoa', 248: 'nevoeiro', 260: 'nevoeiro gelado',
  176: 'chuva fraca', 179: 'neve fraca', 182: 'granizo', 185: 'garoa gelada',
  200: 'trovoadas', 227: 'nevasca', 230: 'blizzard',
  263: 'garoa leve', 266: 'garoa', 281: 'garoa gelada', 284: 'garoa gelada forte',
  293: 'chuva leve', 296: 'chuva leve', 299: 'chuva moderada', 302: 'chuva moderada',
  305: 'chuva forte', 308: 'chuva muito forte', 311: 'chuva gelada leve',
  317: 'chuva gelada moderada', 320: 'granizo leve', 323: 'granizo moderado',
  329: 'neve leve', 332: 'neve moderada', 335: 'neve moderada', 338: 'neve forte',
  353: 'pancadas de chuva', 356: 'pancadas fortes', 359: 'chuva torrencial',
  386: 'chuva com raios', 389: 'tempestade forte', 392: 'neve com raios', 395: 'tempestade de neve',
}

async function fromWttr(lat: number, lon: number) {
  const res = await fetch(`https://wttr.in/${lat},${lon}?format=j1`, {
    headers: { 'User-Agent': 'AgroVisao/1.0' },
    next: { revalidate: 1800 },
  })
  if (!res.ok) throw new Error('wttr error')
  const data = await res.json()

  const cur = data.current_condition[0]
  const wttrCode = parseInt(cur.weatherCode)
  const city = data.nearest_area?.[0]?.areaName?.[0]?.value ?? GURUPI.city

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const daily = (data.weather ?? []).slice(0, 5).map((day: any) => {
    const noonHour = day.hourly?.[4] ?? day.hourly?.[0]
    const maxRain = Math.max(...(day.hourly ?? []).map((h: { chanceofrain?: string }) => parseInt(h.chanceofrain ?? '0')))
    return {
      date: day.date,
      weatherId: wttrToOwmId(parseInt(noonHour?.weatherCode ?? '113')),
      temp_max: parseInt(day.maxtempC),
      rain_probability: maxRain,
    }
  })

  return {
    city,
    current: {
      temperature: parseInt(cur.temp_C),
      apparent_temperature: parseInt(cur.FeelsLikeC),
      windspeed: parseInt(cur.windspeedKmph),
      weatherId: wttrToOwmId(wttrCode),
      description: WTTR_DESC[wttrCode] ?? cur.weatherDesc[0]?.value?.toLowerCase() ?? '',
    },
    daily,
  }
}

async function fromOwm(lat: number, lon: number) {
  const base = `https://api.openweathermap.org/data/2.5`
  const params = `lat=${lat}&lon=${lon}&appid=${OWM_KEY}&units=metric&lang=pt_br`

  const [curRes, fcRes] = await Promise.all([
    fetch(`${base}/weather?${params}`, { next: { revalidate: 1800 } }),
    fetch(`${base}/forecast?${params}&cnt=40`, { next: { revalidate: 1800 } }),
  ])
  if (!curRes.ok) throw new Error(`owm ${curRes.status}`)

  const [cur, fc] = await Promise.all([curRes.json(), fcRes.json()])

  const days: Record<string, { tempMax: number; pop: number; id: number }> = {}
  for (const item of (fc.list ?? [])) {
    const date = item.dt_txt.slice(0, 10)
    const existing = days[date]
    if (!existing) {
      days[date] = { tempMax: item.main.temp_max, pop: item.pop ?? 0, id: item.weather[0].id }
    } else {
      existing.tempMax = Math.max(existing.tempMax, item.main.temp_max)
      existing.pop = Math.max(existing.pop, item.pop ?? 0)
      if (item.dt_txt.includes('12:00')) existing.id = item.weather[0].id
    }
  }

  return {
    city: cur.name || GURUPI.city,
    current: {
      temperature: Math.round(cur.main.temp),
      apparent_temperature: Math.round(cur.main.feels_like),
      windspeed: Math.round((cur.wind?.speed ?? 0) * 3.6),
      weatherId: cur.weather[0].id,
      description: cur.weather[0].description,
    },
    daily: Object.entries(days).slice(0, 7).map(([date, d]) => ({
      date,
      weatherId: d.id,
      temp_max: Math.round(d.tempMax),
      rain_probability: Math.round(d.pop * 100),
    })),
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') ?? String(GURUPI.lat))
  const lon = parseFloat(searchParams.get('lon') ?? String(GURUPI.lon))

  // Try OWM first (when key is active), fall back to wttr.in
  if (OWM_KEY) {
    try {
      return Response.json(await fromOwm(lat, lon))
    } catch {
      // OWM failed (key not yet active or quota) — fall through to wttr.in
    }
  }

  try {
    return Response.json(await fromWttr(lat, lon))
  } catch {
    return Response.json({ error: 'weather unavailable' }, { status: 502 })
  }
}
