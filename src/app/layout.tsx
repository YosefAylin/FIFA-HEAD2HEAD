import type { Metadata, Viewport } from 'next'
import { Rubik } from 'next/font/google'
import { JetBrains_Mono } from 'next/font/google'
import '../globals.css'
import { Header } from '@/components/nav/Header'
import { TabBar } from '@/components/nav/TabBar'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
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
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#080b0d' },
    { media: '(prefers-color-scheme: light)', color: '#f6f1e6' },
  ],
  width: 'device-width',
  initialScale: 1,
}

// Applied synchronously before first paint to avoid a flash of the wrong theme.
const themeScript =
  "(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})()"

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" className={`${rubik.variable} ${jetbrains.variable} dark`} suppressHydrationWarning>
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <RosterSettingsProvider>
          <TournamentDataProvider>
            <div className="mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col">
              <Header />
              <main className="flex-1 px-4 pt-4 pb-20 sm:px-6 md:pb-10 md:pt-6">
                {/* Light/dark toggle, top-left of the page (off the nav bars).
                    RTL: justify-end pushes the single toggle to the left. */}
                <div className="mb-3 flex items-center justify-end">
                  <ThemeToggle className="h-9 w-9 md:h-8 md:w-8" />
                </div>
                {children}
              </main>
              <div className="hidden pb-10 text-center text-[11px] text-muted-foreground md:block">
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