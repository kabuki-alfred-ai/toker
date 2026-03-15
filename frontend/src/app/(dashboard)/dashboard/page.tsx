export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle2, AlertTriangle, Zap,
  FileText, Download, Subtitles, Search,
} from 'lucide-react'
import { PlatformIcon, detectPlatform } from '@/components/ui/platform-icon'
import { cn } from '@/lib/utils'
import { Card, CardHeader, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
type FeatureType = 'transcription' | 'download' | 'subtitle-removal' | 'source-search'

interface ActivityItem {
  id: string
  type: FeatureType
  status: ItemStatus
  videoUrl: string
  title: string | null
  createdAt: string
}

interface UserData {
  credits: { balance: number }
  email: string
  firstName: string | null
}

// ─── Config ───────────────────────────────────────────────────────────────────

const FEATURE_CONFIG: Record<FeatureType, {
  label: string
  href: (id: string) => string
  icon: React.ElementType
  color: string
}> = {
  'transcription':    { label: 'Transcription',    href: (id) => `/transcriptions/${id}`, icon: FileText,  color: 'bg-blue-500/10 text-blue-500' },
  'download':         { label: 'Download',          href: (id) => `/download/${id}`,        icon: Download,  color: 'bg-violet-500/10 text-violet-500' },
  'subtitle-removal': { label: 'Subtitle',          href: () => `/subtitle-remover`,        icon: Subtitles, color: 'bg-amber-500/10 text-amber-500' },
  'source-search':    { label: 'Source Finder',     href: () => `/source-finder`,           icon: Search,    color: 'bg-emerald-500/10 text-emerald-500' },
}

const STATUS_COLORS: Record<ItemStatus, string> = {
  PENDING:    'bg-muted text-muted-foreground',
  PROCESSING: 'bg-sky-500/10 text-sky-500',
  COMPLETED:  'bg-emerald-500/10 text-emerald-600',
  FAILED:     'bg-destructive/10 text-destructive',
}

const STATUS_LABELS: Record<ItemStatus, string> = {
  PENDING: 'En attente', PROCESSING: 'En cours', COMPLETED: 'Terminé', FAILED: 'Échoué',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace('www.', '') + u.pathname.slice(0, 30) + (u.pathname.length > 30 ? '…' : '')
  } catch { return url.slice(0, 40) }
}

