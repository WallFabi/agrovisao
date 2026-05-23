'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const WeatherWidget = dynamic(() => import('@/components/WeatherWidget'), { ssr: false })
const NewsCards = dynamic(() => import('@/components/NewsCards'), { ssr: false })

const tips = [
  "Soja: monitore ferrugem asiática a partir de R1. Aplique fungicida preventivo.",
  "Milho: estande ideal é 60-75 mil plantas/ha em solos de média fertilidade.",
  "Pecuária: suplementação a pasto reduz custo de arroba em até 18%.",
  "Algodão: controle de mosca-branca é crítico na fase vegetativa.",
  "Feijão: pH do solo ideal entre 5,8 e 6,5 para máxima absorção de N.",
  "Pastagem: reforma de braquiária eleva capacidade de suporte em 40%.",
]

export default function HomePage() {
  const [tip, setTip] = useState(0)
  const [time, setTime] = useState('')

  useEffect(() => {
    const interval = setInterval(() => {
      setTip(t => (t + 1) % tips.length)
    }, 5000)
    setTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    return () => clearInterval(interval)
  }, [])

  const modules = [
    {
      href: '/chat',
      icon: '🤖',
      title: 'Agente IA',
      subtitle: 'Tire dúvidas agronômicas',
      desc: 'Chat com IA baseada em dados da Embrapa, MAPA e fontes oficiais',
      color: 'from-agro-600 to-agro-700',
      badge: 'Técnico',
      badgeColor: 'bg-agro-200 text-agro-800',
    },
    {
      href: '/precos',
      icon: '🛒',
      title: 'Cotação de Insumos',
      subtitle: 'Pesquisa no Mercado Livre',
      desc: 'Compare preços de defensivos, fertilizantes e equipamentos',
      color: 'from-terra-600 to-amber-700',
      badge: 'Ao vivo',
      badgeColor: 'bg-amber-100 text-amber-800',
    },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-br from-agro-700 to-agro-900 text-white px-5 pt-12 pb-8">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-agro-300 pulse-green" />
            <span className="text-agro-200 text-xs font-medium">Online • {time}</span>
          </div>
          <span className="text-agro-200 text-xs">v1.0 MVP</span>
        </div>
        <div className="mt-4">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">🌿</span>
            <h1 className="text-2xl font-bold tracking-tight">AgroVisão</h1>
          </div>
          <p className="text-agro-200 text-sm mt-1">
            Assistente inteligente para o produtor rural
          </p>
        </div>

        {/* Widget clima */}
        <WeatherWidget />

        {/* Tip rotativa */}
        <div className="mt-3 bg-white/10 rounded-xl p-3 border border-white/20">
          <p className="text-xs text-agro-200 font-medium mb-1">💡 Dica técnica</p>
          <p className="text-sm text-white transition-all duration-500">
            {tips[tip]}
          </p>
        </div>
      </header>

      {/* Notícias */}
      <NewsCards />

      {/* Main modules */}
      <main className="flex-1 px-4 py-6 space-y-4">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider px-1">
          O que você precisa hoje?
        </p>

        {modules.map((mod) => (
          <Link key={mod.href} href={mod.href}>
            <div className={`bg-gradient-to-r ${mod.color} rounded-2xl p-5 text-white shadow-lg active:scale-95 transition-transform cursor-pointer mb-4`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-3xl">{mod.icon}</span>
                  <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${mod.badgeColor}`}>
                    {mod.badge}
                  </span>
                </div>
                <span className="text-white/60 text-xl">→</span>
              </div>
              <h2 className="text-lg font-bold">{mod.title}</h2>
              <p className="text-white/80 text-sm font-medium">{mod.subtitle}</p>
              <p className="text-white/60 text-xs mt-1">{mod.desc}</p>
            </div>
          </Link>
        ))}

        {/* Quick actions */}
        <div className="mt-2">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider px-1 mb-3">
            Perguntas rápidas
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { q: 'Ferrugem na soja', icon: '🍃' },
              { q: 'Dose de ureia no milho', icon: '🌽' },
              { q: 'Suplemento bovino', icon: '🐄' },
              { q: 'Controle de pragas', icon: '🐛' },
            ].map((item) => (
              <Link
                key={item.q}
                href={`/chat?q=${encodeURIComponent(item.q)}`}
                className="flex items-center gap-2 bg-agro-50 border border-agro-100 rounded-xl px-3 py-3 text-sm text-agro-800 font-medium hover:bg-agro-100 transition-colors active:scale-95"
              >
                <span>{item.icon}</span>
                <span className="text-xs">{item.q}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Embrapa badge */}
        <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-3">
          <span className="text-2xl">📚</span>
          <div>
            <p className="text-xs font-semibold text-blue-800">Base de dados técnica</p>
            <p className="text-xs text-blue-600">Baseado em publicações da Embrapa, MAPA e AGROFIT</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-5 py-4 border-t border-gray-100 bg-white">
        <p className="text-center text-xs text-gray-400">
          AgroVisão © 2026 • Informações técnicas para o campo
        </p>
      </footer>
    </div>
  )
}
