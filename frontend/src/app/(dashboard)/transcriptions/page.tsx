export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MultiUrlSubmitWrapper } from '@/components/features/transcriptions/multi-url-submit-wrapper'
import { PlatformIcon, detectPlatform } from '@/components/ui/platform-icon'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Zap, History } from 'lucide-react'

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
    <div className="max-w-4xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground font-albert">
          Transcriptions
        </h1>
        <p className="text-muted-foreground">
          Transformez vos vidéos en texte en quelques secondes.
        </p>
      </div>

      <Tabs value={tab} className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="form" asChild>
            <Link href="/transcriptions?tab=form" className="no-underline flex items-center gap-2">
              <Zap size={14} /> Nouvelle
            </Link>
          </TabsTrigger>
          <TabsTrigger value="history" asChild>
            <Link href="/transcriptions?tab=history" className="no-underline flex items-center gap-2">
              <History size={14} /> Historique
              {transcriptions.total > 0 && (
                <span className="text-[10px] bg-muted-foreground/20 px-1 rounded-sm">
                  {transcriptions.total}
                </span>
              )}
            </Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="pt-2">
        {tab === 'form' ? (
          <MultiUrlSubmitWrapper credits={balance} />
        ) : (
          <HistoryTab transcriptions={transcriptions} page={page} />
        )}
      </div>
    </div>
  )
}

function HistoryTab({ transcriptions, page }: { transcriptions: TranscriptionsData; page: number }) {
  if (transcriptions.items.length === 0) {
    return (
      <Card>
        <CardContent className="py-20 text-center">
          <p className="text-muted-foreground font-medium mb-6">Aucune transcription pour le moment.</p>
          <Button asChild>
            <Link href="/transcriptions?tab=form">Commencer</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="divide-y">
            {transcriptions.items.map((tx) => {
              const platform = detectPlatform(tx.videoUrl)
              const statusColors = {
                PENDING: 'bg-muted text-muted-foreground',
                PROCESSING: 'bg-sky-50 text-sky-600',
                COMPLETED: 'bg-emerald-50 text-emerald-600',
                FAILED: 'bg-destructive/10 text-destructive'
              }
              return (
                <Link
                  key={tx.id}
                  href={`/transcriptions/${tx.id}`}
                  className="group flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors no-underline"
                >
                  <div className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0",
                    statusColors[tx.status]
                  )}>
                    {STATUS_LABELS[tx.status]}
                  </div>
                  <div className="opacity-70 group-hover:opacity-100 transition-opacity shrink-0">
                    <PlatformIcon platform={platform} />
                  </div>
                  <span className="flex-1 text-sm font-medium text-foreground truncate">
                    {tx.title ?? shortUrl(tx.videoUrl)}
                  </span>
                  <div className="flex items-center gap-6 shrink-0 text-xs font-medium text-muted-foreground">
                    {tx.duration != null && (
                      <span className="font-mono">
                        {formatDuration(tx.duration)}
                      </span>
                    )}
                    <span className="uppercase">
                      {new Date(tx.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {transcriptions.total > 20 && (
        <div className="mt-8 flex gap-2 justify-center">
          <Button asChild variant="outline" size="sm" disabled={page <= 1}>
            <Link href={`/transcriptions?tab=history&page=${page - 1}`} className="no-underline">← Précédent</Link>
          </Button>
          <Button asChild variant="outline" size="sm" disabled={page * 20 >= transcriptions.total}>
            <Link href={`/transcriptions?tab=history&page=${page + 1}`} className="no-underline">Suivant →</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
