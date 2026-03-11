export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, AlertTriangle, Zap, FileText, Calendar, ArrowRight } from 'lucide-react'
import { PlatformIcon, detectPlatform } from '@/components/ui/platform-icon'
import { cn } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

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
  firstName: string | null
  lastName: string | null
}

interface TranscriptionsData {
  items: TxItem[]
  total: number
  page: number
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
  const daysUntilMonday = (1 - tomorrow.getDay() + 7) % 7 || 7
  const nextMonday = new Date(tomorrow)
  nextMonday.setDate(tomorrow.getDate() + (daysUntilMonday === 7 && tomorrow.getDay() === 1 ? 0 : daysUntilMonday))
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
    fetch(`${backendUrl}/api/v1/transcriptions?page=1&limit=10`, { headers, cache: 'no-store' }),
  ])

  if (!userRes.ok || !txRes.ok) redirect('/login')

  const [user, transcriptions] = await Promise.all([userRes.json(), txRes.json()])
  return { user, transcriptions }
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
    <div className="space-y-8 max-w-5xl">
      {/* Success banner */}
      {creditsAdded && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3">
          <CheckCircle2 size={18} className="text-emerald-500" />
          <span className="text-emerald-700 text-sm font-medium">
            {creditsAdded} crédits ajoutés avec succès !
          </span>
        </div>
      )}

      {/* Low credits warning */}
      {balance <= 2 && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-amber-500" />
            <span className="text-amber-700 text-sm font-medium">
              Solde de crédits bas ({balance}) — Rechargez pour continuer !
            </span>
          </div>
          <Button asChild size="sm" variant="default" className="bg-amber-500 hover:bg-amber-600">
            <Link href="/credits">Recharger</Link>
          </Button>
        </div>
      )}

      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground font-albert">
          Tableau de bord
        </h1>
        <p className="text-muted-foreground">
          Bienvenue, <span className="text-primary font-medium">{user.firstName || user.email}</span>
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Zap size={14} className="text-primary" />
              Crédits disponibles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <span className={cn("text-3xl font-bold", 
              balance === 0 ? "text-destructive" : balance <= 2 ? "text-amber-500" : "text-primary"
            )}>
              {balance}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <FileText size={14} className="text-primary" />
              Total Transcriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-foreground">
              {transcriptions.total}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Calendar size={14} className="text-primary" />
              Prochaine recharge
            </CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-foreground">
              {nextMonday}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground font-albert">
            Activité récente
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/transcriptions" className="flex items-center gap-1">
              Voir tout <ArrowRight size={16} />
            </Link>
          </Button>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {transcriptions.items.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  Aucune transcription pour le moment.
                </p>
                <Button asChild className="mt-4" variant="outline" size="sm">
                   <Link href="/transcriptions">Commencer</Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {transcriptions.items.map((tx) => {
                  const platform = detectPlatform(tx.videoUrl)
                  const statusConfig = {
                    PENDING: 'bg-muted text-muted-foreground',
                    PROCESSING: 'bg-sky-50 text-sky-600',
                    COMPLETED: 'bg-emerald-50 text-emerald-600',
                    FAILED: 'bg-destructive/10 text-destructive',
                  }[tx.status]

                  return (
                    <Link
                      key={tx.id}
                      href={`/transcriptions/${tx.id}`}
                      className="group flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors no-underline"
                    >
                      <div className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0",
                        statusConfig
                      )}>
                        {STATUS_LABELS[tx.status]}
                      </div>
                      <div className="shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                        <PlatformIcon platform={platform} />
                      </div>
                      <span className="flex-1 text-sm font-medium text-foreground truncate">
                        {tx.title ?? shortUrl(tx.videoUrl)}
                      </span>
                      <div className="flex items-center gap-4 shrink-0 text-muted-foreground">
                        {tx.duration != null && (
                          <span className="text-xs font-mono">
                            {formatDuration(tx.duration)}
                          </span>
                        )}
                        <span className="text-[10px] font-medium uppercase">
                          {new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
