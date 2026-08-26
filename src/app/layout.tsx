import type { Metadata, Viewport } from 'next'
import { Rubik } from 'next/font/google'
import { JetBrains_Mono } from 'next/font/google'
import '../globals.css'
import { Header } from '@/components/nav/Header'
import { TabBar } from '@/components/nav/TabBar'
import { RosterSettingsProvider } from '@/lib/supabase/useRosterSettings'
import { TournamentDataProvider } from '@/lib/supabase/useTournamentData'

const rubik = Rubik({
  subsets: ['hebrew', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-rubik',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-mono-jb',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'קובה של שבת',
  description: 'מועדון הכדורגל של החברים — משחקים, טבלה, שיאים וטרפת הוויסקי',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'קובה של שבת' },
}

export const viewport: Viewport = {
  themeColor: '#080b0d',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" className={`${rubik.variable} ${jetbrains.variable}`}>
      <body className="antialiased">
        <RosterSettingsProvider>
          <TournamentDataProvider>
            <div className="mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col">
              <Header />
              <main className="flex-1 px-4 pb-24 pt-4 sm:px-6 md:pb-10 md:pt-6">
                {children}
              </main>
              <div className="hidden pb-10 text-center text-[11px] text-ink-mid md:block">
                קובה של שבת · מועדון חברים
              </div>
            </div>
            <TabBar />
          </TournamentDataProvider>
        </RosterSettingsProvider>
      </body>
    </html>
  )
}