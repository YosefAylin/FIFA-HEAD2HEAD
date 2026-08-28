'use client'

import { Trophy } from 'lucide-react'
import { RecordsBoard } from '@/components/widgets/RecordsBoard'
import { PageHeader } from '@/components/ui/PageHeader'

export default function RecordsPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Trophy className="h-5 w-5 text-primary" />
            שיאים ואלופים
          </h1>
        }
      />
      <RecordsBoard />
    </div>
  )
}