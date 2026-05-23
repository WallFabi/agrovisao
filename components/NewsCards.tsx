'use client'

import { useEffect, useState } from 'react'
import type { NewsItem } from '@/app/api/noticias/route'

function timeAgo(dateStr: string): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `há ${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  return `há ${days}d`
}

export default function NewsCards() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/noticias')
      .then(r => r.json())
      .then(d => setNews(d.noticias ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 py-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex-shrink-0 w-52 h-20 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (news.length === 0) return null

  return (
    <div>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider px-4 mb-2 pt-4">
        Notícias do Agro
      </p>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
        {news.map((item, i) => (
          <a
            key={i}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 w-56 bg-white border border-gray-100 rounded-xl p-3 shadow-sm active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-sm">{item.sourceIcon}</span>
              <span className="text-xs text-gray-400 font-medium">{item.source}</span>
              {item.pubDate && (
                <span className="text-xs text-gray-300 ml-auto">{timeAgo(item.pubDate)}</span>
              )}
            </div>
            <p className="text-xs text-gray-700 font-medium leading-snug line-clamp-3">
              {item.title}
            </p>
          </a>
        ))}
      </div>
    </div>
  )
}
