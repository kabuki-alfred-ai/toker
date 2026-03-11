'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, Search, UserCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transcriptions', label: 'Transcribe', icon: FileText },
  { href: '/source-finder', label: 'Source', icon: Search },
  { href: '/profile', label: 'Profil', icon: UserCircle },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 h-[calc(64px+env(safe-area-inset-bottom))] bg-card/80 border-t border-border flex items-center justify-around pb-[env(safe-area-inset-bottom)] z-[100] backdrop-blur-lg"
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-1 no-underline transition-all duration-200 flex-1 py-2",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={cn(isActive ? "animate-in zoom-in-75 duration-300" : "")} />
            <span className={cn("text-[10px]", isActive ? "font-bold" : "font-medium")}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
