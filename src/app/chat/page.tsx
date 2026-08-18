'use client'

import { GroupChat } from '@/components/widgets/GroupChat'

export default function ChatPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">צ׳אט הקבוצה 💬</h1>
      <p className="text-sm text-muted-foreground">
        במה פתוחה לכולם — בלי מסננים, בלי מחשבות. רק הוויסקי והעקיצות.
      </p>
      <GroupChat />
    </div>
  )
}