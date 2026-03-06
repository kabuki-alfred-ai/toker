'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, FileText, LogOut, Video, UserCircle, Search } from 'lucide-react'
import { CreditsBadge } from '@/components/features/credits/credits-badge'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transcriptions', label: 'Transcriptions', icon: FileText },
  { href: '/source-finder', label: 'Source Finder', icon: Search },
]

interface SidebarProps {
  balance: number
  email: string
  firstName?: string | null
  lastName?: string | null
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

export function Sidebar({ balance, email, firstName, lastName }: SidebarProps) {
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
      style={{
        width: 220,
        height: '100vh',
        position: 'sticky',
        top: 0,
        background: '#111111',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '0 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Video size={18} color="#5E6AD2" />
        <span style={{ fontSize: 16, fontWeight: 700, color: '#F2F2F2', letterSpacing: '-0.02em' }}>
          ViralScript
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px' }}>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: isActive ? 500 : 400,
                color: isActive ? '#F2F2F2' : '#8B8B8B',
                background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                textDecoration: 'none',
                marginBottom: 2,
                transition: 'all 0.15s',
              }}
            >
              <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <CreditsBadge balance={balance} />

        {/* Avatar dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setOpen((o) => !o)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              background: open ? 'rgba(255,255,255,0.05)' : 'transparent',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 8,
              padding: '8px 10px',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
            onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = 'transparent' }}
          >
            {/* Avatar circle */}
            <div style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: 'rgba(94,106,210,0.2)',
              border: '1px solid rgba(94,106,210,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: 12,
              fontWeight: 700,
              color: '#5E6AD2',
              letterSpacing: '0.02em',
            }}>
              {initials}
            </div>
            <span style={{
              flex: 1,
              fontSize: 13,
              color: '#C4C4C4',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign: 'left',
            }}>
              {displayName}
            </span>
          </button>

          {/* Dropdown menu */}
          {open && (
            <div style={{
              position: 'absolute',
              bottom: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              background: '#1A1A1A',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              zIndex: 50,
            }}>
              {/* User info header */}
              <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize: 12, color: '#8B8B8B', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</p>
              </div>

              {/* Profile link */}
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  fontSize: 13,
                  color: '#C4C4C4',
                  textDecoration: 'none',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <UserCircle size={14} />
                Mon profil
              </Link>

              {/* Divider */}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

              {/* Logout */}
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: 13,
                  color: '#EF4444',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.06)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <LogOut size={14} />
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
