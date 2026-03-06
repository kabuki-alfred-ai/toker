import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MultiUrlSubmitWrapper } from '@/components/features/transcriptions/multi-url-submit-wrapper'
import { PlatformIcon, detectPlatform } from '@/components/ui/platform-icon'

type TxStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

interface TxItem {
  id: string
  status: TxStatus
  videoUrl: string
  title: string | null
  duration: number | null
  createdAt: string
  errorMsg: string | null
}

interface TranscriptionsData {
  items: TxItem[]
  total: number
  page: number
}

const STATUS_COLORS: Record<TxStatus, string> = {
  PENDING: '#8B8B8B', PROCESSING: '#5E6AD2', COMPLETED: '#22C55E', FAILED: '#EF4444',
}
const STATUS_LABELS: Record<TxStatus, string> = {
  PENDING: 'En attente', PROCESSING: 'En cours', COMPLETED: 'Terminé', FAILED: 'Échoué',
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m${s.toString().padStart(2, '0')}s` : `${s}s`
}

function shortUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace('www.', '') + u.pathname.slice(0, 32) + (u.pathname.length > 32 ? '…' : '')
  } catch { return url.slice(0, 42) }
}

async function fetchPageData(page: number): Promise<{ balance: number; transcriptions: TranscriptionsData }> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) redirect('/login')
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001'
  const headers = { Cookie: `access_token=${token}` }
  const [userRes, txRes] = await Promise.all([
    fetch(`${backendUrl}/api/v1/users/me`, { headers, cache: 'no-store' }),
    fetch(`${backendUrl}/api/v1/transcriptions?page=${page}`, { headers, cache: 'no-store' }),
  ])
  if (!userRes.ok || !txRes.ok) redirect('/login')
  const [user, transcriptions] = await Promise.all([userRes.json(), txRes.json()])
  return { balance: user.credits.balance, transcriptions }
}

export default async function TranscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>
}) {
  const sp = await searchParams
  const tab = sp.tab === 'history' ? 'history' : 'form'
  const page = sp.page ? parseInt(sp.page, 10) : 1
  const { balance, transcriptions } = await fetchPageData(page)

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, color: '#F2F2F2', marginBottom: 20 }}>
        Transcriptions
      </h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 28, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 0 }}>
        <TabLink href="/transcriptions?tab=form" active={tab === 'form'}>
          Nouvelle transcription
        </TabLink>
        <TabLink href="/transcriptions?tab=history" active={tab === 'history'}>
          Historique
          {transcriptions.total > 0 && (
            <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: tab === 'history' ? '#5E6AD2' : '#555', background: tab === 'history' ? 'rgba(94,106,210,0.15)' : 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 10 }}>
              {transcriptions.total}
            </span>
          )}
        </TabLink>
      </div>

      {/* Tab content */}
      {tab === 'form' ? (
        <MultiUrlSubmitWrapper credits={balance} />
      ) : (
        <HistoryTab transcriptions={transcriptions} page={page} />
      )}
    </div>
  )
}

// ─── Tab components ────────────────────────────────────────────────────────────

function TabLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 16px',
        fontSize: 14,
        fontWeight: active ? 500 : 400,
        color: active ? '#F2F2F2' : '#8B8B8B',
        textDecoration: 'none',
        borderBottom: active ? '2px solid #5E6AD2' : '2px solid transparent',
        marginBottom: -1,
        transition: 'color 0.15s',
      }}
    >
      {children}
    </Link>
  )
}

function HistoryTab({ transcriptions, page }: { transcriptions: TranscriptionsData; page: number }) {
  if (transcriptions.items.length === 0) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center' }}>
        <p style={{ color: '#8B8B8B', fontSize: 14, margin: '0 0 16px' }}>Aucune transcription pour le moment.</p>
        <Link href="/transcriptions?tab=form" style={{ display: 'inline-block', padding: '8px 18px', borderRadius: 6, background: '#5E6AD2', color: '#fff', fontSize: 13, textDecoration: 'none', fontWeight: 500 }}>
          Commencer
        </Link>
      </div>
    )
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {transcriptions.items.map((tx) => {
          const platform = detectPlatform(tx.videoUrl)
          return (
            <Link
              key={tx.id}
              href={`/transcriptions/${tx.id}`}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 8, background: '#111111', border: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none' }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLORS[tx.status], padding: '2px 8px', borderRadius: 4, background: `${STATUS_COLORS[tx.status]}15`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {STATUS_LABELS[tx.status]}
              </span>
              <PlatformIcon platform={platform} />
              <span style={{ flex: 1, fontSize: 13, color: '#C4C4C4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tx.title ?? shortUrl(tx.videoUrl)}
              </span>
              {tx.duration != null && (
                <span style={{ fontSize: 11, color: '#666', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {formatDuration(tx.duration)}
                </span>
              )}
              <span style={{ fontSize: 11, color: '#555', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {new Date(tx.createdAt).toLocaleDateString('fr-FR')}
              </span>
            </Link>
          )
        })}
      </div>

      {transcriptions.total > 20 && (
        <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
          {page > 1 && (
            <Link href={`/transcriptions?tab=history&page=${page - 1}`} style={{ padding: '6px 14px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#8B8B8B', fontSize: 13, textDecoration: 'none' }}>
              ← Précédent
            </Link>
          )}
          {page * 20 < transcriptions.total && (
            <Link href={`/transcriptions?tab=history&page=${page + 1}`} style={{ padding: '6px 14px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#8B8B8B', fontSize: 13, textDecoration: 'none' }}>
              Suivant →
            </Link>
          )}
        </div>
      )}
    </>
  )
}
