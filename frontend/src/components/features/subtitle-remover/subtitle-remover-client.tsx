'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Subtitles, Loader2, AlertCircle, Zap, History,
  CheckCircle2, Download, RefreshCw, Link2, X, Play,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

// ─── Types ────────────────────────────────────────────────────────────────────

type RemovalStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

interface RemovalJob {
  id: string
  status: RemovalStatus
  videoUrl: string
  fileUrl: string | null
  errorMsg: string | null
  createdAt: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<RemovalStatus, string> = {
  PENDING: 'En attente',
  PROCESSING: 'En cours',
  COMPLETED: 'Terminé',
  FAILED: 'Échoué',
}

const STATUS_COLORS: Record<RemovalStatus, string> = {
  PENDING: 'bg-muted text-muted-foreground',
  PROCESSING: 'bg-amber-500/15 text-amber-500',
  COMPLETED: 'bg-emerald-500/15 text-emerald-500',
  FAILED: 'bg-destructive/15 text-destructive',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace('www.', '') + u.pathname.slice(0, 30)
  } catch { return url.slice(0, 42) }
}

// ─── Main client ──────────────────────────────────────────────────────────────

// ─── Video detail modal ───────────────────────────────────────────────────────

function VideoModal({ job, onClose }: { job: RemovalJob; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <p className="text-sm font-semibold truncate max-w-[80%]">{shortUrl(job.videoUrl)}</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <video
            src={job.fileUrl!}
            controls
            className="w-full rounded-lg bg-black aspect-video"
          />
          <div className="flex justify-end">
            <a
              href={job.fileUrl!}
              download
              className="inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors no-underline"
            >
              <Download size={14} />
              Télécharger
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main client ──────────────────────────────────────────────────────────────

export function SubtitleRemoverClient({ credits, history: initialHistory }: { credits: number; history: RemovalJob[] }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeJob, setActiveJob] = useState<RemovalJob | null>(null)
  const [history, setHistory] = useState(initialHistory)
  const [activeTab, setActiveTab] = useState('form')
  const [selectedJob, setSelectedJob] = useState<RemovalJob | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  useEffect(() => () => stopPolling(), [])

  function startPolling(id: string) {
    stopPolling()
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/v1/subtitle-remover/${id}`, { credentials: 'include' })
      if (!res.ok) return
      const data: RemovalJob = await res.json()
      setActiveJob(data)
      if (data.status === 'COMPLETED' || data.status === 'FAILED') {
        stopPolling()
        setHistory((prev) => prev.some((h) => h.id === id)
          ? prev.map((h) => h.id === id ? data : h)
          : [data, ...prev]
        )
      }
    }, 4000)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setError(null)
    setLoading(true)
    setActiveJob(null)

    try {
      const res = await fetch('/api/v1/subtitle-remover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ videoUrl: url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Erreur serveur')
      const job: RemovalJob = {
        id: data.id, status: 'PENDING', videoUrl: url,
        fileUrl: null, errorMsg: null, createdAt: new Date().toISOString(),
      }
      setActiveJob(job)
      startPolling(data.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur serveur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground font-albert">Subtitle Remover</h1>
        <p className="text-muted-foreground">Supprimez automatiquement les sous-titres incrustés de vos vidéos.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="form" className="gap-2"><Subtitles size={14} /> Supprimer</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><History size={14} /> Historique</TabsTrigger>
        </TabsList>

        {/* ── Form tab ── */}
        <TabsContent value="form" className="pt-4 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Link2 size={18} />
              </div>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://... (URL publique de la vidéo)"
                className="pl-10"
              />
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Comment ça marche</p>
              <p>Le modèle détecte automatiquement les zones de sous-titres et les efface par inpainting (algorithme STTN). Le traitement prend généralement <strong>3–10 minutes</strong> selon la durée de la vidéo.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="text-sm font-medium text-muted-foreground">
                1 crédit par vidéo · Solde : <span className="text-foreground font-bold">{credits}</span>
              </div>
              <Button
                type="submit"
                disabled={loading || !url.trim() || credits < 1}
                size="lg"
              >
                {loading
                  ? <Loader2 size={16} className="animate-spin mr-2" />
                  : <Zap size={16} className="mr-2 fill-current" />
                }
                Supprimer les sous-titres
              </Button>
            </div>
          </form>

          {/* Error */}
          {error && (
            <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm font-medium flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Active job */}
          {activeJob && (
            <div className="space-y-4">
              {(activeJob.status === 'PENDING' || activeJob.status === 'PROCESSING') && (
                <div className="flex flex-col items-center justify-center py-14 gap-4">
                  <Loader2 size={36} className="animate-spin text-primary" />
                  <div className="text-center space-y-1">
                    <p className="text-sm font-semibold">Traitement en cours sur GPU…</p>
                    <p className="text-xs text-muted-foreground">
                      {activeJob.status === 'PROCESSING'
                        ? 'Suppression des sous-titres par inpainting STTN…'
                        : 'En attente de traitement…'
                      }
                    </p>
                  </div>
                </div>
              )}

              {activeJob.status === 'FAILED' && (
                <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm font-medium flex items-center gap-2">
                  <AlertCircle size={16} />
                  {activeJob.errorMsg ?? 'Le traitement a échoué. Votre crédit a été remboursé.'}
                </div>
              )}

              {activeJob.status === 'COMPLETED' && activeJob.fileUrl && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500">
                    <CheckCircle2 size={13} /> Vidéo prête
                  </div>
                  <Card>
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{shortUrl(activeJob.videoUrl)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Sous-titres supprimés</p>
                      </div>
                      <a
                        href={activeJob.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors no-underline shrink-0"
                      >
                        <Download size={12} />
                        Télécharger
                      </a>
                    </CardContent>
                  </Card>
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
                      <span className="flex-1 text-sm font-medium truncate">
                        {shortUrl(item.videoUrl)}
                      </span>
                      <div className="text-xs text-muted-foreground flex-shrink-0">
                        {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                      </div>
                      {item.status === 'COMPLETED' && item.fileUrl && (
                        <button
                          onClick={() => setSelectedJob(item)}
                          className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded bg-muted hover:bg-accent transition-colors shrink-0"
                        >
                          <Play size={11} /> Voir
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedJob && (
        <VideoModal job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </div>
  )
}
