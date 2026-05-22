'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const QUICK_QUESTIONS = [
  'Como identificar ferrugem asiática na soja?',
  'Qual a dose de ureia no milho em cobertura?',
  'Como melhorar a produção de leite a pasto?',
  'Quando fazer a calagem do solo?',
  'Controle de lagarta-do-cartucho no milho',
  'Suplementação mineral para bovinos de corte',
  'Como fazer adubação de pastagem degradada?',
  'Sintomas de deficiência de zinco na soja',
]

function ChatContent() {
  const searchParams = useSearchParams()
  const initialQ = searchParams.get('q')

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Olá! Sou o AgroVisão 🌿\n\nEstou aqui para ajudar com informações técnicas agronômicas baseadas em dados da **Embrapa**, **MAPA** e outras fontes oficiais.\n\nPergunte sobre culturas, pragas, doenças, adubação, manejo de pastagem, pecuária e muito mais. Como posso ajudar?',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const hasAutoSent = useRef(false)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-send se veio da home com ?q=
  useEffect(() => {
    if (initialQ && !hasAutoSent.current) {
      hasAutoSent.current = true
      sendMessage(initialQ)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || isLoading) return

    const userMsg: Message = { role: 'user', content }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Erro na resposta')
      }

      // Streaming
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      const assistantMsg: Message = { role: 'assistant', content: '' }
      setMessages([...newMessages, assistantMsg])

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        assistantContent += decoder.decode(value, { stream: true })
        setMessages([...newMessages, { role: 'assistant', content: assistantContent }])
      }
    } catch (error) {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content:
            '⚠️ Erro ao conectar com o agente. Verifique se a chave da API está configurada corretamente no arquivo `.env.local`.',
        },
      ])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const renderMessage = (content: string) => {
    // Converte markdown básico para HTML inline
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded text-xs font-mono">$1</code>')
      .split('\n')
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-4 bg-agro-700 text-white safe-area-top">
        <Link href="/" className="text-agro-200 hover:text-white transition-colors">
          ← Voltar
        </Link>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-8 h-8 bg-agro-500 rounded-full flex items-center justify-center text-sm">
            🤖
          </div>
          <div>
            <p className="text-sm font-semibold">Agente AgroVisão</p>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-agro-300 rounded-full pulse-green" />
              <span className="text-xs text-agro-200">Online • Base Embrapa + MAPA</span>
            </div>
          </div>
        </div>
        <button
          onClick={() =>
            setMessages([
              {
                role: 'assistant',
                content: 'Conversa reiniciada. Como posso ajudar? 🌿',
              },
            ])
          }
          className="text-agro-200 text-xs hover:text-white"
        >
          Limpar
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 bg-agro-100 rounded-full flex items-center justify-center text-sm mr-2 mt-1 flex-shrink-0">
                🌿
              </div>
            )}
            <div
              className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-agro-600 text-white rounded-tr-sm'
                  : 'bg-gray-50 text-gray-800 border border-gray-100 rounded-tl-sm'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div>
                  {renderMessage(msg.content).map((line, j) => (
                    <p
                      key={j}
                      className={line === '' ? 'mt-2' : ''}
                      dangerouslySetInnerHTML={{ __html: line }}
                    />
                  ))}
                </div>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="w-7 h-7 bg-agro-100 rounded-full flex items-center justify-center text-sm mr-2 flex-shrink-0">
              🌿
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-agro-400 rounded-full typing-dot" />
                <span className="w-2 h-2 bg-agro-400 rounded-full typing-dot" />
                <span className="w-2 h-2 bg-agro-400 rounded-full typing-dot" />
              </div>
            </div>
          </div>
        )}

        {/* Quick questions — mostrar só no início */}
        {messages.length === 1 && (
          <div className="mt-4">
            <p className="text-xs text-gray-400 text-center mb-3">Sugestões de perguntas</p>
            <div className="grid grid-cols-1 gap-2">
              {QUICK_QUESTIONS.slice(0, 4).map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left text-xs bg-agro-50 border border-agro-100 rounded-xl px-3 py-2.5 text-agro-700 hover:bg-agro-100 transition-colors"
                >
                  💬 {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-100 bg-white safe-area-bottom">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre pragas, doenças, adubação..."
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-agro-400 focus:border-transparent disabled:opacity-60 max-h-28"
            style={{ minHeight: '44px' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim()}
            className="w-11 h-11 bg-agro-600 text-white rounded-full flex items-center justify-center disabled:opacity-40 hover:bg-agro-700 active:scale-95 transition-all flex-shrink-0"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span className="text-lg">↑</span>
            )}
          </button>
        </div>
        <p className="text-center text-xs text-gray-300 mt-2">
          Informações técnicas • Consulte sempre um agrônomo para receituário
        </p>
      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Carregando...</div>}>
      <ChatContent />
    </Suspense>
  )
}
