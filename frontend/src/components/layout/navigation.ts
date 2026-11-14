import { ChartNoAxesColumn, Rocket, Settings, Trophy, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  shortLabel: string
  icon: LucideIcon
  /** Path prefixes that also count as this section, e.g. Sutra pages belong to Explore. */
  matches: string[]
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/explore', label: 'Explore Sutras', shortLabel: 'Explore', icon: Rocket, matches: ['/explore', '/sutras'] },
  { to: '/play', label: 'Play to Win', shortLabel: 'Play', icon: Trophy, matches: ['/play'] },
  { to: '/progress', label: 'My Progress', shortLabel: 'Progress', icon: ChartNoAxesColumn, matches: ['/progress'] },
  { to: '/settings', label: 'Settings', shortLabel: 'Settings', icon: Settings, matches: ['/settings'] },
]

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  return item.matches.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}
