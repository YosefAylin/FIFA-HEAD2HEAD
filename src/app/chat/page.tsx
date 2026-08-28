'use client'

import { MessageCircle } from 'lucide-react'
import { GroupChat } from '@/components/widgets/GroupChat'
import { PageHeader } from '@/components/ui/PageHeader'

export default function ChatPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <MessageCircle className="h-5 w-5 text-primary" />
            צ׳אט הקבוצה
          </h1>
        }
      />
      <p className="text-sm text-muted-foreground">
        במה פתוחה לכולם — בלי מסננים, בלי מחשבות. רק הוויסקי והעקיצות.
      </p>
      <GroupChat />
    </div>
  )
}