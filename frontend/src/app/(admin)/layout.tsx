import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck, BarChart2, Users, Briefcase, ArrowLeftRight } from 'lucide-react'
import { Logo } from '@/components/ui/logo'

async function fetchUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) return null
  const res = await fetch(`${process.env.BACKEND_URL || 'http://localhost:3001'}/api/v1/users/me`, {
    headers: { Cookie: `access_token=${token}` },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json() as Promise<{ role: string; email: string }>
}

const NAV = [
  { href: '/admin', label: 'Stats', icon: BarChart2 },
  { href: '/admin/users', label: 'Utilisateurs', icon: Users },
  { href: '/admin/jobs', label: 'Jobs', icon: Briefcase },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await fetchUser()
  if (!user || user.role !== 'ADMIN') redirect('/dashboard')

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:flex flex-col w-[220px] h-screen sticky top-0 bg-sidebar border-r border-sidebar-border py-6 overflow-hidden shrink-0">
        {/* Logo */}
        <div className="px-5 pb-4 mb-2 border-b border-sidebar-border">
          <Logo variant="full" />
        </div>

        {/* Admin badge */}
        <div className="px-5 py-2 mb-1">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
            <ShieldCheck size={12} /> Admin
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent/10 transition-colors no-underline"
            >
              <Icon size={16} className="text-muted-foreground/60" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Footer — switch back to user app */}
        <div className="px-4 pt-3 border-t border-sidebar-border">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-semibold text-primary bg-primary/8 hover:bg-primary/15 transition-colors no-underline"
          >
            <ArrowLeftRight size={14} />
            <span className="flex-1">App utilisateur</span>
          </Link>
          <p className="text-[11px] text-muted-foreground truncate mt-2 px-1">{user.email}</p>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-8 text-foreground overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}
