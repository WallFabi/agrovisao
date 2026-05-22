'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface Produto {
  id: string
  titulo: string
  preco: number
  moeda: string
  precoFormatado: string
  imagem: string
  link: string
  condicao: string
  vendedor: string
  freteGratis: boolean
  qtdVendida: number
}

const BUSCAS_RAPIDAS = [
  { label: 'Glifosato', icon: '🧪' },
  { label: 'Ureia fertilizante', icon: '💊' },
  { label: 'Semente de soja', icon: '🌱' },
  { label: 'Pulverizador costal', icon: '🔫' },
  { label: 'Sal mineral bovino', icon: '🐄' },
  { label: 'Mangueira irrigação', icon: '💧' },
]

const CATEGORIAS = [
  { id: 'geral', label: 'Tudo' },
  { id: 'defensivos', label: 'Defensivos' },
  { id: 'fertilizantes', label: 'Fertilizantes' },
  { id: 'sementes', label: 'Sementes' },
  { id: 'equipamentos', label: 'Equipamentos' },
]

export default function PrecosPage() {
  const [query, setQuery] = useState('')
  const [categoria, setCategoria] = useState('geral')
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [buscaAtual, setBuscaAtual] = useState('')

  const buscar = async (termo?: string, cat?: string) => {
    const q = (termo ?? query).trim()
    const c = cat ?? categoria
    if (!q) return

    setLoading(true)
    setErro('')
    setBuscaAtual(q)
    setProdutos([])

    try {
      const res = await fetch(
        `/api/produtos?q=${encodeURIComponent(q)}&categoria=${c}&limite=12`
      )
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setProdutos(data.produtos ?? [])
      setTotal(data.total ?? 0)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao buscar produtos')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') buscar()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-amber-600 text-white px-4 pt-12 pb-5">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/" className="text-amber-200 hover:text-white text-sm">
            ← Voltar
          </Link>
          <div>
            <h1 className="text-lg font-bold">🛒 Cotação de Insumos</h1>
            <p className="text-amber-200 text-xs">Preços reais do Mercado Livre</p>
          </div>
        </div>

        {/* Search bar */}
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ex: glifosato, ureia, sementes soja..."
            className="flex-1 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
          <button
            onClick={() => buscar()}
            disabled={loading || !query.trim()}
            className="bg-amber-800 text-white px-4 rounded-xl font-medium text-sm disabled:opacity-50 hover:bg-amber-900 transition-colors"
          >
            {loading ? '...' : 'Buscar'}
          </button>
        </div>

        {/* Categorias */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {CATEGORIAS.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setCategoria(cat.id)
                if (query) buscar(undefined, cat.id)
              }}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                categoria === cat.id
                  ? 'bg-white text-amber-800'
                  : 'bg-amber-700 text-amber-100 hover:bg-amber-600'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 py-4">
        {/* Buscas rápidas — só mostra antes de buscar */}
        {produtos.length === 0 && !loading && !erro && (
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">
              Buscas frequentes
            </p>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {BUSCAS_RAPIDAS.map((b) => (
                <button
                  key={b.label}
                  onClick={() => {
                    setQuery(b.label)
                    buscar(b.label)
                  }}
                  className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-3 text-sm text-gray-700 hover:bg-amber-50 hover:border-amber-200 transition-colors text-left"
                >
                  <span className="text-lg">{b.icon}</span>
                  <span className="text-xs font-medium">{b.label}</span>
                </button>
              ))}
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-sm font-semibold text-blue-800 mb-1">📌 Como funciona</p>
              <p className="text-xs text-blue-700">
                Pesquisamos em tempo real no Mercado Livre e mostramos os produtos mais relevantes com preço atualizado. Clique no produto para comprar diretamente ou use o preço como referência para negociar com fornecedores locais.
              </p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-3 border-amber-200 border-t-amber-600 rounded-full animate-spin" style={{ borderWidth: '3px' }} />
            <p className="text-sm text-gray-500">Buscando preços de <strong>{buscaAtual}</strong>...</p>
          </div>
        )}

        {/* Erro */}
        {erro && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
            <p className="text-sm text-red-700">⚠️ {erro}</p>
            <button
              onClick={() => buscar()}
              className="mt-2 text-xs text-red-600 underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Resultados */}
        {produtos.length > 0 && !loading && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500">
                <span className="font-semibold text-gray-700">{total.toLocaleString('pt-BR')}</span> resultados para{' '}
                <span className="font-semibold text-amber-700">&ldquo;{buscaAtual}&rdquo;</span>
              </p>
              <p className="text-xs text-gray-400">Mercado Livre</p>
            </div>

            <div className="space-y-3">
              {produtos.map((produto) => (
                <a
                  key={produto.id}
                  href={produto.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-3 bg-white rounded-2xl p-3 border border-gray-100 hover:border-amber-200 hover:shadow-sm transition-all active:scale-98"
                >
                  {/* Imagem */}
                  <div className="w-20 h-20 flex-shrink-0 bg-gray-50 rounded-xl overflow-hidden">
                    {produto.imagem ? (
                      <img
                        src={produto.imagem}
                        alt={produto.titulo}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🌿</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 font-medium line-clamp-2 leading-tight mb-1">
                      {produto.titulo}
                    </p>
                    <p className="text-lg font-bold text-amber-700">{produto.precoFormatado}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        produto.condicao === 'Novo'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {produto.condicao}
                      </span>
                      {produto.freteGratis && (
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          Frete grátis
                        </span>
                      )}
                      {produto.qtdVendida > 0 && (
                        <span className="text-xs text-gray-400">
                          {produto.qtdVendida} vendidos
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      Vendedor: {produto.vendedor}
                    </p>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center text-gray-300 flex-shrink-0">
                    →
                  </div>
                </a>
              ))}
            </div>

            {/* Disclaimer */}
            <div className="mt-4 bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 text-center">
                Preços consultados em tempo real no Mercado Livre. Valores podem variar.
                Para grandes volumes, negocie diretamente com distribuidores locais.
              </p>
            </div>

            {/* CTA Chat */}
            <Link
              href="/chat"
              className="mt-3 flex items-center gap-3 bg-agro-50 border border-agro-200 rounded-xl p-3"
            >
              <span className="text-2xl">🤖</span>
              <div>
                <p className="text-sm font-semibold text-agro-800">Dúvidas técnicas sobre esse produto?</p>
                <p className="text-xs text-agro-600">Pergunte ao Agente AgroVisão →</p>
              </div>
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
