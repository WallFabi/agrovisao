// Categorias agrícolas no Mercado Livre Brasil
const AGRO_CATEGORIES = {
  'defensivos': 'MLB1459',       // Agro
  'fertilizantes': 'MLB1459',
  'sementes': 'MLB1459',
  'equipamentos': 'MLB5726',     // Máquinas agrícolas
  'geral': 'MLB1459',
}

interface MLBItem {
  id: string
  title: string
  price: number
  currency_id: string
  thumbnail: string
  permalink: string
  condition: string
  sold_quantity: number
  seller: {
    nickname: string
  }
  shipping?: {
    free_shipping: boolean
  }
  attributes?: Array<{
    id: string
    value_name: string
  }>
}

interface MLBResponse {
  results: MLBItem[]
  paging: {
    total: number
    offset: number
    limit: number
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') ?? ''
  const categoria = searchParams.get('categoria') ?? 'geral'
  const limite = Math.min(parseInt(searchParams.get('limite') ?? '12'), 20)

  if (!query || query.trim().length < 2) {
    return Response.json(
      { error: 'Termo de busca muito curto' },
      { status: 400 }
    )
  }

  try {
    // Enriquece a busca com contexto agro para resultados mais relevantes
    const searchTerm = encodeURIComponent(`${query} agrícola`)
    const categoryId = AGRO_CATEGORIES[categoria as keyof typeof AGRO_CATEGORIES] ?? 'MLB1459'

    const url = `https://api.mercadolibre.com/sites/MLB/search?q=${searchTerm}&category=${categoryId}&limit=${limite}&sort=relevance`

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AgroVisao/1.0',
      },
    })

    if (!response.ok) {
      throw new Error(`Mercado Livre API: ${response.status}`)
    }

    const data: MLBResponse = await response.json()

    // Formata e filtra os resultados
    const produtos = data.results
      .filter(item => item.price > 0)
      .map(item => ({
        id: item.id,
        titulo: item.title,
        preco: item.price,
        moeda: item.currency_id,
        precoFormatado: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(item.price),
        imagem: item.thumbnail?.replace('http://', 'https://'),
        link: item.permalink,
        condicao: item.condition === 'new' ? 'Novo' : 'Usado',
        vendedor: item.seller?.nickname ?? 'Vendedor',
        freteGratis: item.shipping?.free_shipping ?? false,
        qtdVendida: item.sold_quantity ?? 0,
      }))

    return Response.json({
      total: data.paging?.total ?? 0,
      produtos,
      query: query,
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
