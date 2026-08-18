'use client'

import { RecordsBoard } from '@/components/widgets/RecordsBoard'

export default function RecordsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">שיאים ואלופים 🏆</h1>
      <RecordsBoard />
    </div>
  )
}