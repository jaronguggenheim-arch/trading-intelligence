import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Trading Intelligence — Supply chain signals before prices move',
  description: 'Institutional-grade market intelligence for retail investors. 5-layer convergence scores, supply chain propagation signals, and a daily morning brief — all in one app.',
  manifest: '/manifest.json',
  icons: { icon: '/icon.png', apple: '/apple-icon.png' },
  openGraph: {
    title: 'Trading Intelligence',
    description: 'Supply chain signals before prices move',
    url: 'https://www.everythingisjustoneclickaway.com',
    siteName: 'Trading Intelligence',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f0f1a',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  )
}
