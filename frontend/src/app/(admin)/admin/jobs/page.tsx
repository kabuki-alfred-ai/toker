import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

interface JobRow { id: string; status: JobStatus; videoUrl: string; errorMsg: string | null; createdAt: string; updatedAt: string; userEmail: string }
interface JobsResponse { items: JobRow[]; total: number; page: number }

const STATUS_COLORS: Record<JobStatus, string> = {
  PENDING: '#8B8B8B', PROCESSING: '#5E6AD2', COMPLETED: '#22C55E', FAILED: '#EF4444',
}

async function fetchJobs(page: number, status: string): Promise<JobsResponse | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) return null
  const params = new URLSearchParams({ page: String(page), ...(status ? { status } : {}) })
  const res = await fetch(`${process.env.BACKEND_URL || 'http://localhost:3001'}/api/v1/admin/jobs?${params}`, {
    headers: { Cookie: `access_token=${token}` },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

export default async function AdminJobsPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string }> }) {
  const sp = await searchParams
  const page = sp.page ? parseInt(sp.page, 10) : 1
  const status = sp.status ?? ''
  const data = await fetchJobs(page, status)
  if (!data) redirect('/dashboard')

  const STATUSES = ['', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 600, color: '#F2F2F2', marginBottom: 20 }}>Jobs</h1>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {STATUSES.map((s) => (
          <Link key={s} href={`/admin/jobs${s ? `?status=${s}` : ''}`}
            style={{ padding: '4px 12px', borderRadius: 5, fontSize: 12, textDecoration: 'none', fontWeight: 500, background: status === s ? '#5E6AD2' : 'rgba(255,255,255,0.05)', color: status === s ? '#fff' : '#8B8B8B', border: '1px solid rgba(255,255,255,0.06)' }}>
            {s || 'Tous'}
          </Link>
        ))}
      </div>

      <div style={{ fontSize: 12, color: '#555', marginBottom: 12 }}>{data.total} jobs</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {data.items.map((job) => (
          <div key={job.id} style={{ padding: '12px 16px', borderRadius: 8, background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLORS[job.status], padding: '2px 8px', borderRadius: 4, background: `${STATUS_COLORS[job.status]}15`, whiteSpace: 'nowrap' }}>
                {job.status}
              </span>
              <span style={{ fontSize: 13, color: '#C4C4C4', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.videoUrl}</span>
              <span style={{ fontSize: 11, color: '#555', whiteSpace: 'nowrap' }}>{job.userEmail}</span>
              <span style={{ fontSize: 11, color: '#555', whiteSpace: 'nowrap' }}>{new Date(job.createdAt).toLocaleDateString('fr-FR')}</span>
            </div>
            {job.errorMsg && (
              <p style={{ margin: '8px 0 0', fontSize: 11, color: '#EF4444', fontFamily: 'monospace' }}>{job.errorMsg}</p>
            )}
          </div>
        ))}
      </div>

      {data.total > 20 && (
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          {page > 1 && <Link href={`/admin/jobs?page=${page - 1}&status=${status}`} style={{ padding: '5px 12px', borderRadius: 5, border: '1px solid rgba(255,255,255,0.08)', color: '#8B8B8B', fontSize: 12, textDecoration: 'none' }}>← Précédent</Link>}
          {page * 20 < data.total && <Link href={`/admin/jobs?page=${page + 1}&status=${status}`} style={{ padding: '5px 12px', borderRadius: 5, border: '1px solid rgba(255,255,255,0.08)', color: '#8B8B8B', fontSize: 12, textDecoration: 'none' }}>Suivant →</Link>}
        </div>
      )}
    </div>
  )
}
