'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Captions, Loader2, AlertCircle, Zap, History,
  CheckCircle2, Download, RefreshCw, Link2, Play, X, ArrowLeft, Pencil, Upload, ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { StylePresetPicker } from './style-preset-picker'
import { CustomizationPanel } from './customization-panel'
import { SubtitlePreview } from './subtitle-preview'
import { buildChunks, type WordSegment } from './chunk-utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type GenerationStatus = 'PENDING' | 'TRANSCRIBING' | 'TRANSCRIBED' | 'RENDERING' | 'COMPLETED' | 'FAILED'
type Preset = 'KARAOKE' | 'BOLD_SHADOW' | 'PILL' | 'OUTLINE'

interface GenerationJob {
  id: string
  status: GenerationStatus
  videoUrl: string
  preset: Preset
  wordSegments?: WordSegment[]
  customization?: Partial<Customization>
  fileUrl: string | null
  inputFileUrl: string | null
  errorMsg: string | null
  createdAt: string
}

interface Customization {
  fontSize: number
  color: string
  highlightColor: string
  bgColor: string
  position: number  // 0 = top, 100 = bottom
  animatedEmojis: boolean
}

type ClientStep = 'FORM' | 'TRANSCRIBING' | 'EDITOR' | 'RENDERING' | 'DONE'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<GenerationStatus, string> = {
  PENDING: 'En attente',
  TRANSCRIBING: 'Transcription',
  TRANSCRIBED: 'Prêt',
  RENDERING: 'Rendu',
  COMPLETED: 'Terminé',
  FAILED: 'Échoué',
}

const STATUS_COLORS: Record<GenerationStatus, string> = {
  PENDING: 'bg-muted text-muted-foreground',
  TRANSCRIBING: 'bg-blue-500/15 text-blue-500',
  TRANSCRIBED: 'bg-violet-500/15 text-violet-500',
  RENDERING: 'bg-amber-500/15 text-amber-500',
  COMPLETED: 'bg-emerald-500/15 text-emerald-500',
  FAILED: 'bg-destructive/15 text-destructive',
}

const DEFAULT_CUSTOMIZATION: Customization = {
  fontSize: 48,
  color: '#FFFFFF',
  highlightColor: '#FFE600',
  bgColor: '#000000CC',
  position: 82,
  animatedEmojis: false,
}

function shortUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace('www.', '') + u.pathname.slice(0, 30)
  } catch { return url.slice(0, 42) }
}

