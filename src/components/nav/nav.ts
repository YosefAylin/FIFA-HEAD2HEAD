'use client'

/** Single source of truth for navigation, used by the desktop header and the
 *  mobile bottom tab bar. Order = usage priority. */

export interface NavItem {
  href: string
  label: string
  /** Exact match (no prefix). Falls back to prefix `startsWith` otherwise. */
  exact?: boolean
}

/** Primary destinations — surfaced as mobile bottom tabs. */
export const TABS: NavItem[] = [
  { href: '/', label: 'בית', exact: true },
  { href: '/tournament', label: 'טורניר', exact: true },
  { href: '/standings', label: 'טבלה' },
  { href: '/survey', label: 'וויסקי', exact: true },
  { href: '/chat', label: 'צ׳אט', exact: true },
]

/** Secondary — reachable from the "עוד" sheet on mobile, top nav on desktop. */
export const MORE: NavItem[] = [
  { href: '/history', label: 'היסטוריה' },
  { href: '/records', label: 'שיאים' },
  { href: '/admin/import', label: 'העלאה', exact: true },
]

/** Full desktop top-bar nav, single line. */
export const TOP_NAV: NavItem[] = [
  ...TABS.slice(0, 3), // בית / טורניר / טבלה
  ...MORE, // היסטוריה / שיאים
  TABS[3], // וויסקי
  TABS[4], // צ׳אט
]