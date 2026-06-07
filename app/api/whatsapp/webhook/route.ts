import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const WAHA_API_URL = process.env.WAHA_API_URL ?? 'https://waha.wexia.com.br'
const WAHA_API_KEY = process.env.WAHA_API_KEY ?? ''
const WAHA_SESSION = 'default'
const MAX_HISTORY = 20

// Deduplication: WAHA sometimes fires the same webhook twice
const processedIds = new Map<string, number>()
function isDuplicate(id: string): boolean {
  const now = Date.now()
  if (processedIds.has(id)) return true
  processedIds.set(id, now)
  // Cleanup entries older than 2 minutes
  processedIds.forEach((t, k) => {
    if (now - t > 120_000) processedIds.delete(k)
  })
  return false
}

type Message = { role: 'user' | 'assistant'; content: string }

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
- Se não souber com certeza, diga claramente

## Formatação WhatsApp (OBRIGATÓRIO)
- Use *uma palavra* com um asterisco de cada lado para negrito — NUNCA dois asteriscos **assim**
- NUNCA use # para títulos — escreva o título em *negrito* normal
- Listas com • ou - funcionam bem
- Sem tabelas, sem markdown de código`

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

async function startTyping(chatId: string) {
  try {
    await wahaPost('/api/startTyping', { session: WAHA_SESSION, chatId })
  } catch { /* optional */ }
}

async function stopTyping(chatId: string) {
  try {
    await wahaPost('/api/stopTyping', { session: WAHA_SESSION, chatId })
  } catch { /* optional */ }
}

async function showTyping(chatId: string, ms: number) {
  try {
    await wahaPost('/api/startTyping', { session: WAHA_SESSION, chatId })
    await new Promise(r => setTimeout(r, ms))
    await wahaPost('/api/stopTyping', { session: WAHA_SESSION, chatId })
  } catch { /* optional */ }
}

function mdToWhatsApp(text: string): string {
  return text
    .replace(/^#{1,6}\s+(.+)$/gm, '*$1*')   // # Título → *Título*
    .replace(/\*\*(.+?)\*\*/g, '*$1*')        // **bold** → *bold*
    .replace(/\_\_(.+?)\_\_/g, '_$1_')        // __italic__ → _italic_
    .replace(/```[\s\S]*?```/g, '')            // remove code blocks
    .replace(/`([^`]+)`/g, '$1')              // `inline code` → plain
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [link](url) → link text
    .trim()
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

async function transcribeAudio(payload: Record<string, unknown>): Promise<string | null> {
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) return null

  try {
    // WAHA stores media at localhost — replace with external host
    const media = payload.media as { url?: string; mimetype?: string } | undefined
    if (!media?.url) {
      console.error('[transcribe] no media.url in payload')
      return null
    }

    const audioUrl = media.url.replace('http://localhost:80', WAHA_API_URL)
    const audioRes = await fetch(audioUrl, {
      headers: { 'X-Api-Key': WAHA_API_KEY },
    })
    if (!audioRes.ok) {
      console.error('[transcribe] audio fetch failed:', audioRes.status, audioUrl)
      return null
    }

    const arrayBuffer = await audioRes.arrayBuffer()
    const mimetype: string = media.mimetype ?? 'audio/ogg'
    const ext = mimetype.includes('mp4') ? 'mp4'
      : mimetype.includes('webm') ? 'webm'
      : mimetype.includes('mp3') || mimetype.includes('mpeg') ? 'mp3'
      : 'ogg'

    const file = new File([arrayBuffer], `audio.${ext}`, { type: mimetype })

    const form = new FormData()
    form.append('model', 'whisper-1')
    form.append('language', 'pt')
    form.append('file', file)

    const whisperAbort = new AbortController()
    const whisperTimeout = setTimeout(() => whisperAbort.abort(), 20_000)

    let whisperRes: Response
    try {
      whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openaiKey}` },
        body: form,
        signal: whisperAbort.signal,
      })
    } finally {
      clearTimeout(whisperTimeout)
    }

    if (!whisperRes.ok) {
      const errText = await whisperRes.text()
      console.error('[transcribe] whisper error:', whisperRes.status, errText)
      return null
    }

    const result = await whisperRes.json()
    return result.text?.trim() ?? null
  } catch (e) {
    console.error('[transcribe] exception:', e)
    return null
  }
}

export async function GET() {
  return Response.json({ ok: true, service: 'AgroVisão WhatsApp Webhook' })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (body.event !== 'message') return Response.json({ ok: true })

    const payload = body.payload
    if (!payload) return Response.json({ ok: true })
    if (payload.fromMe) return Response.json({ ok: true })
    if (payload.from?.endsWith('@g.us')) return Response.json({ ok: true })

    // WAHA NOWEB doesn't send payload.type for audio — detect by hasMedia + no text body
    if (payload.id && isDuplicate(String(payload.id))) return Response.json({ ok: true })

    const isAudio = payload.hasMedia === true && !payload.body?.trim()

    if (!payload.body?.trim() && !isAudio) return Response.json({ ok: true })

    const chatId: string = payload.from

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let userText: string
    let history: Message[]

    if (isAudio) {
      // Start typing immediately, transcribe + fetch history in parallel
      startTyping(chatId)

      const [{ data: contactData }, transcript] = await Promise.all([
        supabase.from('contacts').select('history').eq('phone', chatId).maybeSingle(),
        transcribeAudio(payload as Record<string, unknown>),
      ])

      stopTyping(chatId)

      if (!transcript) {
        await sendText(chatId, '🎙️ Não consegui transcrever o áudio. Pode digitar sua dúvida?')
        return Response.json({ ok: true })
      }

      userText = transcript
      history = Array.isArray(contactData?.history) ? contactData.history : []
    } else {
      userText = payload.body.trim()
      const typingMs = Math.min(1000 + userText.length * 20, 4000)

      const [, { data: contactData }] = await Promise.all([
        showTyping(chatId, typingMs),
        supabase.from('contacts').select('history').eq('phone', chatId).maybeSingle(),
      ])

      history = Array.isArray(contactData?.history) ? contactData.history : []
    }

    // Upsert contact metadata (fire-and-forget)
    supabase.rpc('upsert_contact', {
      p_phone: chatId,
      p_name: payload.pushName ?? null,
      p_message: (isAudio ? `🎙️ ${userText}` : userText).substring(0, 300),
    }).then(({ error }) => {
      if (error) console.error('[upsert_contact]', error.message, error.code)
    })

    // Add user message and trim to max history
    history.push({ role: 'user', content: userText })
    while (history.length > MAX_HISTORY) history.shift()

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

    const reply = aiResponse.content[0]?.type === 'text' ? mdToWhatsApp(aiResponse.content[0].text) : ''
    if (!reply) return Response.json({ ok: true })

    // Add assistant reply and trim
    history.push({ role: 'assistant', content: reply })
    while (history.length > MAX_HISTORY) history.shift()

    // Save history to Supabase (fire-and-forget)
    supabase.from('contacts')
      .update({ history })
      .eq('phone', chatId)
      .then(({ error }) => {
        if (error) console.error('[history save]', error.message)
      })

    // Send — split long replies into multiple messages
    const parts = splitMessage(reply)
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) await showTyping(chatId, 1500)
      await sendText(chatId, parts[i])
    }

    return Response.json({ ok: true })
  } catch (error) {
    console.error('[whatsapp-webhook]', error)
    return Response.json({ ok: true })
  }
}
