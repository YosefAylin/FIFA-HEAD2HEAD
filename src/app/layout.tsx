import type { Metadata, Viewport } from 'next'
import '../globals.css'
import { Header } from '@/components/layout/Header'
import { RosterSettingsProvider } from '@/lib/supabase/useRosterSettings'
import { TournamentDataProvider } from '@/lib/supabase/useTournamentData'

export const metadata: Metadata = {
  title: 'קובה של שבת',
  description: 'מעקב טורניר פתוח לחברים — משחקים, טבלה וסטטיסטיקות',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'קובה של שבת' },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
  ],
  width: 'device-width',
  initialScale: 1,
}

// Applied synchronously before first paint to avoid a flash of the wrong theme.
const themeScript =
  "(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})()"

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" className="dark" suppressHydrationWarning>
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col">
          <Header />
          <main className="flex-1 px-4 py-4">
            <RosterSettingsProvider>
              <TournamentDataProvider>{children}</TournamentDataProvider>
            </RosterSettingsProvider>
          </main>
          <footer className="px-4 pb-6 text-center text-xs text-muted-foreground">
            קובה של שבת ⚽ — טורניר חברים
          </footer>
        </div>
      </body>
    </html>
  )
}
