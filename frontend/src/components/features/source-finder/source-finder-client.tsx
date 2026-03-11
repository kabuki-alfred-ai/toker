'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, ExternalLink, Loader2, AlertCircle, Zap, Film, History, SearchCode } from 'lucide-react'
import { detectPlatform, PlatformIcon } from '@/components/ui/platform-icon'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

interface SourceResult {
  url: string
  title: string
  thumbnailUrl: string | null
  platform: string
  score: number
}

interface SceneResult {
  index: number
  frameUrl: string | null
  sources: SourceResult[]
}

interface SearchResult {
  id: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  videoUrl: string
  sources: SceneResult[] | null
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

const STATUS_STEPS: Record<string, string> = {
  PENDING: 'En attente…',
  PROCESSING: 'Analyse des scènes en cours…',
}

const STATUS_LABELS = { PENDING: 'En attente', PROCESSING: 'En cours', COMPLETED: 'Terminé', FAILED: 'Échoué' }

function shortUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace('www.', '') + u.pathname.slice(0, 30) + (u.pathname.length > 30 ? '…' : '')
  } catch { return url.slice(0, 42) }
}

function SourceRow({ source }: { source: SourceResult }) {
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
              "h-full rounded-full transition-all",
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

function SceneCard({ scene }: { scene: SceneResult }) {
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
          {scene.sources.map((s, i) => <SourceRow key={i} source={s} />)}
        </CardContent>
      )}
    </Card>
  )
}

export function SourceFinderClient({ credits, history: initialHistory }: { credits: number; history: HistoryItem[] }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeSearch, setActiveSearch] = useState<SearchResult | null>(null)
  const [history, setHistory] = useState(initialHistory)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const platform = detectPlatform(url)

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  useEffect(() => () => stopPolling(), [])

  function startPolling(id: string) {
    stopPolling()
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/v1/source-finder/${id}`, { credentials: 'include' })
      if (!res.ok) return
      const data: SearchResult = await res.json()
      setActiveSearch(data)
      if (data.status === 'COMPLETED' || data.status === 'FAILED') {
        stopPolling()
        const totalSourcesCount = data.sources?.reduce((acc, s) => acc + s.sources.length, 0) ?? 0
        setHistory((prev) => [{
          id: data.id,
          status: data.status,
          videoUrl: data.videoUrl,
          sourcesCount: totalSourcesCount,
          createdAt: data.createdAt,
        }, ...prev])
      }
    }, 3000)
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

  const totalSources = activeSearch?.sources?.reduce((acc, s) => acc + s.sources.length, 0) ?? 0

  return (
    <div className="max-w-4xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground font-albert">Source Finder</h1>
        <p className="text-muted-foreground">Retrouvez les vidéos originales.</p>
      </div>

      <Tabs defaultValue="form" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="form" className="gap-2"><SearchCode size={14} /> Recherche</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><History size={14} /> Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="form" className="pt-4 space-y-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {platform !== 'unknown' ? <PlatformIcon platform={platform} size={18} /> : <Search size={18} />}
                </div>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Collez l'URL ici..."
                  className="pl-10"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm font-medium text-muted-foreground">
                  1 crédit par recherche • Solde: {credits}
                </div>
                <Button type="submit" disabled={loading || !url.trim() || credits < 1} size="lg">
                  {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Zap size={16} className="mr-2 fill-current" />}
                  Lancer la recherche
                </Button>
              </div>
            </form>

            {error && (
              <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm font-medium flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {activeSearch && (
              <div className="space-y-6">
                {(activeSearch.status === 'PENDING' || activeSearch.status === 'PROCESSING') && (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <Loader2 size={32} className="animate-spin text-primary" />
                    <p className="text-sm font-medium">{STATUS_STEPS[activeSearch.status]}</p>
                  </div>
                )}

                {activeSearch.status === 'COMPLETED' && (
                  <>
                    <h2 className="text-lg font-bold border-b pb-2">Résultats</h2>
                    {totalSources > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                          {activeSearch.sources!.map((scene) => <SceneCard key={scene.index} scene={scene} />)}
                        </div>
                    ) : (
                        <p className="text-center py-12 text-muted-foreground">Aucune source trouvée.</p>
                    )}
                  </>
                )}
              </div>
            )}
        </TabsContent>

        <TabsContent value="history" className="pt-4">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {history.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">Historique vide.</div>
              ) : (
                <div className="divide-y">
                  {history.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                      <div className="text-[10px] font-bold uppercase bg-muted px-2 py-0.5 rounded">
                        {STATUS_LABELS[item.status]}
                      </div>
                      <span className="flex-1 text-sm font-medium truncate">{shortUrl(item.videoUrl)}</span>
                      <div className="text-xs text-muted-foreground font-medium">
                        {item.sourcesCount} sources • {new Date(item.createdAt).toLocaleDateString()}
                      </div>
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
