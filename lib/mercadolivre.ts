// Token de app (client credentials) — não envolve login de usuário
// Válido por 6 horas; mantemos em memória no servidor para evitar requisições repetidas.

interface AppToken {
  access_token: string
  expires_at: number // timestamp em ms
}

let cachedToken: AppToken | null = null

export async function getAppToken(): Promise<string | null> {
  const appId = process.env.ML_APP_ID
  const secretKey = process.env.ML_SECRET_KEY

  if (!appId || !secretKey) return null

  const now = Date.now()
  if (cachedToken && cachedToken.expires_at > now + 60_000) {
    return cachedToken.access_token
  }

  const res = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: appId,
      client_secret: secretKey,
    }),
  })

  if (!res.ok) return null

  const data = await res.json()
  cachedToken = {
    access_token: data.access_token,
    // expires_in é em segundos; subtraímos 5 min de margem
    expires_at: now + (data.expires_in - 300) * 1000,
  }

  return cachedToken.access_token
}

export function mlHeaders(token: string | null): HeadersInit {
  const base: HeadersInit = { Accept: 'application/json', 'User-Agent': 'AgroVisao/1.0' }
  if (token) return { ...base, Authorization: `Bearer ${token}` }
  return base
}
