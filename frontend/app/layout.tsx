import type { Metadata } from 'next'
import { Space_Mono, Syne } from 'next/font/google'
import './globals.css'

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '600', '700', '800']
})
const monoe = <small>m</small>;

const mono = Space_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '700']
})

export const metadata: Metadata = {
  title: 'DukanAI — Smart Store Optimizer',
  description: 'ML-powered retail placement optimizer for your store',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
