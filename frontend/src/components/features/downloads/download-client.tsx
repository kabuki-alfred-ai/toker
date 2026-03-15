'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Download, Loader2, AlertCircle, Zap, History, Clock,
  CheckCircle2, FileVideo, FileAudio, ExternalLink, RefreshCw, Youtube,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

// ─── Types ────────────────────────────────────────────────────────────────────

type DownloadStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

interface DownloadJob {
  id: string
  status: DownloadStatus
  videoUrl: string
  title: string | null
  thumbnail: string | null
  format: string
  quality: string
  fileUrl: string | null
  fileSize: string | null
  duration: string | null
  errorMsg: string | null
  createdAt: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FORMATS = [
  { value: 'mp4', label: 'MP4', type: 'video', icon: FileVideo },
  { value: 'webm', label: 'WebM', type: 'video', icon: FileVideo },
  { value: 'mp3', label: 'MP3', type: 'audio', icon: FileAudio },
  { value: 'm4a', label: 'M4A', type: 'audio', icon: FileAudio },
]

const QUALITIES_VIDEO = ['240p', '360p', '480p', '720p', '1080p']

const STATUS_LABELS: Record<DownloadStatus, string> = {
  PENDING: 'En attente',
  PROCESSING: 'En cours',
  COMPLETED: 'Terminé',
  FAILED: 'Échoué',
}

const STATUS_COLORS: Record<DownloadStatus, string> = {
  PENDING: 'bg-muted text-muted-foreground',
  PROCESSING: 'bg-amber-500/15 text-amber-500',
  COMPLETED: 'bg-emerald-500/15 text-emerald-500',
  FAILED: 'bg-destructive/15 text-destructive',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isAudioFormat(fmt: string) {
  return fmt === 'mp3' || fmt === 'm4a'
}


function shortUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace('www.', '') + u.pathname.slice(0, 30)
  } catch { return url.slice(0, 42) }
}

function isValidUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://')
}

// ─── Result card ──────────────────────────────────────────────────────────────

function DownloadResult({ job }: { job: DownloadJob }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex gap-4 p-4">
        {/* Thumbnail */}
        <div className="w-32 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center border">
          {job.thumbnail
            ? <img src={job.thumbnail} alt={job.title ?? ''} className="w-full h-full object-cover" />
            : <Youtube size={24} className="text-muted-foreground/40" />
          }
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
          <div>
            <p className="text-sm font-semibold leading-snug line-clamp-2">
              {job.title ?? shortUrl(job.videoUrl)}
            </p>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {job.duration && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock size={9} /> {job.duration}
                </span>
              )}
              {job.fileSize && (
                <span className="text-[10px] text-muted-foreground font-medium">{job.fileSize}</span>
              )}
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-muted">
                {job.format} {!isAudioFormat(job.format) && job.quality.replace('q', '')}
              </span>
            </div>
          </div>

          {/* Download button */}
          {job.fileUrl ? (
            <a
              href={job.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors no-underline w-fit"
            >
              <Download size={12} />
              Télécharger
            </a>
          ) : null}
        </div>
      </div>
    </Card>
  )
}

// ─── Main client ──────────────────────────────────────────────────────────────

