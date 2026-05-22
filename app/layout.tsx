import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AgroVisão — Assistente Agronômico',
  description: 'Assistente inteligente para produtores rurais brasileiros. Informações técnicas, cotação de insumos e recomendações baseadas em dados oficiais da Embrapa e MAPA.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AgroVisão',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'AgroVisão',
    title: 'AgroVisão — Assistente Agronômico',
    description: 'Assistente inteligente para produtores rurais brasileiros.',
  },
}

export const viewport: Viewport = {
  themeColor: '#16a34a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-agro-50 min-h-screen">
        <div className="max-w-md mx-auto min-h-screen relative bg-white shadow-xl">
          {children}
        </div>
      </body>
    </html>
  )
}