function getNextMonday(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const daysUntilMonday = (1 - tomorrow.getDay() + 7) % 7 || 7
  const d = new Date(tomorrow)
  d.setDate(tomorrow.getDate() + (tomorrow.getDay() === 1 ? 0 : daysUntilMonday))
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchDashboardData() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) redirect('/login')

  const base = process.env.BACKEND_URL || 'http://localhost:3001'
  const h = { Cookie: `access_token=${token}` }

  const [userRes, txRes, dlRes, srRes, sfRes] = await Promise.all([
    fetch(`${base}/api/v1/users/me`,                  { headers: h, cache: 'no-store' }),
    fetch(`${base}/api/v1/transcriptions?limit=5`,    { headers: h, cache: 'no-store' }),
    fetch(`${base}/api/v1/downloads?limit=5`,         { headers: h, cache: 'no-store' }),
    fetch(`${base}/api/v1/subtitle-remover?limit=5`,  { headers: h, cache: 'no-store' }),
    fetch(`${base}/api/v1/source-finder?limit=5`,     { headers: h, cache: 'no-store' }),
  ])

  if (!userRes.ok) redirect('/login')

  const user: UserData = await userRes.json()
  const tx = txRes.ok ? await txRes.json() : { items: [], total: 0 }
  const dl = dlRes.ok ? await dlRes.json() : { items: [], total: 0 }
  const sr = srRes.ok ? await srRes.json() : { items: [], total: 0 }
  const sf = sfRes.ok ? await sfRes.json() : { items: [], total: 0 }

  type RawItem = { id: string; status: ItemStatus; videoUrl: string; title?: string | null; createdAt: string }

  const activities: ActivityItem[] = [
    ...(tx.items as RawItem[]).map((i) => ({ ...i, type: 'transcription' as FeatureType, title: i.title ?? null })),
    ...(dl.items as RawItem[]).map((i) => ({ ...i, type: 'download' as FeatureType, title: i.title ?? null })),
    ...(sr.items as RawItem[]).map((i) => ({ ...i, type: 'subtitle-removal' as FeatureType, title: null })),
    ...(sf.items as RawItem[]).map((i) => ({ ...i, type: 'source-search' as FeatureType, title: null })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)

  return {
    user,
    activities,
    totals: { transcriptions: tx.total, downloads: dl.total, subtitleRemovals: sr.total },
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ credits_added?: string }>
}) {
  const [{ user, activities, totals }, sp] = await Promise.all([fetchDashboardData(), searchParams])
  const balance = user.credits.balance
  const creditsAdded = sp.credits_added ? parseInt(sp.credits_added, 10) : null
  const nextMonday = getNextMonday()

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Success banner */}
      {creditsAdded && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3">
          <CheckCircle2 size={18} className="text-emerald-500" />
          <span className="text-emerald-700 text-sm font-medium">{creditsAdded} crédits ajoutés avec succès !</span>
        </div>
      )}

      {/* Low credits */}
      {balance <= 2 && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-amber-500" />
            <span className="text-amber-700 text-sm font-medium">Solde bas ({balance}) — Rechargez pour continuer !</span>
          </div>
          <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-600">
            <Link href="/credits">Recharger</Link>
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground font-albert">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Bienvenue, <span className="text-primary font-medium">{user.firstName || user.email}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Zap,       label: 'Crédits',          value: balance,                  href: '/credits',          accent: balance === 0 ? 'text-destructive' : balance <= 2 ? 'text-amber-500' : 'text-primary' },
          { icon: FileText,  label: 'Transcriptions',   value: totals.transcriptions,    href: '/transcriptions',   accent: 'text-blue-500' },
          { icon: Download,  label: 'Downloads',        value: totals.downloads,         href: '/download',         accent: 'text-violet-500' },
          { icon: Subtitles, label: 'Subtitle Remover', value: totals.subtitleRemovals,  href: '/subtitle-remover', accent: 'text-amber-500' },
        ].map(({ icon: Icon, label, value, href, accent }) => (
          <Link key={label} href={href} className="no-underline">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2 text-xs">
                  <Icon size={13} className={accent} /> {label}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <span className={cn('text-3xl font-bold', accent)}>{value}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Next credit reset */}
      <p className="text-xs text-muted-foreground -mt-4">
        Prochaine recharge de crédits : <span className="font-semibold">{nextMonday}</span>
      </p>

      {/* Activity feed */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground font-albert">Activité récente</h2>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {activities.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Aucune activité pour le moment.
              </div>
            ) : (
              <div className="divide-y">
                {activities.map((item) => {
                  const cfg = FEATURE_CONFIG[item.type]
                  const Icon = cfg.icon
                  return (
                    <Link
                      key={`${item.type}-${item.id}`}
                      href={cfg.href(item.id)}
                      className="group flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors no-underline"
                    >
                      <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0', cfg.color)}>
                        <Icon size={9} /> {cfg.label}
                      </span>
                      <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0', STATUS_COLORS[item.status])}>
                        {STATUS_LABELS[item.status]}
                      </span>
                      <div className="shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                        <PlatformIcon platform={detectPlatform(item.videoUrl)} />
                      </div>
                      <span className="flex-1 text-sm font-medium text-foreground truncate">
                        {item.title ?? shortUrl(item.videoUrl)}
                      </span>
                      <span className="text-[10px] font-medium text-muted-foreground shrink-0">
                        {new Date(item.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                      </span>
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
