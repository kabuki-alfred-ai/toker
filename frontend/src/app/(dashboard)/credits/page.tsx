import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { CreditPacksClient } from '@/components/features/credits/credit-packs-client'

const PACKS = [
  { id: 'pack_10', credits: 10, price: '9,99€', label: '10 crédits' },
  { id: 'pack_50', credits: 50, price: '39,99€', label: '50 crédits', recommended: true },
  { id: 'pack_100', credits: 100, price: '69,99€', label: '100 crédits' },
] as const

type TransactionReason = 'TRANSCRIPTION_USED' | 'TRANSCRIPTION_REFUND' | 'PURCHASE' | 'WEEKLY_RESET'

interface CreditTransaction {
  id: string
  amount: number
  reason: TransactionReason
  description: string | null
  createdAt: string
}

interface HistoryData {
  items: CreditTransaction[]
  total: number
}

async function fetchCreditsData(): Promise<{ balance: number; nextReset: string; history: HistoryData } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) return null

  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001'
  const headers = { Cookie: `access_token=${token}` }

  const [userRes, historyRes] = await Promise.all([
    fetch(`${backendUrl}/api/v1/users/me`, { headers, cache: 'no-store' }),
    fetch(`${backendUrl}/api/v1/credits/history`, { headers, cache: 'no-store' }),
  ])
  if (!userRes.ok) return null

  const [userData, historyData] = await Promise.all([
    userRes.json() as Promise<{ credits: { balance: number } }>,
    historyRes.ok ? historyRes.json() as Promise<HistoryData> : Promise.resolve({ items: [], total: 0 }),
  ])

  const now = new Date()
  const day = now.getUTCDay()
  const daysUntilMonday = day === 0 ? 1 : 8 - day
  const nextMonday = new Date(now)
  nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday)
  nextMonday.setUTCHours(0, 0, 0, 0)

  return {
    balance: userData.credits.balance,
    nextReset: nextMonday.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
    history: historyData,
  }
}

const REASON_LABELS: Record<TransactionReason, string> = {
  TRANSCRIPTION_USED: 'Transcription',
  TRANSCRIPTION_REFUND: 'Remboursement',
  PURCHASE: 'Achat',
  WEEKLY_RESET: 'Recharge hebdo',
}

const REASON_COLORS: Record<TransactionReason, string> = {
  TRANSCRIPTION_USED: '#EF4444',
  TRANSCRIPTION_REFUND: '#22C55E',
  PURCHASE: '#5E6AD2',
  WEEKLY_RESET: '#F59E0B',
}

function shortDesc(description: string | null, reason: TransactionReason): string {
  if (!description) return REASON_LABELS[reason]
  if (reason === 'TRANSCRIPTION_USED' || reason === 'TRANSCRIPTION_REFUND') {
    try {
      const u = new URL(description)
      return u.hostname.replace('www.', '') + u.pathname.slice(0, 28) + (u.pathname.length > 28 ? '…' : '')
    } catch { return description.slice(0, 40) }
  }
  return description
}

export default async function CreditsPage() {
  const info = await fetchCreditsData()
  if (!info) redirect('/login')

  const { balance, nextReset, history } = info

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, color: '#F2F2F2', marginBottom: 6 }}>Crédits</h1>

      {/* Current balance */}
      <div style={{ marginBottom: 32, padding: '20px 24px', borderRadius: 10, background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ color: '#8B8B8B', fontSize: 13, margin: '0 0 4px' }}>Solde actuel</p>
        <p style={{ color: '#F2F2F2', fontSize: 42, fontWeight: 700, margin: 0, lineHeight: 1 }}>
          {balance}
          <span style={{ fontSize: 16, fontWeight: 400, color: '#8B8B8B', marginLeft: 8 }}>crédits</span>
        </p>
        <p style={{ color: '#555', fontSize: 12, margin: '10px 0 0' }}>
          Reset gratuit le {nextReset} — les wallets &lt; 5 crédits sont rechargés à 5
        </p>
      </div>

      {/* Packs */}
      <p style={{ color: '#8B8B8B', fontSize: 13, marginBottom: 14 }}>Acheter des crédits</p>
      <CreditPacksClient packs={PACKS} />

      {/* History */}
      <div style={{ marginTop: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#F2F2F2', margin: 0 }}>Historique</h2>
          {history.total > 0 && (
            <span style={{ fontSize: 12, color: '#555' }}>{history.total} opération{history.total > 1 ? 's' : ''}</span>
          )}
        </div>

        {history.items.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', background: '#111111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 }}>
            <p style={{ color: '#8B8B8B', fontSize: 13, margin: 0 }}>Aucune opération pour le moment.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {history.items.map((tx) => (
              <div
                key={tx.id}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderRadius: 8, background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {/* Amount badge */}
                <span style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: tx.amount > 0 ? '#22C55E' : '#EF4444',
                  minWidth: 36,
                  textAlign: 'right',
                  flexShrink: 0,
                }}>
                  {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                </span>

                {/* Reason tag */}
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: REASON_COLORS[tx.reason],
                  background: `${REASON_COLORS[tx.reason]}15`,
                  padding: '2px 8px',
                  borderRadius: 4,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  {REASON_LABELS[tx.reason]}
                </span>

                {/* Description */}
                <span style={{ flex: 1, fontSize: 12, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {shortDesc(tx.description, tx.reason)}
                </span>

                {/* Date */}
                <span style={{ fontSize: 11, color: '#555', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {new Date(tx.createdAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
