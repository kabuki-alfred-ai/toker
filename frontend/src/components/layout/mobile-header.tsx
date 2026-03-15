'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogOut, UserCircle, ShieldCheck, Wallet } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { cn } from '@/lib/utils'

interface MobileHeaderProps {
  balance: number
  email: string
  firstName?: string | null
  lastName?: string | null
  isAdmin?: boolean
}

function getInitials(firstName?: string | null, lastName?: string | null, email?: string): string {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase()
  if (firstName) return firstName[0].toUpperCase()
  if (email && email.length > 0) return email[0].toUpperCase()
  return '?'
}

export function MobileHeader({ balance, email, firstName, lastName, isAdmin }: MobileHeaderProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  return (
    <div className="flex items-center justify-between relative z-50">
      <Logo variant="full" className="scale-90 origin-left" />
      
      <div className="flex items-center gap-2">
        {isAdmin && (
          <Link
            href="/admin"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            title="Panneau Admin"
          >
            <ShieldCheck size={16} />
          </Link>
        )}
        
        {/* Credits Badge Link */}
        <Link 
          href="/credits"
          className="flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 transition-colors px-3 py-1.5 rounded-full text-[13px] text-primary font-bold no-underline"
        >
          <Wallet size={14} />
          <span>{balance} crédits</span>
        </Link>
        
        {/* Profile Dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors cursor-pointer text-sm font-black tracking-tighter",
              open ? "bg-primary/30 border-primary/40 text-primary" : "bg-primary/20 border-primary/20 text-primary hover:bg-primary/30"
            )}
          >
            {initials}
          </button>

          {open && (
            <div className="absolute top-[calc(100%+8px)] right-0 w-56 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-0.5">Compte</p>
                <p className="text-[12px] text-foreground font-medium truncate">{email}</p>
              </div>

              <div className="py-1">
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-[13px] text-primary font-bold no-underline hover:bg-primary/10 transition-colors"
                  >
                    <ShieldCheck size={16} />
                    Panneau Admin
                  </Link>
                )}
                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-[13px] text-foreground font-medium no-underline hover:bg-accent/20 transition-colors"
                >
                  <UserCircle size={16} className="text-muted-foreground" />
                  Mon profil
                </Link>
              </div>

              <div className="border-t border-border py-1">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-[13px] text-destructive font-bold bg-transparent border-none cursor-pointer text-left hover:bg-destructive/10 transition-colors"
                >
                  <LogOut size={16} />
                  Se déconnecter
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
