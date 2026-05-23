export const revalidate = 7200 // cache 2h

export interface NewsItem {
  title: string
  link: string
  pubDate: string
  source: string
  sourceIcon: string
}

const FEEDS = [
  {
    url: 'https://www.canalrural.com.br/feed/',
    source: 'Canal Rural',
    icon: '📡',
  },
  {
    url: 'https://revistagloborural.globo.com/rss.xml',
    source: 'Globo Rural',
    icon: '🌿',
  },
  {
    url: 'https://www.conab.gov.br/component/k2/?format=feed&type=rss',
    source: 'CONAB',
    icon: '🏛',
  },
]

function extractTag(xml: string, tag: string): string {
  const cdata = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[(.*?)\\]\\]><\/${tag}>`, 's'))
  if (cdata) return cdata[1].trim()
  const plain = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`, 's'))
  return plain ? plain[1].trim() : ''
}

function parseRSS(xml: string, source: string, icon: string): NewsItem[] {
  const items: NewsItem[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]
    const title = extractTag(block, 'title')
    const link = extractTag(block, 'link') || extractTag(block, 'guid')
    const pubDate = extractTag(block, 'pubDate')
    if (title && link && title.length > 10) {
      items.push({ title, link, pubDate, source, sourceIcon: icon })
    }
  }
  return items
}

export async function GET() {
  const results = await Promise.allSettled(
    FEEDS.map(async ({ url, source, icon }) => {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'AgroVisao/1.0 (RSS Reader)' },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) throw new Error(`${source}: ${res.status}`)
      const xml = await res.text()
      return parseRSS(xml, source, icon)
    })
  )

  const all: NewsItem[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value)
  }

  // Sort by date descending, take top 15
  all.sort((a, b) => {
    const da = a.pubDate ? new Date(a.pubDate).getTime() : 0
    const db = b.pubDate ? new Date(b.pubDate).getTime() : 0
    return db - da
  })

  return Response.json({ noticias: all.slice(0, 15) })
}
