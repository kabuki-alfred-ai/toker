import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, AlertTriangle, Zap, FileText, Calendar, ArrowRight } from 'lucide-react'
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

interface UserData {
  credits: { balance: number }
  email: string
}

interface TranscriptionsData {
  items: TxItem[]
  total: number
  page: number
}

const STATUS_COLORS: Record<TxStatus, string> = {
  PENDING: '#8B8B8B',
  PROCESSING: '#5E6AD2',
  COMPLETED: '#22C55E',
  FAILED: '#EF4444',
}

const STATUS_LABELS: Record<TxStatus, string> = {
  PENDING: 'En attente',
  PROCESSING: 'En cours',
  COMPLETED: 'Terminé',
  FAILED: 'Échoué',
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m${s.toString().padStart(2, '0')}s` : `${s}s`
}

function shortUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace('www.', '') + u.pathname.slice(0, 30) + (u.pathname.length > 30 ? '…' : '')
  } catch {
    return url.slice(0, 40)
  }
}

function getNextMonday(): string {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  // 1 = Monday
  const daysUntilMonday = (1 - tomorrow.getDay() + 7) % 7 || 7
  const nextMonday = new Date(tomorrow)
  nextMonday.setDate(tomorrow.getDate() + (daysUntilMonday === 7 && tomorrow.getDay() === 1 ? 0 : daysUntilMonday))
  // If tomorrow is already Monday, use it
  if (tomorrow.getDay() === 1) {
    return tomorrow.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }
  return nextMonday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

async function fetchDashboardData(): Promise<{ user: UserData; transcriptions: TranscriptionsData }> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) redirect('/login')

  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001'
  const headers = { Cookie: `access_token=${token}` }

  const [userRes, txRes] = await Promise.all([
    fetch(`${backendUrl}/api/v1/users/me`, { headers, cache: 'no-store' }),
    fetch(`${backendUrl}/api/v1/transcriptions?page=1&limit=5`, { headers, cache: 'no-store' }),
  ])

  if (!userRes.ok || !txRes.ok) redirect('/login')

  const [user, transcriptions] = await Promise.all([userRes.json(), txRes.json()])
  return { user, transcriptions }
}

function creditColor(balance: number): string {
  if (balance === 0) return '#EF4444'
  if (balance <= 2) return '#F59E0B'
  return '#22C55E'
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ credits_added?: string }>
}) {
  const [{ user, transcriptions }, sp] = await Promise.all([fetchDashboardData(), searchParams])
  const balance = user.credits.balance
  const creditsAdded = sp.credits_added ? parseInt(sp.credits_added, 10) : null
  const nextMonday = getNextMonday()

  return (
    <div>
      {/* Success banner */}
      {creditsAdded && (
        <div
          style={{
            marginBottom: 20,
            padding: '12px 16px',
            borderRadius: 8,
            background: 'rgba(34,197,94,0.08)',
            border: '1px solid rgba(34,197,94,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <CheckCircle2 size={16} color="#22C55E" />
          <span style={{ color: '#22C55E', fontSize: 14 }}>
            {creditsAdded} crédits ajoutés à votre compte !
          </span>
        </div>
      )}

      {/* Low credits warning */}
      {balance <= 2 && (
        <div
          style={{
            marginBottom: 20,
            padding: '10px 16px',
            borderRadius: 8,
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={16} color="#F59E0B" />
            <span style={{ color: '#F59E0B', fontSize: 13 }}>
              Crédits faibles — rechargez pour continuer
            </span>
          </div>
          <Link
            href="/credits"
            style={{
              padding: '4px 12px',
              borderRadius: 5,
              background: '#5E6AD2',
              color: '#fff',
              fontSize: 12,
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Recharger
          </Link>
        </div>
      )}

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#F2F2F2', margin: 0, marginBottom: 4 }}>
          Dashboard
        </h1>
        <p style={{ fontSize: 13, color: '#8B8B8B', margin: 0 }}>
          Bonjour, {user.email}
        </p>
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}
      >
        {/* Credits card */}
        <div
          style={{
            background: '#111111',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10,
            padding: '20px 24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Zap size={14} color="#8B8B8B" />
            <span style={{ fontSize: 12, color: '#8B8B8B', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Crédits disponibles
            </span>
          </div>
          <span style={{ fontSize: 40, fontWeight: 700, color: creditColor(balance), lineHeight: 1 }}>
            {balance}
          </span>
        </div>

        {/* Total transcriptions card */}
        <div
          style={{
            background: '#111111',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10,
            padding: '20px 24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <FileText size={14} color="#8B8B8B" />
            <span style={{ fontSize: 12, color: '#8B8B8B', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Transcriptions totales
            </span>
          </div>
          <span style={{ fontSize: 40, fontWeight: 700, color: '#F2F2F2', lineHeight: 1 }}>
            {transcriptions.total}
          </span>
        </div>

        {/* Next refill card */}
        <div
          style={{
            background: '#111111',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10,
            padding: '20px 24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Calendar size={14} color="#8B8B8B" />
            <span style={{ fontSize: 12, color: '#8B8B8B', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Prochaine recharge
            </span>
          </div>
          <span style={{ fontSize: 28, fontWeight: 700, color: '#F2F2F2', lineHeight: 1 }}>
            {nextMonday}
          </span>
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#F2F2F2', margin: 0 }}>
            Activité récente
          </h2>
          <Link
            href="/transcriptions"
            style={{ fontSize: 12, color: '#5E6AD2', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            Voir tout <ArrowRight size={12} />
          </Link>
        </div>

        {transcriptions.items.length === 0 ? (
          <div
            style={{
              padding: '32px 0',
              textAlign: 'center',
              background: '#111111',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10,
            }}
          >
            <p style={{ color: '#8B8B8B', fontSize: 13, margin: 0 }}>
              Aucune transcription pour le moment
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {transcriptions.items.map((tx) => {
              const platform = detectPlatform(tx.videoUrl)
              return (
                <Link
                  key={tx.id}
                  href={`/transcriptions/${tx.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: '#111111',
                    border: '1px solid rgba(255,255,255,0.06)',
                    textDecoration: 'none',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: STATUS_COLORS[tx.status],
                      padding: '2px 7px',
                      borderRadius: 4,
                      background: `${STATUS_COLORS[tx.status]}18`,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {STATUS_LABELS[tx.status]}
                  </span>
                  <PlatformIcon platform={platform} />
                  <span
                    style={{
                      flex: 1,
                      fontSize: 13,
                      color: '#C4C4C4',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
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
        )}
      </div>

      {/* CTA */}
      <div style={{ marginTop: 28 }}>
        <Link
          href="/transcriptions"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: 8,
            background: '#5E6AD2',
            color: '#fff',
            fontSize: 14,
            fontWeight: 500,
            textDecoration: 'none',
            transition: 'opacity 0.15s',
          }}
        >
          Nouvelle transcription <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}
