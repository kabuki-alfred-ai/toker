'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Search, ExternalLink, Loader2, AlertCircle, Zap, Film,
  History, SearchCode, Sparkles, Tag, ListVideo, Calendar,
  TrendingUp, CheckCircle2, RefreshCw,
} from 'lucide-react'
import { detectPlatform, PlatformIcon } from '@/components/ui/platform-icon'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeminiAnalysis {
  isRemix: boolean
  analysis: string
  keywords: string[]
  searchQueries: string[]
}

interface GeminiVideoResult {
  videoId: string
  title: string
  channelTitle: string
  thumbnailUrl: string
  url: string
  publishedAt: string
  relevanceScore: number
  matchReason: string
}

interface GeminySources {
  strategy: 'gemini'
  analysis: GeminiAnalysis
  results: GeminiVideoResult[]
}

// Legacy Python strategy
interface LegacySourceResult {
  url: string
  title: string
  thumbnailUrl: string | null
  platform: string
  score: number
}

interface LegacyScene {
  index: number
  frameUrl: string | null
  sources: LegacySourceResult[]
}

type SourcesPayload = GeminySources | LegacyScene[]

interface SearchResult {
  id: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  videoUrl: string
  sources: SourcesPayload | null
  errorMsg: string | null
  createdAt: string
}

interface HistoryItem {
  id: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  videoUrl: string
  sourcesCount: number
  createdAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isGeminiSources(s: SourcesPayload): s is GeminySources {
  return !Array.isArray(s) && (s as GeminySources).strategy === 'gemini'
}

function shortUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace('www.', '') + u.pathname.slice(0, 30) + (u.pathname.length > 30 ? '…' : '')
  } catch { return url.slice(0, 42) }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' })
}

// ─── Gemini result components ─────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  return (
    <div className={cn(
      'flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full',
      score >= 70 ? 'bg-emerald-500/15 text-emerald-500' :
      score >= 40 ? 'bg-amber-500/15 text-amber-500' :
                   'bg-muted text-muted-foreground'
    )}>
      <TrendingUp size={9} />
      {score}%
    </div>
  )
}

