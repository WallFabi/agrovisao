'use client'

import { useEffect, useState } from 'react'

interface CurrentWeather {
  temperature: number
  apparent_temperature: number
  windspeed: number
  precipitation_probability: number
  weathercode: number
}

interface DayForecast {
  date: string
  weathercode: number
  temp_max: number
  rain_probability: number
}

interface WeatherData {
  city: string
  current: CurrentWeather
  daily: DayForecast[]
}

function weatherIcon(code: number): string {
  if (code === 0) return '☀️'
  if (code <= 2) return '🌤'
  if (code === 3) return '☁️'
  if (code <= 48) return '🌫'
  if (code <= 55) return '🌦'
  if (code <= 67) return '🌧'
  if (code <= 77) return '❄️'
  if (code <= 82) return '🌧'
  if (code <= 99) return '⛈'
  return '🌡'
}

function weatherDesc(code: number): string {
  if (code === 0) return 'Céu limpo'
  if (code <= 2) return 'Parcialmente nublado'
  if (code === 3) return 'Nublado'
  if (code <= 48) return 'Neblina'
  if (code <= 55) return 'Chuvisco'
  if (code <= 67) return 'Chuva'
  if (code <= 77) return 'Neve'
  if (code <= 82) return 'Pancadas de chuva'
  if (code <= 99) return 'Tempestade'
  return ''
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!navigator.geolocation) { setLoading(false); return }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const { latitude: lat, longitude: lon } = coords

          const [weatherRes, geoRes] = await Promise.all([
            fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
              `&current=temperature_2m,apparent_temperature,precipitation_probability,windspeed_10m,weathercode` +
              `&daily=weathercode,temperature_2m_max,precipitation_probability_max` +
              `&forecast_days=7&timezone=America%2FSao_Paulo`
            ),
            fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&accept-language=pt-BR`,
              { headers: { 'User-Agent': 'AgroVisao/1.0' } }
            ),
          ])

          const [wData, gData] = await Promise.all([weatherRes.json(), geoRes.json()])

          const city =
            gData.address?.city ||
            gData.address?.town ||
            gData.address?.village ||
            gData.address?.municipality ||
            'Sua região'

          const daily: DayForecast[] = (wData.daily?.time ?? []).map(
            (date: string, i: number) => ({
              date,
              weathercode: wData.daily.weathercode[i],
              temp_max: Math.round(wData.daily.temperature_2m_max[i]),
              rain_probability: wData.daily.precipitation_probability_max[i] ?? 0,
            })
          )

          setWeather({
            city,
            current: {
              temperature: Math.round(wData.current.temperature_2m),
              apparent_temperature: Math.round(wData.current.apparent_temperature),
              windspeed: Math.round(wData.current.windspeed_10m),
              precipitation_probability: wData.current.precipitation_probability ?? 0,
              weathercode: wData.current.weathercode,
            },
            daily,
          })
        } catch {
          // silently fail
        } finally {
          setLoading(false)
        }
      },
      () => setLoading(false),
      { timeout: 8000 }
    )
  }, [])

  if (loading) {
    return (
      <div className="mt-4 bg-white/10 rounded-xl p-3 border border-white/20 animate-pulse h-16" />
    )
  }

  if (!weather) return null

  const { current, city, daily } = weather

  return (
    <div className="mt-4 bg-white/10 rounded-xl border border-white/20 overflow-hidden">
      {/* Current */}
      <div className="p-3 flex items-center justify-between">
        <div>
          <p className="text-agro-200 text-xs font-medium">{city}</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-bold text-white">{current.temperature}°C</span>
            <span className="text-agro-300 text-xs">{weatherDesc(current.weathercode)}</span>
          </div>
          <p className="text-agro-300 text-xs mt-0.5">
            Sensação {current.apparent_temperature}°C · Vento {current.windspeed} km/h
            {current.precipitation_probability > 0 && ` · 🌧 ${current.precipitation_probability}%`}
          </p>
        </div>
        <span className="text-4xl">{weatherIcon(current.weathercode)}</span>
      </div>

      {/* 7-day forecast */}
      <div className="border-t border-white/10 flex overflow-x-auto scrollbar-hide">
        {daily.map((day, i) => {
          const d = new Date(day.date + 'T12:00:00')
          const label = i === 0 ? 'Hoje' : DAYS[d.getDay()]
          return (
            <div
              key={day.date}
              className="flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 min-w-[52px]"
            >
              <span className="text-agro-300 text-xs">{label}</span>
              <span className="text-lg">{weatherIcon(day.weathercode)}</span>
              <span className="text-white text-xs font-medium">{day.temp_max}°</span>
              <span className="text-agro-300 text-xs">{day.rain_probability}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
