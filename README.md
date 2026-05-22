# 🌿 AgroVisão — MVP

Assistente agronômico inteligente para produtores rurais brasileiros.  
PWA (Progressive Web App) com chat de IA + cotação de insumos.

## Funcionalidades do MVP

- **Chat com Agente IA** — Perguntas técnicas sobre pragas, doenças, adubação, manejo, pecuária. Base de conhecimento da Embrapa e MAPA embutida no sistema.
- **Cotação de Insumos** — Busca em tempo real no Mercado Livre. Defensivos, fertilizantes, sementes, equipamentos.
- **PWA** — Instalável no celular como app nativo. Funciona offline para funções básicas.

---

## Como rodar localmente

### 1. Pré-requisitos

- Node.js 18+ instalado
- Chave da API da Anthropic: [console.anthropic.com](https://console.anthropic.com/)

### 2. Instalar dependências

```bash
cd agrovisao
npm install
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Abra `.env.local` e cole sua chave:

```
ANTHROPIC_API_KEY=sk-ant-api03-sua-chave-aqui
```

### 4. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## Deploy no Vercel (5 minutos)

### Opção A — Via interface (mais fácil)

1. Faça upload da pasta `agrovisao` no GitHub
2. Acesse [vercel.com](https://vercel.com) → **New Project**
3. Importe o repositório
4. Em **Environment Variables**, adicione:
   - `ANTHROPIC_API_KEY` = sua chave
5. Clique **Deploy**
6. Em segundos você terá uma URL pública (ex: `agrovisao.vercel.app`)

### Opção B — Via CLI

```bash
npm i -g vercel
vercel
# Siga as instruções, adicione a env var quando solicitado
```

---

## Estrutura do projeto

```
agrovisao/
├── app/
│   ├── page.tsx              # Home screen
│   ├── layout.tsx            # Layout raiz + PWA meta
│   ├── globals.css           # Estilos globais
│   ├── chat/
│   │   └── page.tsx          # Interface de chat
│   ├── precos/
│   │   └── page.tsx          # Busca de preços
│   └── api/
│       ├── chat/route.ts     # Proxy para Claude API
│       └── produtos/route.ts # Proxy para Mercado Livre
├── public/
│   ├── manifest.json         # PWA manifest
│   └── icons/                # Ícones do app
├── .env.local.example        # Template de variáveis
└── README.md
```

---

## Próximos passos pós-feira

- [ ] **RAG completo** — Ingestão de PDFs da Embrapa no Supabase + pgvector
- [ ] **Análise de foto** — Claude Vision para diagnóstico de doenças em folhas
- [ ] **Clima integrado** — INMET API com alertas por geolocalização
- [ ] **Lojas locais** — Google Places API para agronomias próximas
- [ ] **Histórico de chat** — Persistência de conversas por usuário
- [ ] **Autenticação** — Login com Supabase Auth

---

## Custos estimados em produção

| Item | Custo/mês |
|------|-----------|
| Vercel (hobby) | Gratuito |
| Claude Haiku API (~1000 msgs/dia) | ~R$ 50 |
| Mercado Livre API | Gratuito |
| **Total MVP** | **~R$ 50/mês** |

---

*Desenvolvido para a 51ª ExpoGurupi 2026 — "O Agro que Inspira"*