function GeminiVideoCard({ video }: { video: GeminiVideoResult }) {
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noreferrer"
      className="group flex gap-3 p-3 rounded-lg bg-muted/30 border border-transparent hover:border-primary/30 hover:bg-muted/50 transition-all no-underline"
    >
      {/* Thumbnail */}
      <div className="w-28 h-16 rounded-md overflow-hidden flex-shrink-0 bg-muted border border-border">
        {video.thumbnailUrl
          ? <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Film size={18} className="text-muted-foreground/40" /></div>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-1">
        <div>
          <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
            {video.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{video.channelTitle}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ScoreBadge score={video.relevanceScore} />
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Calendar size={9} />
            {formatDate(video.publishedAt)}
          </span>
        </div>
      </div>

      <ExternalLink size={13} className="flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors mt-0.5" />
    </a>
  )
}

function GeminiAnalysisCard({ analysis }: { analysis: GeminiAnalysis }) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="p-4 pb-3 space-y-0 flex flex-row items-start gap-3">
        <div className="mt-0.5 p-1.5 rounded-md bg-primary/10">
          <Sparkles size={14} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-sm font-bold">Analyse Toker</CardTitle>
            {analysis.isRemix ? (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/20">
                Remix / Reediting
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/20">
                Contenu original
              </span>
            )}
          </div>
          <CardDescription className="text-xs mt-1">{analysis.analysis}</CardDescription>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {/* Keywords */}
        {analysis.keywords.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Tag size={9} /> Mots-clés extraits
            </p>
            <div className="flex flex-wrap gap-1.5">
              {analysis.keywords.map((kw) => (
                <span key={kw} className="text-xs px-2 py-0.5 rounded-full bg-muted border border-border font-medium">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Search queries */}
        {analysis.searchQueries.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <ListVideo size={9} /> Requêtes YouTube utilisées
            </p>
            <div className="space-y-1">
              {analysis.searchQueries.map((q, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="text-[10px] font-bold text-primary/60 w-3 flex-shrink-0">{i + 1}.</span>
                  <span className="truncate">{q}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function GeminiResults({ sources }: { sources: GeminySources }) {
  const { analysis, results } = sources
  return (
    <div className="space-y-5">
      <GeminiAnalysisCard analysis={analysis} />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Film size={12} />
            {results.length} vidéo{results.length !== 1 ? 's' : ''} trouvée{results.length !== 1 ? 's' : ''}
          </h2>
        </div>

        {results.length > 0 ? (
          <div className="space-y-2">
            {results.map((v) => <GeminiVideoCard key={v.videoId} video={v} />)}
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground text-sm">
            Aucune vidéo source trouvée.
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Legacy Python result components ─────────────────────────────────────────

function LegacySourceRow({ source }: { source: LegacySourceResult }) {
  const platform = detectPlatform(source.url)
  const pct = source.score
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="group flex items-center gap-3 p-3 rounded-md bg-muted/30 border border-transparent hover:border-primary/30 no-underline transition-colors"
    >
      <div className="w-16 h-10 rounded bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center">
        {source.thumbnailUrl
          ? <img src={source.thumbnailUrl} alt="" className="w-full h-full object-cover" />
          : <PlatformIcon platform={platform} size={18} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <PlatformIcon platform={platform} size={10} />
          <span className="text-xs font-semibold text-foreground truncate">
            {source.title || shortUrl(source.url)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
            <div className={cn(
              'h-full rounded-full transition-all',
              pct > 60 ? 'bg-emerald-500' : pct > 30 ? 'bg-amber-500' : 'bg-destructive'
            )} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">{pct}%</span>
        </div>
      </div>
      <ExternalLink size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
    </a>
  )
}

function LegacySceneCard({ scene }: { scene: LegacyScene }) {
  const hasSources = scene.sources.length > 0
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-4 p-4 space-y-0 bg-muted/30 border-b">
        <div className="w-20 h-12 rounded bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center border">
          {scene.frameUrl
            ? <img src={scene.frameUrl} alt={`Scène ${scene.index}`} className="w-full h-full object-cover" />
            : <Film size={18} className="text-muted-foreground/40" />
          }
        </div>
        <div>
          <CardTitle className="text-sm font-bold">Scène {scene.index}</CardTitle>
          <CardDescription className="text-[10px]">
            {hasSources ? `${scene.sources.length} sources` : 'Aucune source'}
          </CardDescription>
        </div>
      </CardHeader>
      {hasSources && (
        <CardContent className="p-3 space-y-2">
          {scene.sources.map((s, i) => <LegacySourceRow key={i} source={s} />)}
        </CardContent>
      )}
    </Card>
  )
}

// ─── Main client ──────────────────────────────────────────────────────────────

const STATUS_STEPS: Record<string, string> = {
  PENDING: 'En attente…',
  PROCESSING: 'Analyse en cours…',
}

const STATUS_LABELS = { PENDING: 'En attente', PROCESSING: 'En cours', COMPLETED: 'Terminé', FAILED: 'Échoué' }

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-muted text-muted-foreground',
  PROCESSING: 'bg-amber-500/15 text-amber-500',
  COMPLETED: 'bg-emerald-500/15 text-emerald-500',
  FAILED: 'bg-destructive/15 text-destructive',
}

export function SourceFinderClient({ credits, history: initialHistory }: { credits: number; history: HistoryItem[] }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeSearch, setActiveSearch] = useState<SearchResult | null>(null)
  const [history, setHistory] = useState(initialHistory)
  const [activeTab, setActiveTab] = useState('form')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const platform = detectPlatform(url)

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  useEffect(() => () => stopPolling(), [])

  function countSources(data: SearchResult): number {
    if (!data.sources) return 0
    if (isGeminiSources(data.sources)) return data.sources.results.length
    return (data.sources as LegacyScene[]).reduce((acc, s) => acc + s.sources.length, 0)
  }

  function startPolling(id: string) {
    stopPolling()
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/v1/source-finder/${id}`, { credentials: 'include' })
      if (!res.ok) return
      const data: SearchResult = await res.json()
      setActiveSearch(data)
      if (data.status === 'COMPLETED' || data.status === 'FAILED') {
        stopPolling()
        setHistory((prev) => [{
          id: data.id,
          status: data.status,
          videoUrl: data.videoUrl,
          sourcesCount: countSources(data),
          createdAt: data.createdAt,
        }, ...prev])
      }
    }, 3000)
  }

  async function handleOpenHistory(id: string) {
    setLoadingId(id)
    try {
      const res = await fetch(`/api/v1/source-finder/${id}`, { credentials: 'include' })
      if (!res.ok) throw new Error()
      const data: SearchResult = await res.json()
      setActiveSearch(data)
      setActiveTab('form')
    } catch {
      // silently ignore
    } finally {
      setLoadingId(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setError(null)
    setLoading(true)
    setActiveSearch(null)

    try {
      const res = await fetch('/api/v1/source-finder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ videoUrl: url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Erreur serveur')
      setActiveSearch({ id: data.id, status: 'PENDING', videoUrl: url, sources: null, errorMsg: null, createdAt: new Date().toISOString() })
      startPolling(data.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur serveur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground font-albert">Source Finder</h1>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            Bêta
          </span>
        </div>
        <p className="text-muted-foreground">Retrouvez les vidéos originales grâce à l&apos;IA.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="form" className="gap-2"><SearchCode size={14} /> Recherche</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><History size={14} /> Historique</TabsTrigger>
        </TabsList>

        {/* ── Search tab ── */}
        <TabsContent value="form" className="pt-4 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {platform !== 'unknown' ? <PlatformIcon platform={platform} size={18} /> : <Search size={18} />}
              </div>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Collez l'URL de la vidéo ici…"
                className="pl-10"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Sparkles size={13} className="text-primary" />
                1 crédit par recherche · Solde : <span className="text-foreground font-bold">{credits}</span>
              </div>
              <Button type="submit" disabled={loading || !url.trim() || credits < 1} size="lg">
                {loading
                  ? <Loader2 size={16} className="animate-spin mr-2" />
                  : <Zap size={16} className="mr-2 fill-current" />
                }
                Lancer la recherche
              </Button>
            </div>
          </form>

          {/* Error */}
          {error && (
            <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm font-medium flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Active search */}
          {activeSearch && (
            <div className="space-y-6">
              {/* Loading states */}
              {(activeSearch.status === 'PENDING' || activeSearch.status === 'PROCESSING') && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="relative">
                    <Loader2 size={36} className="animate-spin text-primary" />
                    <Sparkles size={14} className="absolute -top-1 -right-1 text-primary" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-semibold">{STATUS_STEPS[activeSearch.status]}</p>
                    <p className="text-xs text-muted-foreground">Toker analyse les métadonnées et recherche sur YouTube</p>
                  </div>
                </div>
              )}

              {/* Failed */}
              {activeSearch.status === 'FAILED' && (
                <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm font-medium flex items-center gap-2">
                  <AlertCircle size={16} />
                  {activeSearch.errorMsg ?? 'La recherche a échoué. Votre crédit a été remboursé.'}
                </div>
              )}

              {/* Completed */}
              {activeSearch.status === 'COMPLETED' && activeSearch.sources && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500">
                    <CheckCircle2 size={13} />
                    Recherche terminée
                  </div>

                  {isGeminiSources(activeSearch.sources)
                    ? <GeminiResults sources={activeSearch.sources} />
                    : (
                      <>
                        <h2 className="text-lg font-bold border-b pb-2">Résultats</h2>
                        <div className="grid grid-cols-1 gap-4">
                          {(activeSearch.sources as LegacyScene[]).map((scene) => (
                            <LegacySceneCard key={scene.index} scene={scene} />
                          ))}
                        </div>
                      </>
                    )
                  }
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── History tab ── */}
        <TabsContent value="history" className="pt-4">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {history.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">Historique vide.</div>
              ) : (
                <div className="divide-y">
                  {history.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
                      <span className={cn(
                        'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0',
                        STATUS_COLORS[item.status]
                      )}>
                        {item.status === 'PROCESSING' && <RefreshCw size={9} className="inline mr-0.5 animate-spin" />}
                        {STATUS_LABELS[item.status]}
                      </span>
                      <span className="flex-1 text-sm font-medium truncate">{shortUrl(item.videoUrl)}</span>
                      <div className="text-xs text-muted-foreground font-medium flex-shrink-0">
                        {item.sourcesCount} vidéo{item.sourcesCount !== 1 ? 's' : ''} · {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                      </div>
                      {item.status === 'COMPLETED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs flex-shrink-0"
                          disabled={loadingId === item.id}
                          onClick={() => handleOpenHistory(item.id)}
                        >
                          {loadingId === item.id
                            ? <Loader2 size={12} className="animate-spin" />
                            : <><Search size={12} className="mr-1" />Voir</>
                          }
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
