'use client'

import { RecordsBoard } from '@/components/widgets/RecordsBoard'

export default function RecordsPage() {
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight text-ink">שיאים ואלופים</h1>
        <p className="text-sm text-ink-mid">ארון הגביעים של הקובה — מי הכי גדול, מי הכי לוהט, ומי בשפל.</p>
      </header>
      <RecordsBoard />
    </div>
  )
}