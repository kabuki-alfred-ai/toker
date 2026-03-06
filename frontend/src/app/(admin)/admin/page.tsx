import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

interface Stats {
  transcriptionsToday: number
  transcriptionsTotal: number
  newUsersThisWeek: number
  creditsConsumedToday: number
}

async function fetchStats(): Promise<Stats | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) return null
  const res = await fetch(`${process.env.BACKEND_URL || 'http://localhost:3001'}/api/v1/admin/stats`, {
    headers: { Cookie: `access_token=${token}` },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ padding: '20px 24px', borderRadius: 10, background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p style={{ color: '#8B8B8B', fontSize: 12, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      <p style={{ color: '#F2F2F2', fontSize: 32, fontWeight: 700, margin: 0, lineHeight: 1 }}>{value}</p>
    </div>
  )
}

export default async function AdminPage() {
  const stats = await fetchStats()
  if (!stats) redirect('/dashboard')

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 600, color: '#F2F2F2', marginBottom: 24 }}>Dashboard Admin</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, maxWidth: 600 }}>
        <StatCard label="Transcriptions aujourd'hui" value={stats.transcriptionsToday} />
        <StatCard label="Transcriptions total" value={stats.transcriptionsTotal} />
        <StatCard label="Nouveaux inscrits (7j)" value={stats.newUsersThisWeek} />
        <StatCard label="Crédits consommés (aujourd'hui)" value={stats.creditsConsumedToday} />
      </div>
    </div>
  )
}
