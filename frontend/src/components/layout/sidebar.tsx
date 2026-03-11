'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, FileText, LogOut, Video, UserCircle, Search, ShieldCheck, ArrowLeftRight } from 'lucide-react'
import { CreditsBadge } from '@/components/features/credits/credits-badge'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/ui/logo'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transcriptions', label: 'Transcriptions', icon: FileText },
  { href: '/source-finder', label: 'Source Finder', icon: Search, beta: true },
]

interface SidebarProps {
  balance: number
  email: string
  firstName?: string | null
  lastName?: string | null
  isAdmin?: boolean
}

function getInitials(firstName?: string | null, lastName?: string | null, email?: string): string {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase()
  if (firstName) return firstName[0].toUpperCase()
  if (email) return email[0].toUpperCase()
  return '?'
}

function getDisplayName(firstName?: string | null, lastName?: string | null, email?: string): string {
  if (firstName || lastName) return `${firstName ?? ''} ${lastName ?? ''}`.trim()
  return email ?? ''
}

export function Sidebar({ balance, email, firstName, lastName, isAdmin }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleLogout() {
    await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' })
    router.push('/login')
  }

  const initials = getInitials(firstName, lastName, email)
  const displayName = getDisplayName(firstName, lastName, email)

  return (
    <aside
      className="hidden md:flex flex-col w-[220px] h-screen sticky top-0 bg-sidebar border-r border-sidebar-border py-6 overflow-hidden shrink-0"
    >
      {/* Logo */}
      <div className="px-5 pb-6 mb-2 border-b border-sidebar-border">
        <Logo variant="full" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon, beta }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 no-underline",
                isActive 
                  ? "font-bold text-foreground bg-accent/20" 
                  : "font-medium text-muted-foreground hover:bg-accent/10 active:scale-95"
              )}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={cn(isActive ? "text-primary" : "text-muted-foreground/60")} />
              <span className="flex-1">{label}</span>
              {beta && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                  Beta
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-sidebar-border space-y-3">
        {/* Admin switcher */}
        {isAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-semibold text-primary bg-primary/8 hover:bg-primary/15 transition-colors no-underline"
          >
            <ShieldCheck size={14} />
            <span className="flex-1">Panneau Admin</span>
            <ArrowLeftRight size={12} className="opacity-60" />
          </Link>
        )}

        <CreditsBadge balance={balance} />

        {/* Avatar dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className={cn(
              "flex items-center gap-3 w-full border rounded-xl p-2 cursor-pointer transition-all duration-200 active:scale-[0.98]",
              open ? "bg-accent/20 border-accent/40 shadow-sm" : "bg-transparent border-sidebar-border hover:bg-accent/10"
            )}
          >
            {/* Avatar circle */}
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center shrink-0 text-xs font-black text-primary tracking-tighter">
              {initials}
            </div>
            <span className="flex-1 text-[13px] text-foreground font-semibold truncate text-left">
              {displayName}
            </span>
          </button>

          {/* Dropdown menu */}
          {open && (
            <div className="absolute bottom-[calc(100%+8px)] left-0 right-0 bg-card border border-border rounded-xl overflow-hidden shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
              {/* User info header */}
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-0.5">Compte</p>
                <p className="text-[12px] text-foreground font-medium truncate">{email}</p>
              </div>

              {/* Profile link */}
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-3 text-[13px] text-foreground font-medium no-underline transition-colors hover:bg-accent/20"
              >
                <UserCircle size={16} className="text-muted-foreground" />
                Mon profil
              </Link>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-4 py-3 text-[13px] text-destructive font-bold bg-transparent border-none cursor-pointer text-left transition-colors hover:bg-destructive/10"
              >
                <LogOut size={16} />
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
