'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Plus, X, Copy, Check, ExternalLink, Clock, AlertCircle, Loader2, Zap, Search } from 'lucide-react'
import { apiPost } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { PlatformIcon, detectPlatform } from '@/components/ui/platform-icon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

type Platform = 'tiktok' | 'instagram' | 'youtube' | 'unknown'
type JobPhase = 'idle' | 'submitting' | 'polling' | 'done' | 'error'

interface Segment { start: number; end: number; text: string }

interface JobEntry {
  localId: string
  url: string
  platform: Platform
  phase: JobPhase
  txId?: string
  text?: string
  segments?: Segment[]
  error?: string
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function shortUrl(url: string) {
  try {
    const u = new URL(url)
    const path = u.pathname.slice(0, 28)
    return u.hostname.replace('www.', '') + path + (u.pathname.length > 28 ? '…' : '')
  } catch { return url.slice(0, 40) }
}

let localIdCounter = 0
function newLocalId() { return `job_${++localIdCounter}` }

function makeJob(url = ''): JobEntry {
  return { localId: newLocalId(), url, platform: detectPlatform(url), phase: 'idle' }
}

function UrlRow({ job, onChange, onRemove, canRemove, disabled }: {
  job: JobEntry
  onChange: (url: string) => void
  onRemove: () => void
  canRemove: boolean
  disabled: boolean
}) {
  return (
    <div className="flex gap-3 items-center group">
      <div className="relative flex-1">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none z-10 text-muted-foreground">
          {job.platform && job.platform !== 'unknown' ? (
            <PlatformIcon platform={job.platform} size={18} />
          ) : (
            <Search size={18} />
          )}
        </div>
        <Input
          type="url"
          value={job.url}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
          placeholder="Collez l'URL ici..."
          className={cn(
            "pl-10",
            job.url && job.platform === 'unknown' && "border-destructive focus-visible:ring-destructive/20"
          )}
        />
      </div>
      {canRemove && !disabled && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/5 shrink-0"
        >
          <X size={18} />
        </Button>
      )}
    </div>
  )
}

