'use client'

import { useEffect, useMemo, useState } from 'react'
import { BellOff, CheckCircle2, Lock, Pencil, ShieldCheck, Trash2, UserPlus } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { AddPlayerForm } from '@/components/forms/AddPlayerForm'
import { UploadButton } from '@/components/widgets/UploadButton'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import {
  deletePlayerCompletely,
  updatePlayerActive,
  updatePlayerGuest,
  updatePlayerName,
} from '@/lib/supabase/players'
import { groupPlayersByStatus } from '@/lib/utils/playerHelpers'
import { isAdminPasscode } from '@/lib/utils/entryGate'
import type { Player } from '@/lib/types/database'

const ADMIN_KEY = 'kuba-admin-ok'

function PasscodeGate({ onUnlocked }: { onUnlocked: () => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  function submit() {
    if (!isAdminPasscode(value)) {
      setError(true)
      return
    }
    try {
      localStorage.setItem(ADMIN_KEY, '1')
    } catch {
      /* ignore */
    }
    onUnlocked()
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Lock className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold leading-tight">ניהול שחקנים</h1>
              <p className="text-xs text-muted-foreground">אזור אדמין — נדרש קוד</p>
            </div>
          </div>
        }
      />
      <div className="mx-auto w-full max-w-sm rounded-3xl border border-border bg-surface p-6">
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
          }}
          placeholder="קוד אדמין"
          className="h-12 w-full rounded-xl border border-input bg-background px-3 text-center text-base tracking-widest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {error && <p className="mt-2 text-center text-sm text-destructive">קוד שגוי</p>}
        <Button className="mt-4 w-full" size="lg" onClick={submit}>
          <ShieldCheck className="h-4 w-4" /> כניסה
        </Button>
      </div>
    </div>
  )
}

function PlayerRow({
  player,
  onChanged,
  onRequestDelete,
}: {
  player: Player
  onChanged: () => void
  onRequestDelete: (player: Player) => void
}) {
  const [name, setName] = useState(player.name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => setName(player.name), [player.name])

  const dirty = name.trim() !== player.name && name.trim().length > 0
  const inactive = player.is_active === false
  const guest = player.is_guest === true

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await fn()
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3 ${inactive ? 'opacity-80' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <Avatar name={player.name} src={player.profile_picture_url} size="md" />
          <UploadButton playerId={player.id} onUploaded={onChanged} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              className="min-w-0 flex-1 rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {dirty && (
              <Button size="sm" disabled={busy} onClick={() => void run(() => updatePlayerName(player.id, name))}>
                שמור
              </Button>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className={`rounded-full px-2 py-0.5 font-medium ${inactive ? 'bg-muted text-muted-foreground' : 'bg-success/15 text-success'}`}>
              {inactive ? 'לא פעיל' : 'פעיל'}
            </span>
            {guest && <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">אורח</span>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void run(() => updatePlayerActive(player.id, inactive))}
        >
          {inactive ? (<><CheckCircle2 className="h-3.5 w-3.5" /> החזר לפעילות</>) : (<><BellOff className="h-3.5 w-3.5" /> השבת</>)}
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(() => updatePlayerGuest(player.id, !guest))}>
          {guest ? 'הפוך לקבוע' : 'סמן כאורח'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-destructive/40 text-destructive hover:bg-destructive/10"
          disabled={busy}
          onClick={() => onRequestDelete(player)}
        >
          <Trash2 className="h-3.5 w-3.5" /> מחק
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export default function ManagePlayersPage() {
  const { players, loading, reload } = useTournamentData()
  const [adminOk, setAdminOk] = useState(false)
  const [ready, setReady] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Player | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    try {
      setAdminOk(localStorage.getItem(ADMIN_KEY) === '1')
    } catch {
      setAdminOk(false)
    }
    setReady(true)
  }, [])

  const groups = useMemo(() => groupPlayersByStatus(players), [players])

  if (!ready) return <p className="py-10 text-center text-muted-foreground">טוען…</p>
  if (!adminOk) return <PasscodeGate onUnlocked={() => setAdminOk(true)} />

  const sections = [
    { key: 'active', label: 'פעילים', list: groups.active },
    { key: 'inactive', label: 'לא פעילים', list: groups.inactive },
    { key: 'guests', label: 'אורחים', list: groups.guests },
  ].filter((s) => s.list.length > 0)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Pencil className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold leading-tight">ניהול שחקנים</h1>
              <p className="text-xs text-muted-foreground">הוספה, עריכה, פעיל/אורח ומחיקה</p>
            </div>
          </div>
        }
      />

      <Button className="w-full" onClick={() => setAddOpen(true)}>
        <UserPlus className="h-4 w-4" /> הוספת שחקן
      </Button>

      {loading && players.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">טוען…</p>
      ) : (
        sections.map((section) => (
          <section key={section.key} className="flex flex-col gap-2">
            <h2 className="px-1 text-sm font-bold text-muted-foreground">
              {section.label} <span className="font-normal">({section.list.length})</span>
            </h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {section.list.map((p) => (
                <PlayerRow
                  key={p.id}
                  player={p}
                  onChanged={() => void reload()}
                  onRequestDelete={(target) => {
                    setDeleteError('')
                    setDeleteTarget(target)
                  }}
                />
              ))}
            </div>
          </section>
        ))
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="הוספת שחקן">
        <AddPlayerForm
          onAdded={() => {
            setAddOpen(false)
            void reload()
          }}
        />
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={deleteTarget ? `מחיקת ${deleteTarget.name}` : ''}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            זה ימחק את <b className="text-foreground">{deleteTarget?.name}</b> <b>ואת כל המשחקים שלו</b> מההיסטוריה
            המשותפת, לצמיתות. בטוח?
          </p>
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              ביטול
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => {
                if (!deleteTarget) return
                setDeleting(true)
                setDeleteError('')
                void deletePlayerCompletely(deleteTarget.id)
                  .then(() => {
                    setDeleteTarget(null)
                    return reload()
                  })
                  .catch((e) => setDeleteError(e instanceof Error ? e.message : 'המחיקה נכשלה'))
                  .finally(() => setDeleting(false))
              }}
            >
              {deleting ? 'מוחק…' : 'מחק לצמיתות'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
