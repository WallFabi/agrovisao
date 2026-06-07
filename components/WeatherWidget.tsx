'use client'

import { useEffect, useState } from 'react'

interface CurrentWeather {
  temperature: number
  apparent_temperature: number
  windspeed: number
  weatherId: number
  description: string
}

interface DayForecast {
  date: string
  weatherId: number
  temp_max: number
  rain_probability: number
}

interface WeatherData {
  city: string
  current: CurrentWeather
  daily: DayForecast[]
}

function weatherIcon(id: number): string {
  if (id === 800) return '☀️'
  if (id === 801) return '🌤'
  if (id <= 804) return '☁️'
  if (id >= 200 && id < 300) return '⛈'
  if (id >= 300 && id < 400) return '🌦'
  if (id >= 500 && id < 600) return '🌧'
  if (id >= 600 && id < 700) return '❄️'
  if (id >= 700 && id < 800) return '🌫'
  return '🌡'
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchWeather(lat?: number, lon?: number) {
      try {
        const params = lat != null ? `?lat=${lat}&lon=${lon}` : ''
        const res = await fetch(`/api/weather${params}`)
        if (!res.ok) throw new Error('weather error')
        const data = await res.json()
        setWeather(data)
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }

    if (!navigator.geolocation) {
      fetchWeather()
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => fetchWeather(coords.latitude, coords.longitude),
      () => fetchWeather(), // fallback to Gurupi-TO (server default)
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
            <span className="text-agro-300 text-xs capitalize">{current.description}</span>
          </div>
          <p className="text-agro-300 text-xs mt-0.5">
            Sensação {current.apparent_temperature}°C · Vento {current.windspeed} km/h
          </p>
        </div>
        <span className="text-4xl">{weatherIcon(current.weatherId)}</span>
      </div>

      {/* 5-day forecast */}
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
              <span className="text-lg">{weatherIcon(day.weatherId)}</span>
              <span className="text-white text-xs font-medium">{day.temp_max}°</span>
              <span className="text-agro-300 text-xs">{day.rain_probability}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
