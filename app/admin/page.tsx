import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'

export const dynamic = 'force-dynamic'

const ADMIN_KEY = process.env.ADMIN_KEY ?? 'agrovisao2026'

type Contact = {
  phone: string
  name: string | null
  first_seen: string
  last_seen: string
  msg_count: number
  last_message: string | null
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Araguaina' })
}

function clean(phone: string) {
  if (phone.endsWith('@lid')) return `LID:${phone.replace('@lid', '').slice(-8)}`
  return phone.replace('@c.us', '').replace('@s.whatsapp.net', '')
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { key?: string }
}) {
  noStore()
  if (searchParams.key !== ADMIN_KEY) return notFound()

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .order('last_seen', { ascending: false })

  const contacts: Contact[] = data ?? []

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-green-400">AgroVisão — Contatos WhatsApp</h1>
            <p className="text-gray-400 text-sm mt-1">{contacts.length} contatos registrados</p>
          </div>
          <a
            href={`/admin?key=${ADMIN_KEY}`}
            className="text-sm text-gray-400 hover:text-white border border-gray-700 px-3 py-1 rounded"
          >
            Atualizar
          </a>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded p-3 mb-4 text-sm text-red-300">
            Erro ao carregar: {error.message}
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 text-gray-400 text-left">
                <th className="px-4 py-3 font-medium">Telefone</th>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Primeira mensagem</th>
                <th className="px-4 py-3 font-medium">Última mensagem</th>
                <th className="px-4 py-3 font-medium text-center">Msgs</th>
                <th className="px-4 py-3 font-medium">Último texto</th>
              </tr>
            </thead>
            <tbody>
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Nenhum contato ainda. Aguardando mensagens no WhatsApp.
                  </td>
                </tr>
              ) : (
                contacts.map((c, i) => (
                  <tr
                    key={c.phone}
                    className={i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-900/10'}
                  >
                    <td className="px-4 py-3 font-mono text-green-300">{clean(c.phone)}</td>
                    <td className="px-4 py-3">{c.name ?? <span className="text-gray-600">—</span>}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{fmt(c.first_seen)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{fmt(c.last_seen)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-green-900/40 text-green-400 px-2 py-0.5 rounded-full text-xs font-semibold">
                        {c.msg_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300 max-w-xs truncate" title={c.last_message ?? ''}>
                      {c.last_message ?? <span className="text-gray-600">—</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
