import { Trophy } from 'lucide-react'
import { RecordsBoard } from '@/components/widgets/RecordsBoard'
import { PageHeader } from '@/components/ui/PageHeader'

export default function RecordsPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Trophy className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold leading-tight">שיאים ואלופים</h1>
              <p className="text-xs text-muted-foreground">ארון הגביעים של הקובה</p>
            </div>
          </div>
        }
      />
      <RecordsBoard />
    </div>
  )
}
