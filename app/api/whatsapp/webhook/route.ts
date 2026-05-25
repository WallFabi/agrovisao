import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const WAHA_API_URL = process.env.WAHA_API_URL ?? 'https://waha.wexia.com.br'
const WAHA_API_KEY = process.env.WAHA_API_KEY ?? ''
const WAHA_SESSION = 'default'
const MAX_HISTORY = 10

// In-memory history — persists while the serverless instance is warm
const conversations = new Map<string, { role: 'user' | 'assistant'; content: string }[]>()

const SYSTEM_PROMPT = `Você é o AgroVisão, um assistente agronômico especializado desenvolvido para produtores rurais brasileiros. Você é preciso, prático e direto ao ponto.

Está respondendo via WhatsApp — seja conciso, use no máximo 3-4 parágrafos curtos por mensagem, prefira listas simples.

## Sua base de conhecimento técnico

**SOJA:** Ciclo 90-140 dias. Ferrugem asiática: fungicida preventivo R1-R2 (triazol + estrobilurina). Produtividade média BR: 60 sc/ha.
**MILHO:** Estande 55-75 mil plantas/ha. Ureia parcelada V4 e V8 (100-150 kg/ha cada). Lagarta-do-cartucho: monitorar com armadilha.
**ALGODÃO:** Bicudo: armadilha feromônio desde transplante. Desfolha com 60-70% algodão aberto.
**PASTAGEM:** Brachiaria: entrada 25-35 cm, saída 10-15 cm (resíduo). Marandu: 1,5-2,0 UA/ha bem manejada.
**PECUÁRIA:** Sal proteinado 100-150 g/animal/dia. FAMACHA para verminose. Aftosa: vacinação obrigatória MAPA.
**SOLO:** pH ideal 6,0-6,5. V% soja 60-70%. PRNT mínimo 80% para calcário.
**MERCADO (ref. 2025/2026):** Soja Gurupi-TO R$115-135/sc. Milho TO R$55-70/sc. Arroba boi gordo TO R$330-370.

## Como responder
- Seja direto e prático — produtor está no campo
- Use dados concretos: dose, kg/ha, preços de referência
- Para defensivos: sempre indique necessidade de receituário agronômico (Lei 7.802/89)
- Responda sempre em português brasileiro
- Se não souber com certeza, diga claramente`

async function wahaPost(path: string, body: object) {
  return fetch(`${WAHA_API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': WAHA_API_KEY,
    },
    body: JSON.stringify(body),
  })
}

async function sendText(chatId: string, text: string) {
  await wahaPost('/api/sendText', { session: WAHA_SESSION, chatId, text })
}

async function showTyping(chatId: string, ms: number) {
  try {
    await wahaPost('/api/startTyping', { session: WAHA_SESSION, chatId })
    await new Promise(r => setTimeout(r, ms))
    await wahaPost('/api/stopTyping', { session: WAHA_SESSION, chatId })
  } catch {
    // typing indicator is optional — ignore errors
  }
}

function splitMessage(text: string, maxLen = 900): string[] {
  if (text.length <= maxLen) return [text]
  const parts: string[] = []
  let remaining = text
  while (remaining.length > maxLen) {
    let idx = remaining.lastIndexOf('\n\n', maxLen)
    if (idx < 400) idx = remaining.lastIndexOf('\n', maxLen)
    if (idx < 400) idx = remaining.lastIndexOf('. ', maxLen)
    if (idx < 400) idx = maxLen
    parts.push(remaining.slice(0, idx + 1).trim())
    remaining = remaining.slice(idx + 1).trim()
  }
  if (remaining) parts.push(remaining)
  return parts
}

export async function GET() {
  return Response.json({ ok: true, service: 'AgroVisão WhatsApp Webhook' })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Only process incoming text messages
    if (body.event !== 'message') return Response.json({ ok: true })

    const payload = body.payload
    if (!payload) return Response.json({ ok: true })
    if (payload.fromMe) return Response.json({ ok: true })
    if (payload.from?.endsWith('@g.us')) return Response.json({ ok: true }) // ignore groups
    if (!payload.body?.trim()) return Response.json({ ok: true })

    const chatId: string = payload.from
    const userText: string = payload.body.trim()

    // Upsert contact (fire-and-forget, non-blocking)
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    void supabase.rpc('upsert_contact', {
      p_phone: chatId,
      p_name: payload.pushName ?? null,
      p_message: userText.substring(0, 300),
    })

    // Build / update conversation history
    const history = conversations.get(chatId) ?? []
    history.push({ role: 'user', content: userText })
    while (history.length > MAX_HISTORY) history.shift()
    conversations.set(chatId, history)

    // Show typing while we call the AI
    const typingMs = Math.min(1000 + userText.length * 20, 4000)
    await showTyping(chatId, typingMs)

    if (!process.env.ANTHROPIC_API_KEY) {
      await sendText(chatId, 'Serviço temporariamente indisponível. Tente novamente em instantes.')
      return Response.json({ ok: true })
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const aiResponse = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: history.map(m => ({ role: m.role, content: m.content })),
    })

    const reply = aiResponse.content[0]?.type === 'text' ? aiResponse.content[0].text.trim() : ''
    if (!reply) return Response.json({ ok: true })

    // Save assistant reply to history
    history.push({ role: 'assistant', content: reply })
    while (history.length > MAX_HISTORY) history.shift()

    // Send — split long replies into multiple messages
    const parts = splitMessage(reply)
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        await showTyping(chatId, 1500)
      }
      await sendText(chatId, parts[i])
    }

    return Response.json({ ok: true })
  } catch (error) {
    console.error('[whatsapp-webhook]', error)
    return Response.json({ ok: true }) // always 200 so WAHA doesn't retry
  }
}
