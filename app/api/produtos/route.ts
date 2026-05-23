import { getAppToken, mlHeaders } from '@/lib/mercadolivre'

// Domains to exclude from agricultural search
const EXCLUDED_DOMAINS = [
  'MLB-BOOKS', 'MLB-COURSES', 'MLB-VIDEOS', 'MLB-MAGAZINES',
  'MLB-DRILL_BITS', 'MLB-VARNISHES', 'MLB-PLASTIC_PIPES', 'MLB-MANUAL_TROLLEYS',
  'MLB-SAFETY_GLOVES', 'MLB-BODY_SKIN_CARE', 'MLB-CLOTHING', 'MLB-FOOTWEAR',
]

interface MLProduct {
  id: string
  catalog_product_id: string
  domain_id: string
  name: string
}

interface MLProductDetails {
  id: string
  name: string
  permalink: string
  pictures?: { id: string; url: string }[]
}

interface MLProductItem {
  item_id: string
  price: number
  currency_id: string
  condition: string
  shipping: { free_shipping: boolean }
  original_price?: number
  seller_id: number
}

interface MLProductItemsResponse {
  paging: { total: number }
  results: MLProductItem[]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') ?? ''
  const limite = Math.min(parseInt(searchParams.get('limite') ?? '12'), 20)

  if (!query || query.trim().length < 2) {
    return Response.json({ error: 'Termo de busca muito curto' }, { status: 400 })
  }

  try {
    const token = await getAppToken()
    if (!token) {
      return Response.json({ error: 'Credenciais da API não configuradas' }, { status: 503 })
    }

    // Step 1: Search catalog products
    const searchUrl = `https://api.mercadolibre.com/products/search?site_id=MLB&q=${encodeURIComponent(query.trim())}&limit=${limite}`
    const searchResp = await fetch(searchUrl, { headers: mlHeaders(token) })

    if (!searchResp.ok) {
      throw new Error(`ML products/search: ${searchResp.status}`)
    }

    const searchData = await searchResp.json()
    const rawResults: MLProduct[] = searchData.results ?? []

    // Filter out clearly non-agricultural domains
    const filteredResults = rawResults.filter(
      p => !EXCLUDED_DOMAINS.some(d => p.domain_id?.startsWith(d))
    )

    if (filteredResults.length === 0) {
      return Response.json({ total: 0, produtos: [], query, autenticado: true, timestamp: new Date().toISOString() })
    }

    // Step 2: Fetch product details + cheapest listing in parallel
    const produtos = await Promise.all(
      filteredResults.map(async (product) => {
        const [detailsResp, itemsResp] = await Promise.allSettled([
          fetch(`https://api.mercadolibre.com/products/${product.id}`, { headers: mlHeaders(token) }),
          fetch(`https://api.mercadolibre.com/products/${product.id}/items?limit=3`, { headers: mlHeaders(token) }),
        ])

        let details: MLProductDetails | null = null
        let itemsData: MLProductItemsResponse | null = null

        if (detailsResp.status === 'fulfilled' && detailsResp.value.ok) {
          details = await detailsResp.value.json()
        }
        if (itemsResp.status === 'fulfilled' && itemsResp.value.ok) {
          itemsData = await itemsResp.value.json()
        }

        const listings = itemsData?.results ?? []
        const cheapest = listings.sort((a, b) => a.price - b.price)[0] ?? null
        const thumbnail = details?.pictures?.[0]?.url?.replace('http://', 'https://') ?? null

        if (!cheapest) return null

        return {
          id: product.id,
          titulo: product.name,
          preco: cheapest.price,
          moeda: cheapest.currency_id ?? 'BRL',
          precoFormatado: new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(cheapest.price),
          imagem: thumbnail,
          link: details?.permalink || `https://www.mercadolivre.com.br/p/${product.id}`,
          condicao: cheapest.condition === 'new' ? 'Novo' : 'Usado',
          vendedor: String(cheapest.seller_id),
          freteGratis: cheapest.shipping?.free_shipping ?? false,
          totalVendedores: itemsData?.paging?.total ?? 1,
        }
      })
    )

    const produtosFiltrados = produtos.filter(Boolean)

    return Response.json({
      total: searchData.paging?.total ?? produtosFiltrados.length,
      produtos: produtosFiltrados,
      query,
      autenticado: true,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Mercado Livre API error:', error)
    return Response.json(
      { error: 'Não foi possível buscar produtos. Tente novamente.' },
      { status: 500 }
    )
  }
}
