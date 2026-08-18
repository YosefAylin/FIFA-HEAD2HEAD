import type { Metadata, Viewport } from 'next'
import '../globals.css'
import { Header } from '@/components/layout/Header'

export const metadata: Metadata = {
  title: 'קובה של שבת',
  description: 'מעקב טורניר פתוח לחברים — משחקים, טבלה וסטטיסטיקות',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'קובה של שבת' },
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl">
      <body className="antialiased">
        <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col">
          <Header />
          <main className="flex-1 px-4 py-4">{children}</main>
          <footer className="px-4 pb-6 text-center text-xs text-muted-foreground">
            קובה של שבת ⚽ — טורניר חברים
          </footer>
        </div>
      </body>
    </html>
  )
}
