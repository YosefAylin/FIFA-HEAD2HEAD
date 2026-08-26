'use client'

import { GroupChat } from '@/components/widgets/GroupChat'

export default function ChatPage() {
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight text-ink">צ׳אט הקבוצה</h1>
        <p className="text-sm text-ink-mid">
          במה פתוחה לכולם — בלי מסננים, בלי מחשבות. רק הוויסקי והעקיצות.
        </p>
      </header>
      <GroupChat />
    </div>
  )
}