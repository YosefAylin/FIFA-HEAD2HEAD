import { avatarUrlFor } from '@/lib/utils/avatarHelpers'

interface AvatarProps {
  name: string
  src?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const sizes = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-9 w-9 text-sm',
  md: 'h-11 w-11 text-[15px]',
  lg: 'h-16 w-16 text-xl',
  xl: 'h-24 w-24 text-3xl',
}

/** Circular avatar: uploaded photo or the club's emoji/initials fallback. */
export function Avatar({ name, src, size = 'md' }: AvatarProps) {
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-full bg-raised ${sizes[size]}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={avatarUrlFor({ name, profile_picture_url: src ?? null })}
        alt={name}
        className="h-full w-full object-cover"
        draggable={false}
      />
    </div>
  )
}