export function DownloadClient({ credits, history: initialHistory }: { credits: number; history: DownloadJob[] }) {
  const [url, setUrl] = useState('')
  const [format, setFormat] = useState('mp4')
  const [quality, setQuality] = useState('720p')
  const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
  const [activeJob, setActiveJob] = useState<DownloadJob | null>(null)
  const [history, setHistory] = useState(initialHistory)
  const [activeTab, setActiveTab] = useState('form')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const selectedFormat = FORMATS.find((f) => f.value === format)!
  const isAudio = isAudioFormat(format)

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  useEffect(() => () => stopPolling(), [])

  function startPolling(id: string) {
    stopPolling()
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/v1/downloads/${id}`, { credentials: 'include' })
      if (!res.ok) return
      const data: DownloadJob = await res.json()
      setActiveJob(data)
      if (data.status === 'COMPLETED' || data.status === 'FAILED') {
        stopPolling()
        setHistory((prev) => prev.some((h) => h.id === id)
          ? prev.map((h) => h.id === id ? data : h)
          : [data, ...prev]
        )
      }
    }, 2500)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setError(null)
    setLoading(true)
    setActiveJob(null)

    try {
      const res = await fetch('/api/v1/downloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ videoUrl: url, format, quality: isAudio ? undefined : quality }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Erreur serveur')
      const job: DownloadJob = {
        id: data.id, status: 'PENDING', videoUrl: url, title: null, thumbnail: null,
        format, quality, fileUrl: null, fileSize: null, duration: null,
        errorMsg: null, createdAt: new Date().toISOString(),
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
        <h1 className="text-2xl font-bold text-foreground font-albert">Download</h1>
        <p className="text-muted-foreground">Téléchargez des vidéos YouTube, TikTok, Instagram Reels et plus.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="form" className="gap-2"><Download size={14} /> Télécharger</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><History size={14} /> Historique</TabsTrigger>
        </TabsList>

        {/* ── Download tab ── */}
        <TabsContent value="form" className="pt-4 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* URL input */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Youtube size={18} />
              </div>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="YouTube, TikTok, Instagram Reels, ou autre URL vidéo..."
                className={cn('pl-10', url && !isValidUrl(url) && 'border-destructive/50 focus-visible:ring-destructive/30')}
              />
            </div>
            {url && !isValidUrl(url) && (
              <p className="text-xs text-destructive flex items-center gap-1 -mt-2">
                <AlertCircle size={11} /> URL invalide — doit commencer par http(s)://
              </p>
            )}

            {/* Format selector */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Format</p>
              <div className="grid grid-cols-4 gap-2">
                {FORMATS.map((f) => {
                  const Icon = f.icon
                  return (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setFormat(f.value)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-semibold transition-all',
                        format === f.value
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-muted/30 border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/50'
                      )}
                    >
                      <Icon size={18} />
                      {f.label}
                      <span className={cn(
                        'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full',
                        f.type === 'video' ? 'bg-blue-500/15 text-blue-500' : 'bg-purple-500/15 text-purple-500'
                      )}>
                        {f.type}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Quality selector (video only) */}
            {!isAudio && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Qualité</p>
                <div className="flex gap-2 flex-wrap">
                  {QUALITIES_VIDEO.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuality(q)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all',
                        quality === q
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-muted/30 border-border text-muted-foreground hover:border-primary/40'
                      )}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="text-sm font-medium text-muted-foreground">
                1 crédit par téléchargement · Solde : <span className="text-foreground font-bold">{credits}</span>
              </div>
              <Button
                type="submit"
                disabled={loading || !url.trim() || !isValidUrl(url) || credits < 1}
                size="lg"
              >
                {loading
                  ? <Loader2 size={16} className="animate-spin mr-2" />
                  : <Zap size={16} className="mr-2 fill-current" />
                }
                Télécharger
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
                    <p className="text-sm font-semibold">Préparation du téléchargement…</p>
                    <p className="text-xs text-muted-foreground">
                      {activeJob.status === 'PROCESSING'
                        ? `Récupération en ${activeJob.format.toUpperCase()}${!isAudioFormat(activeJob.format) ? ` ${activeJob.quality.replace('q', '')}` : ''}…`
                        : 'En attente de traitement…'
                      }
                    </p>
                  </div>
                </div>
              )}

              {activeJob.status === 'FAILED' && (
                <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm font-medium flex items-center gap-2">
                  <AlertCircle size={16} />
                  {activeJob.errorMsg ?? 'Le téléchargement a échoué. Votre crédit a été remboursé.'}
                </div>
              )}

              {activeJob.status === 'COMPLETED' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500">
                    <CheckCircle2 size={13} /> Prêt à télécharger · Lien valide 1h
                  </div>
                  <DownloadResult job={activeJob} />
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
                        {item.title ?? shortUrl(item.videoUrl)}
                      </span>
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-muted flex-shrink-0">
                        {item.format}
                      </span>
                      <div className="text-xs text-muted-foreground flex-shrink-0">
                        {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                      </div>
                      {item.status === 'COMPLETED' && (
                        <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs flex-shrink-0 gap-1">
                          <Link href={`/download/${item.id}`}>
                            <ExternalLink size={12} /> Voir
                          </Link>
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
