import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

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
  { href: '/admin', label: 'Stats' },
  { href: '/admin/users', label: 'Utilisateurs' },
  { href: '/admin/jobs', label: 'Jobs' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await fetchUser()
  if (!user || user.role !== 'ADMIN') redirect('/dashboard')

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0A0A0A' }}>
      <aside style={{ width: 200, background: '#111111', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '24px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#5E6AD2' }}>ADMIN</span>
          <p style={{ fontSize: 11, color: '#555', margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
        </div>
        <nav style={{ padding: '12px' }}>
          {NAV.map(({ href, label }) => (
            <Link key={href} href={href} style={{ display: 'block', padding: '7px 10px', borderRadius: 5, fontSize: 13, color: '#C4C4C4', textDecoration: 'none', marginBottom: 2 }}>
              {label}
            </Link>
          ))}
          <Link href="/dashboard" style={{ display: 'block', padding: '7px 10px', borderRadius: 5, fontSize: 13, color: '#555', textDecoration: 'none', marginTop: 12 }}>
            ← Dashboard
          </Link>
        </nav>
      </aside>
      <main style={{ flex: 1, padding: 32, color: '#F2F2F2' }}>{children}</main>
    </div>
  )
}
