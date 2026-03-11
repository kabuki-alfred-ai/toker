import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { CreditPacksClient } from '@/components/features/credits/credit-packs-client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

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

const REASON_VARIANTS: Record<TransactionReason, string> = {
  TRANSCRIPTION_USED: 'destructive',
  TRANSCRIPTION_REFUND: 'success',
  PURCHASE: 'default',
  WEEKLY_RESET: 'warning',
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
    <div className="max-w-2xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground font-albert">Crédits</h1>
        <p className="text-muted-foreground">Gérez votre solde et achetez des recharges.</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Solde actuel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-4xl font-bold", balance === 0 ? "text-destructive" : "text-primary")}>
              {balance}
            </span>
            <span className="text-muted-foreground font-medium">crédits</span>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Recharge automatique le {nextReset} (les comptes &lt; 5 crédits sont rechargés à 5).
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Acheter des crédits</h2>
        <CreditPacksClient packs={PACKS} />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-albert text-foreground">Historique</h2>
          {history.total > 0 && <span className="text-xs text-muted-foreground">{history.total} opérations</span>}
        </div>

        {history.items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Aucune opération pour le moment.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {history.items.map((tx) => (
                  <div key={tx.id} className="flex items-center gap-4 p-4 text-sm">
                    <span className={cn("font-bold min-w-[32px] text-right", tx.amount > 0 ? "text-emerald-600" : "text-destructive")}>
                      {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                    </span>
                    <Badge variant={REASON_VARIANTS[tx.reason] as any} className="text-[10px] uppercase font-bold py-0 h-5">
                      {REASON_LABELS[tx.reason]}
                    </Badge>
                    <span className="flex-1 text-muted-foreground truncate">
                      {shortDesc(tx.description, tx.reason)}
                    </span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