/** Extract the first https URL from a pasted string (handles TikTok mobile share text) */
function extractUrl(text: string): string {
  const trimmed = text.trim()
  // If it already looks like a bare URL, return as-is
  if (/^https?:\/\//i.test(trimmed) && !trimmed.includes(' ')) return trimmed
  // Extract first URL from mixed text (e.g. TikTok share: "Check @user #fyp https://vm.tiktok.com/xxx")
  const match = trimmed.match(/https?:\/\/[^\s]+/i)
  return match ? match[0].replace(/[.,!?)"']+$/, '') : trimmed
}

// ─── Chunk helpers ─────────────────────────────────────────────────────────────

/** Update words in a chunk with new text, distributing timing evenly */
function applyChunkEdit(segments: WordSegment[], chunkStartIndex: number, chunkLength: number, newText: string): WordSegment[] {
  const newWords = newText.trim().split(/\s+/).filter(Boolean)
  if (!newWords.length) return segments

  const origChunk = segments.slice(chunkStartIndex, chunkStartIndex + chunkLength)
  const chunkStart = origChunk[0]?.start ?? 0
  const chunkEnd = origChunk[origChunk.length - 1]?.end ?? chunkStart + 1
  const wordDuration = (chunkEnd - chunkStart) / newWords.length

  const newSegments = newWords.map((w, i) => ({
    word: w,
    punctuated_word: w,
    start: chunkStart + i * wordDuration,
    end: chunkStart + (i + 1) * wordDuration,
  }))

  return [
    ...segments.slice(0, chunkStartIndex),
    ...newSegments,
    ...segments.slice(chunkStartIndex + chunkLength),
  ]
}

// ─── Subtitle Text Editor ─────────────────────────────────────────────────────

function SubtitleTextEditor({ segments, onChange }: { segments: WordSegment[]; onChange: (s: WordSegment[]) => void }) {
  const chunks = buildChunks(segments)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')

  function startEdit(i: number, text: string) {
    setEditingIdx(i)
    setEditValue(text)
  }

  function commitEdit(i: number) {
    const chunk = chunks[i]
    const updated = applyChunkEdit(segments, chunk.startIndex, chunk.words.length, editValue)
    onChange(updated)
    setEditingIdx(null)
  }

  return (
    <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
      {chunks.map((chunk, i) => {
        const text = chunk.words.map((w) => w.punctuated_word).join(' ')
        const timeLabel = `${chunk.words[0].start.toFixed(1)}s`
        return (
          <div key={i} className="group flex items-start gap-2">
            <span className="text-[10px] text-muted-foreground/50 mt-2 w-10 shrink-0 font-mono">{timeLabel}</span>
            {editingIdx === i ? (
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => commitEdit(i)}
                onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(i); if (e.key === 'Escape') setEditingIdx(null) }}
                className="flex-1 text-sm px-2 py-1 rounded border border-primary bg-background outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => startEdit(i, text)}
                className="flex-1 text-left text-sm px-2 py-1 rounded hover:bg-accent/20 transition-colors group flex items-center gap-2"
              >
                <span className="flex-1">{text}</span>
                <Pencil size={11} className="opacity-0 group-hover:opacity-50 shrink-0" />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Video modal (history) ────────────────────────────────────────────────────

function VideoModal({ job, onClose }: { job: GenerationJob; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <p className="text-sm font-semibold truncate max-w-[80%]">{shortUrl(job.videoUrl)}</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <video src={job.fileUrl!} controls className="w-full rounded-lg bg-black aspect-video" />
          <div className="flex justify-end">
            <a href={job.fileUrl!} download className="inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors no-underline">
              <Download size={14} /> Télécharger
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main client ──────────────────────────────────────────────────────────────

function jobToStep(status: GenerationStatus): ClientStep {
  if (status === 'TRANSCRIBED') return 'EDITOR'
  if (status === 'COMPLETED') return 'DONE'
  if (status === 'RENDERING') return 'RENDERING'
  if (status === 'TRANSCRIBING' || status === 'PENDING') return 'TRANSCRIBING'
  return 'FORM'
}

export function SubtitleGeneratorClient({
  credits,
  history: initialHistory,
  initialJob,
}: {
  credits: number
  history: GenerationJob[]
  initialJob?: GenerationJob
}) {
  const router = useRouter()
  const [inputMode, setInputMode] = useState<'url' | 'file'>('url')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [preset, setPreset] = useState<Preset>(() => initialJob?.preset ?? 'KARAOKE')
  const [customization, setCustomization] = useState<Customization>(() =>
    initialJob?.customization ? { ...DEFAULT_CUSTOMIZATION, ...initialJob.customization } : DEFAULT_CUSTOMIZATION
  )
  const [wordSegments, setWordSegments] = useState<WordSegment[]>(() =>
    (initialJob?.wordSegments as WordSegment[]) ?? []
  )
  const [step, setStep] = useState<ClientStep>(() => initialJob ? jobToStep(initialJob.status) : 'FORM')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeJob, setActiveJob] = useState<GenerationJob | null>(() => initialJob ?? null)
  const [history, setHistory] = useState(initialHistory)
  const [activeTab, setActiveTab] = useState('form')
  const [selectedJob, setSelectedJob] = useState<GenerationJob | null>(null)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }
  useEffect(() => () => stopPolling(), [])

  // Auto-start polling when resuming an in-progress job
  useEffect(() => {
    if (initialJob && ['PENDING', 'TRANSCRIBING', 'RENDERING'].includes(initialJob.status)) {
      startPolling(initialJob.id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startPolling = useCallback((id: string) => {
    stopPolling()
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/v1/subtitle-generator/${id}`, { credentials: 'include' })
      if (!res.ok) return
      const data: GenerationJob = await res.json()
      setActiveJob(data)

      if (data.status === 'TRANSCRIBED') {
        stopPolling()
        const segs = (data.wordSegments ?? []) as WordSegment[]
        setWordSegments(segs)
        setPreset(data.preset ?? 'KARAOKE')
        setStep('EDITOR')
      } else if (data.status === 'COMPLETED') {
        stopPolling()
        setStep('DONE')
        setHistory((prev) =>
          prev.some((h) => h.id === id) ? prev.map((h) => h.id === id ? data : h) : [data, ...prev]
        )
      } else if (data.status === 'FAILED') {
        stopPolling()
        setStep('FORM')
        setError(data.errorMsg ?? 'Traitement échoué. Crédit remboursé.')
      }
    }, 3000)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/v1/subtitle-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ videoUrl: url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Erreur serveur')
      setActiveJob({ id: data.id, status: 'PENDING', videoUrl: url, preset: 'KARAOKE', fileUrl: null, inputFileUrl: null, errorMsg: null, createdAt: new Date().toISOString() })
      setStep('TRANSCRIBING')
      startPolling(data.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur serveur')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitFile(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setError(null)
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/v1/subtitle-generator/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Erreur serveur')
      setActiveJob({ id: data.id, status: 'PENDING', videoUrl: `upload://${file.name}`, preset: 'KARAOKE', fileUrl: null, inputFileUrl: null, errorMsg: null, createdAt: new Date().toISOString() })
      setStep('TRANSCRIBING')
      startPolling(data.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur serveur')
    } finally {
      setLoading(false)
    }
  }

  async function handleRender() {
    if (!activeJob) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/subtitle-generator/${activeJob.id}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ preset, customization, wordSegments }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Erreur serveur')
      setStep('RENDERING')
      startPolling(activeJob.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur serveur')
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    stopPolling()
    if (initialJob) {
      router.push('/subtitle-generator')
      return
    }
    setStep('FORM')
    setActiveJob(null)
    setWordSegments([])
    setUrl('')
    setFile(null)
    setError(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground font-albert">Auto Subtitles</h1>
        <p className="text-muted-foreground">Générez des sous-titres animés style Submagic sur vos vidéos.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="form" className="gap-2"><Captions size={14} /> Générer</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><History size={14} /> Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="form" className="pt-4">

          {/* ── FORM ── */}
          {step === 'FORM' && (
            <div className="max-w-xl space-y-4">
              {/* Mode toggle */}
              <div className="flex rounded-lg border border-border overflow-hidden text-xs font-semibold w-fit">
                <button
                  type="button"
                  onClick={() => setInputMode('url')}
                  className={cn('flex items-center gap-1.5 px-4 py-2 transition-colors', inputMode === 'url' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-accent/10')}
                >
                  <Link2 size={13} /> URL
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('file')}
                  className={cn('flex items-center gap-1.5 px-4 py-2 transition-colors border-l border-border', inputMode === 'file' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-accent/10')}
                >
                  <Upload size={13} /> Fichier
                </button>
              </div>

              {inputMode === 'url' ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><Link2 size={18} /></div>
                    <Input
                      value={url}
                      onChange={(e) => setUrl(extractUrl(e.target.value))}
                      onPaste={(e) => {
                        e.preventDefault()
                        const pasted = e.clipboardData.getData('text')
                        setUrl(extractUrl(pasted))
                      }}
                      placeholder="https://... (TikTok, Instagram, YouTube)"
                      className="pl-10"
                    />
                  </div>
                  {error && (
                    <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm font-medium flex items-center gap-2">
                      <AlertCircle size={16} /> {error}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm font-medium text-muted-foreground">
                      1 crédit · Solde : <span className="text-foreground font-bold">{credits}</span>
                    </div>
                    <Button type="submit" disabled={loading || !url.trim() || credits < 1} size="lg">
                      {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Zap size={16} className="mr-2 fill-current" />}
                      Analyser
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSubmitFile} className="space-y-4">
                  <label
                    className={cn(
                      'flex flex-col items-center justify-center gap-3 w-full h-36 rounded-xl border-2 border-dashed cursor-pointer transition-colors',
                      dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-accent/5',
                    )}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragOver(false)
                      const dropped = e.dataTransfer.files[0]
                      if (dropped) setFile(dropped)
                    }}
                  >
                    <input
                      type="file"
                      accept="video/*"
                      className="sr-only"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                    {file ? (
                      <>
                        <CheckCircle2 size={28} className="text-primary" />
                        <div className="text-center">
                          <p className="text-sm font-semibold truncate max-w-[280px]">{file.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{(file.size / 1024 / 1024).toFixed(1)} Mo</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload size={28} className="text-muted-foreground/50" />
                        <div className="text-center">
                          <p className="text-sm font-semibold text-muted-foreground">Glisser-déposer ou cliquer</p>
                          <p className="text-xs text-muted-foreground/60 mt-0.5">MP4, MOV, AVI… jusqu'à 500 Mo</p>
                        </div>
                      </>
                    )}
                  </label>
                  {error && (
                    <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm font-medium flex items-center gap-2">
                      <AlertCircle size={16} /> {error}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm font-medium text-muted-foreground">
                      1 crédit · Solde : <span className="text-foreground font-bold">{credits}</span>
                    </div>
                    <Button type="submit" disabled={loading || !file || credits < 1} size="lg">
                      {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Zap size={16} className="mr-2 fill-current" />}
                      Analyser
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ── TRANSCRIBING ── */}
          {step === 'TRANSCRIBING' && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 size={40} className="animate-spin text-primary" />
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold">
                  {activeJob?.status === 'TRANSCRIBING' ? 'Transcription en cours…' : 'Téléchargement de la vidéo…'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {activeJob?.status === 'TRANSCRIBING' ? 'Analyse audio mot par mot' : 'Extraction depuis la plateforme'}
                </p>
              </div>
            </div>
          )}

          {/* ── EDITOR ── */}
          {step === 'EDITOR' && activeJob && (
            <div className="space-y-4">
              {/* Top bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={handleReset} className="text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft size={16} />
                  </button>
                  <div className="flex items-center gap-2 text-xs font-semibold text-violet-500">
                    <CheckCircle2 size={13} /> {wordSegments.length} mots transcrits
                  </div>
                </div>
                <Button onClick={handleRender} disabled={loading} size="sm">
                  {loading ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Zap size={14} className="mr-1.5 fill-current" />}
                  Générer le MP4
                </Button>
              </div>

              {error && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm font-medium flex items-center gap-2">
                  <AlertCircle size={15} /> {error}
                </div>
              )}

              {/* Three-column layout */}
              <div className="grid grid-cols-1 lg:grid-cols-[320px_280px_280px] gap-6 items-start">

                {/* COL 1 — Preview */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aperçu en direct</p>
                  <SubtitlePreview
                    videoSrc={activeJob.inputFileUrl ?? ''}
                    wordSegments={wordSegments}
                    preset={preset}
                    customization={customization}
                  />
                </div>

                {/* COL 2 — Text editing */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sous-titres</p>
                  <p className="text-xs text-muted-foreground">Cliquez sur un segment pour le modifier.</p>
                  <SubtitleTextEditor segments={wordSegments} onChange={setWordSegments} />
                </div>

                {/* COL 3 — Style */}
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Style</p>
                  <StylePresetPicker value={preset} onChange={setPreset} />
                  <CustomizationPanel value={customization} onChange={setCustomization} preset={preset} />
                </div>
              </div>
            </div>
          )}

          {/* ── RENDERING ── */}
          {step === 'RENDERING' && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 size={40} className="animate-spin text-primary" />
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold">Rendu Remotion en cours…</p>
                <p className="text-xs text-muted-foreground">Composition de la vidéo finale</p>
              </div>
            </div>
          )}

          {/* ── DONE ── */}
          {step === 'DONE' && activeJob?.fileUrl && (
            <div className="max-w-xl space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500">
                <CheckCircle2 size={13} /> Vidéo prête
              </div>
              <Card>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{shortUrl(activeJob.videoUrl)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Preset : {activeJob.preset}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={handleReset} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border hover:bg-accent/10 transition-colors">
                      Nouvelle vidéo
                    </button>
                    <a href={activeJob.fileUrl} download className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors no-underline">
                      <Download size={12} /> Télécharger
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ── HISTORY ── */}
        <TabsContent value="history" className="pt-4">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {history.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">Historique vide.</div>
              ) : (
                <div className="divide-y">
                  {history.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
                      <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0', STATUS_COLORS[item.status])}>
                        {(item.status === 'TRANSCRIBING' || item.status === 'RENDERING') && <RefreshCw size={9} className="inline mr-0.5 animate-spin" />}
                        {STATUS_LABELS[item.status]}
                      </span>
                      <span className="flex-1 text-sm font-medium truncate">{shortUrl(item.videoUrl)}</span>
                      <div className="text-xs text-muted-foreground flex-shrink-0">
                        {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.status === 'COMPLETED' && item.fileUrl && (
                          <button type="button" onClick={() => setSelectedJob(item)} className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded bg-muted hover:bg-accent transition-colors">
                            <Play size={11} /> Voir
                          </button>
                        )}
                        {item.status === 'TRANSCRIBED' && (
                          <Link href={`/subtitle-generator/${item.id}`} className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded bg-violet-500/15 text-violet-500 hover:bg-violet-500/25 transition-colors no-underline">
                            <Pencil size={11} /> Reprendre
                          </Link>
                        )}
                        {(item.status === 'PENDING' || item.status === 'TRANSCRIBING' || item.status === 'RENDERING') && (
                          <Link href={`/subtitle-generator/${item.id}`} className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded bg-muted hover:bg-accent transition-colors no-underline">
                            <ExternalLink size={11} /> Suivi
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedJob && <VideoModal job={selectedJob} onClose={() => setSelectedJob(null)} />}
    </div>
  )
}
