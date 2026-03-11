export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

interface UserRow { id: string; email: string; role: string; createdAt: string; balance: number; transcriptionsCount: number }
interface UsersResponse { items: UserRow[]; total: number; page: number }

async function fetchUsers(page: number, search: string): Promise<UsersResponse | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) return null
  const params = new URLSearchParams({ page: String(page), ...(search ? { search } : {}) })
  const res = await fetch(`${process.env.BACKEND_URL || 'http://localhost:3001'}/api/v1/admin/users?${params}`, {
    headers: { Cookie: `access_token=${token}` },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string }> }) {
  const sp = await searchParams
  const page = sp.page ? parseInt(sp.page, 10) : 1
  const search = sp.search ?? ''
  const data = await fetchUsers(page, search)
  if (!data) redirect('/dashboard')

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 600, color: '#F2F2F2', marginBottom: 20 }}>Utilisateurs</h1>

      {/* Search */}
      <form style={{ marginBottom: 16 }}>
        <input
          name="search"
          defaultValue={search}
          placeholder="Filtrer par email…"
          style={{ padding: '8px 12px', borderRadius: 6, background: '#111111', border: '1px solid rgba(255,255,255,0.08)', color: '#F2F2F2', fontSize: 13, width: 280 }}
        />
      </form>

      <div style={{ fontSize: 12, color: '#555', marginBottom: 12 }}>{data.total} utilisateurs</div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {['Email', 'Rôle', 'Inscription', 'Crédits', 'Transcriptions'].map((h) => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#8B8B8B', fontWeight: 500 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.items.map((u) => (
            <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <td style={{ padding: '10px 12px', color: '#C4C4C4' }}>{u.email}</td>
              <td style={{ padding: '10px 12px', color: u.role === 'ADMIN' ? '#5E6AD2' : '#8B8B8B' }}>{u.role}</td>
              <td style={{ padding: '10px 12px', color: '#8B8B8B' }}>{new Date(u.createdAt).toLocaleDateString('fr-FR')}</td>
              <td style={{ padding: '10px 12px', color: u.balance === 0 ? '#EF4444' : u.balance <= 2 ? '#F59E0B' : '#22C55E', fontWeight: 600 }}>{u.balance}</td>
              <td style={{ padding: '10px 12px', color: '#8B8B8B' }}>{u.transcriptionsCount}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.total > 20 && (
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          {page > 1 && <Link href={`/admin/users?page=${page - 1}&search=${search}`} style={{ padding: '5px 12px', borderRadius: 5, border: '1px solid rgba(255,255,255,0.08)', color: '#8B8B8B', fontSize: 12, textDecoration: 'none' }}>← Précédent</Link>}
          {page * 20 < data.total && <Link href={`/admin/users?page=${page + 1}&search=${search}`} style={{ padding: '5px 12px', borderRadius: 5, border: '1px solid rgba(255,255,255,0.08)', color: '#8B8B8B', fontSize: 12, textDecoration: 'none' }}>Suivant →</Link>}
        </div>
      )}
    </div>
  )
}