function JobResult({ job, onCopy, copied }: { job: JobEntry; onCopy: (text: string) => void; copied: boolean }) {
  const [expanded, setExpanded] = useState(true)
  const hasSegments = (job.segments?.length ?? 0) > 0

  const statusConfig: Record<JobPhase, { icon: any; color: string; spin?: boolean }> = {
    done: { icon: Check, color: 'text-emerald-500' },
    error: { icon: AlertCircle, color: 'text-destructive' },
    polling: { icon: Loader2, color: 'text-primary', spin: true },
    submitting: { icon: Loader2, color: 'text-muted-foreground', spin: true },
    idle: { icon: Loader2, color: 'text-muted-foreground' }
  }

  const config = statusConfig[job.phase]
  const Icon = config.icon

  return (
    <Card className="overflow-hidden border bg-card shadow-sm">
      <div 
        className={cn(
          "flex items-center gap-4 p-4",
          job.phase === 'done' ? "cursor-pointer" : "cursor-default"
        )}
        onClick={() => job.phase === 'done' && setExpanded(e => !e)}
      >
        <div className={cn("p-2 rounded bg-muted/50", config.color)}>
          <Icon size={16} className={cn(config.spin && "animate-spin")} />
        </div>
        
        <span className="flex-1 text-sm font-medium text-foreground truncate">
          {shortUrl(job.url)}
        </span>

        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {job.phase === 'done' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => job.text && onCopy(job.text)}
                className={cn(copied && "text-emerald-600")}
              >
                {copied ? <Check size={14} className="mr-1.5" /> : <Copy size={14} className="mr-1.5" />}
                {copied ? 'Copié' : 'Copier'}
              </Button>
              {job.txId && (
                <Button asChild variant="ghost" size="sm">
                  <a href={`/transcriptions/${job.txId}`} className="no-underline">
                    <ExternalLink size={14} />
                  </a>
                </Button>
              )}
            </>
          )}
          
          {job.phase === 'polling' && <span className="text-xs font-medium text-primary animate-pulse">En cours…</span>}
          {job.phase === 'error' && <span className="text-xs font-medium text-destructive">Échoué</span>}
        </div>
      </div>

      {job.phase === 'done' && expanded && (
        <div className="border-t max-h-[400px] overflow-y-auto">
          {hasSegments ? (
            <div className="p-4 space-y-1">
              {job.segments!.map((seg, i) => (
                <div key={i} className="flex gap-4 p-2 rounded-md hover:bg-muted/30 transition-colors">
                  <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-primary shrink-0 opacity-70">
                    <Clock size={10} />
                    {formatTime(seg.start)}
                  </span>
                  <p className="text-sm text-foreground leading-relaxed">{seg.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {job.text}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

export function MultiUrlSubmitWrapper({ credits }: { credits: number }) {
  const [jobs, setJobs] = useState<JobEntry[]>([makeJob()])
  const [isRunning, setIsRunning] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const validJobs = jobs.filter(j => j.url.trim() && j.platform && j.platform !== 'unknown')
  const allJobsValid = jobs.length > 0 && jobs.every(j => j.url.trim() && j.platform && j.platform !== 'unknown')
  const activeJobs = jobs.filter(j => j.phase === 'polling' || j.phase === 'submitting')
  const allDone = isRunning && activeJobs.length === 0
  const creditCost = validJobs.length

  useEffect(() => {
    if (!isRunning) return
    const poll = async () => {
      const toPoll = jobs.filter(j => j.phase === 'polling' && j.txId)
      if (toPoll.length === 0) return

      await Promise.all(toPoll.map(async (job) => {
        try {
          const res = await fetch(`/api/v1/transcriptions/${job.txId}`, { credentials: 'include' })
          if (!res.ok) return
          const data = await res.json() as { status: string; text?: string; segments?: Segment[] }
          if (data.status === 'COMPLETED' || data.status === 'FAILED') {
            setJobs(prev => prev.map(j => j.localId !== job.localId ? j : {
              ...j,
              phase: data.status === 'COMPLETED' ? 'done' : 'error',
              text: data.text,
              segments: data.segments ?? [],
            }))
          }
        } catch { /* keep polling */ }
      }))
    }
    pollingRef.current = setInterval(poll, 2000)
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [isRunning, jobs])

  useEffect(() => {
    if (allDone && pollingRef.current) clearInterval(pollingRef.current)
  }, [allDone])

  const updateJob = (localId: string, url: string) => {
    setJobs(prev => prev.map(j => j.localId !== localId ? j : { ...j, url, platform: detectPlatform(url) as Platform }))
  }

  const removeJob = (localId: string) => setJobs(prev => prev.filter(j => j.localId !== localId))
  const addJob = () => { if (jobs.length < 10) setJobs(prev => [...prev, makeJob()]) }

  const handleSubmit = useCallback(async () => {
    const valid = jobs.filter(j => j.url.trim() && j.platform && j.platform !== 'unknown' && j.phase === 'idle')
    if (!valid.length) return
    setIsRunning(true)
    for (const job of valid) {
      setJobs(prev => prev.map(j => j.localId !== job.localId ? j : { ...j, phase: 'submitting' }))
      try {
        const res = await apiPost<{ id: string }>('/api/v1/transcriptions', { videoUrl: job.url })
        setJobs(prev => prev.map(j => j.localId !== job.localId ? j : { ...j, phase: 'polling', txId: res.id }))
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erreur'
        setJobs(prev => prev.map(j => j.localId !== job.localId ? j : { ...j, phase: 'error', error: msg }))
      }
    }
  }, [jobs])

  const handleCopy = useCallback((localId: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(localId)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const reset = () => {
    setJobs([makeJob()])
    setIsRunning(false)
    setCopiedId(null)
    if (pollingRef.current) clearInterval(pollingRef.current)
  }

  const runningOrDoneJobs = jobs.filter(j => j.phase !== 'idle')

  return (
    <div className="space-y-6">
      {credits < creditCost && validJobs.length > 0 && !isRunning && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm font-medium flex items-center gap-2">
          <AlertCircle size={16} /> Solde insuffisant.
        </div>
      )}

      {!isRunning && (
        <div className="space-y-4">
          <div className="space-y-3">
            {jobs.map((job) => (
              <UrlRow
                key={job.localId}
                job={job}
                onChange={url => updateJob(job.localId, url)}
                onRemove={() => removeJob(job.localId)}
                canRemove={jobs.length > 1}
                disabled={false}
              />
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            {jobs.length < 10 && (
              <Button variant="outline" size="lg" onClick={addJob} className="border-dashed w-full sm:w-auto">
                <Plus size={16} className="mr-2" /> Ajouter
              </Button>
            )}
            <Button size="lg" onClick={handleSubmit} disabled={!allJobsValid || credits < 1} className="w-full sm:flex-1">
              <Zap size={16} className="mr-2 fill-current" />
              Transcrire ({validJobs.length})
            </Button>
          </div>
        </div>
      )}

      {runningOrDoneJobs.length > 0 && (
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Traitement</h3>
              <span className="text-xs font-medium text-muted-foreground">
                {activeJobs.length > 0 ? `${activeJobs.length} en cours` : 'Terminé'}
              </span>
          </div>
          <div className="grid gap-3">
            {runningOrDoneJobs.map(job => (
              <JobResult key={job.localId} job={job} onCopy={(text) => handleCopy(job.localId, text)} copied={copiedId === job.localId} />
            ))}
          </div>
        </div>
      )}

      {allDone && (
        <div className="pt-4 text-center">
          <Button onClick={reset} variant="outline" size="sm">
            <Plus size={14} className="mr-2" /> Nouveau
          </Button>
        </div>
      )}
    </div>
  )
}
