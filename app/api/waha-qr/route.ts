export const dynamic = 'force-dynamic'

const WAHA_URL = process.env.WAHA_API_URL ?? 'https://waha.wexia.com.br'
const WAHA_KEY = process.env.WAHA_API_KEY ?? ''

export async function GET() {
  try {
    const r = await fetch(`${WAHA_URL}/api/default/auth/qr`, {
      headers: { 'X-Api-Key': WAHA_KEY },
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) {
      return Response.json({ error: r.status }, { status: r.status })
    }
    const buf = await r.arrayBuffer()
    return new Response(buf, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
