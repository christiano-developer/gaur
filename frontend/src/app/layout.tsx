import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GAUR - Goa Police Cyber Patrolling System',
  description: 'Enhanced Police Cyber Patrolling System with RBAC for Goa Police',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-slate-50`}>
        <div className="goa-tricolor-accent"></div>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
