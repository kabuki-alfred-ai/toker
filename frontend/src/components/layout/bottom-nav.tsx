'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, Search, Download, Subtitles } from 'lucide-react'
import { cn } from '@/lib/utils'

const PRIMARY_NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transcriptions', label: 'Transcribe', icon: FileText },
  { href: '/source-finder', label: 'Source', icon: Search },
  { href: '/download', label: 'Download', icon: Download },
  { href: '/subtitle-remover', label: 'No Subs', icon: Subtitles },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 h-[calc(60px+env(safe-area-inset-bottom))] bg-card/90 border-t border-border flex items-center justify-around pb-[env(safe-area-inset-bottom)] z-[100] backdrop-blur-lg px-1"
    >
      <div className="flex items-center justify-between w-full">
        {PRIMARY_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 no-underline transition-all duration-200 flex-1 py-1 max-w-[20%]",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className={cn("flex flex-col items-center justify-center p-[4px] rounded-full", isActive ? "bg-primary/10" : "bg-transparent")}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={cn(isActive ? "animate-in zoom-in-75 duration-300" : "")} />
              </div>
              <span className={cn("text-[9px] truncate w-full text-center px-0.5", isActive ? "font-bold" : "font-medium")}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
