import { avatarUrlFor } from '@/lib/utils/avatarHelpers'

interface AvatarProps {
  name: string
  src?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizes = {
  sm: 'h-9 w-9 text-sm',
  md: 'h-12 w-12 text-base',
  lg: 'h-16 w-16 text-xl',
  xl: 'h-24 w-24 text-3xl',
}

/** Intrinsic pixel size per variant, so the browser reserves space (no CLS). */
const px = { sm: 36, md: 48, lg: 64, xl: 96 } as const

/** Circular avatar: uploaded photo or initials fallback. */
export function Avatar({ name, src, size = 'md' }: AvatarProps) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full bg-surface ring-1 ring-border shadow-sm ${sizes[size]}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={avatarUrlFor({ name, profile_picture_url: src ?? null })}
        alt={name}
        width={px[size]}
        height={px[size]}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
        draggable={false}
      />
    </div>
  )
}
