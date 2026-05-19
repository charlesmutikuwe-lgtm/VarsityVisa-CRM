// app/layout.tsx
import type { Metadata } from 'next'
import { Sora, DM_Mono } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Varsity Visa CRM',
  description: 'Student pipeline & lead management for Varsity Visa',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${dmMono.variable}`}>
      <body className="bg-[#0a0a0f] text-white antialiased">
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1a2e',
              color: '#e2e8f0',
              border: '1px solid rgba(255,255,255,0.08)',
              fontFamily: 'var(--font-sora)',
            },
          }}
        />
        {children}
      </body>
    </html>
  )
}
