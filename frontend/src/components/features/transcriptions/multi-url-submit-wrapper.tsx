'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Plus, X, Copy, Check, ExternalLink, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { apiPost } from '@/lib/api-client'

// ─── Types ────────────────────────────────────────────────────────────────────

type Platform = 'tiktok' | 'instagram' | 'youtube' | null
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PATTERNS: Record<Exclude<Platform, null>, RegExp> = {
  tiktok: /tiktok\.com\/@[\w.]+\/video\/\d+/,
  instagram: /instagram\.com\/reel\/[\w-]+/,
  youtube: /youtube\.com\/shorts\/[\w-]+|youtu\.be\/[\w-]+/,
}

const PLATFORM_LABELS: Record<Exclude<Platform, null>, string> = {
  tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube Shorts',
}

function detectPlatform(url: string): Platform {
  for (const [p, regex] of Object.entries(PATTERNS)) {
    if (regex.test(url)) return p as Platform
  }
  return null
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function UrlRow({ job, onChange, onRemove, canRemove, disabled }: {
  job: JobEntry
  onChange: (url: string) => void
  onRemove: () => void
  canRemove: boolean
  disabled: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <div style={{ position: 'relative', flex: 1 }}>
        {job.platform && (
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10, fontWeight: 700, color: '#5E6AD2', letterSpacing: '0.06em', pointerEvents: 'none', zIndex: 1 }}>
            {PLATFORM_LABELS[job.platform]}
          </span>
        )}
        <input
          type="url"
          value={job.url}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
          placeholder="https://www.tiktok.com/@user/video/..."
          style={{
            width: '100%',
            padding: job.platform ? '9px 12px 9px 90px' : '9px 12px',
            borderRadius: 7,
            background: disabled ? '#0D0D0D' : '#111',
            border: `1px solid ${job.url && !job.platform ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`,
            color: disabled ? '#555' : '#F2F2F2',
            fontSize: 13,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>
      {canRemove && !disabled && (
        <button
          onClick={onRemove}
          style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}

function JobResult({ job, onCopy, copied }: { job: JobEntry; onCopy: (text: string) => void; copied: boolean }) {
  const [expanded, setExpanded] = useState(true)
  const hasSegments = (job.segments?.length ?? 0) > 0

  return (
    <div style={{ borderRadius: 8, background: '#111', border: `1px solid ${job.phase === 'done' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: job.phase === 'done' ? 'pointer' : 'default' }}
        onClick={() => job.phase === 'done' && setExpanded(e => !e)}>
        {job.phase === 'done'
          ? <Check size={14} color="#22C55E" />
          : job.phase === 'error'
            ? <AlertCircle size={14} color="#EF4444" />
            : <Loader2 size={14} color="#5E6AD2" className="animate-spin" />}
        <span style={{ flex: 1, fontSize: 12, color: '#8B8B8B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {shortUrl(job.url)}
        </span>
        {job.phase === 'done' && (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => job.text && onCopy(job.text)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 5, background: copied ? 'rgba(34,197,94,0.12)' : 'rgba(94,106,210,0.15)', border: 'none', color: copied ? '#22C55E' : '#5E6AD2', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
              {copied ? 'Copié' : 'Copier'}
            </button>
            {job.txId && (
              <a href={`/transcriptions/${job.txId}`}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 5, background: 'rgba(255,255,255,0.05)', color: '#8B8B8B', fontSize: 11, textDecoration: 'none' }}>
                <ExternalLink size={11} />
                Détail
              </a>
            )}
          </div>
        )}
        {job.phase === 'polling' && (
          <span style={{ fontSize: 11, color: '#5E6AD2' }}>Traitement…</span>
        )}
        {job.phase === 'submitting' && (
          <span style={{ fontSize: 11, color: '#8B8B8B' }}>Envoi…</span>
        )}
        {job.phase === 'error' && (
          <span style={{ fontSize: 11, color: '#EF4444' }}>Échoué · crédit remboursé</span>
        )}
      </div>

      {/* Expanded result */}
      {job.phase === 'done' && expanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', maxHeight: 280, overflowY: 'auto' }}>
          {hasSegments ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '6px 8px' }}>
              {job.segments!.map((seg, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '5px 8px', borderRadius: 4 }}>
                  <span style={{ fontSize: 10, color: '#5E6AD2', fontFamily: 'monospace', whiteSpace: 'nowrap', paddingTop: 2, minWidth: 36, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Clock size={9} />{formatTime(seg.start)}
                  </span>
                  <span style={{ fontSize: 13, color: '#C4C4C4', lineHeight: 1.55 }}>{seg.text}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, padding: '12px 14px', fontSize: 13, color: '#C4C4C4', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {job.text}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MultiUrlSubmitWrapper({ credits }: { credits: number }) {
  const [jobs, setJobs] = useState<JobEntry[]>([makeJob()])
  const [isRunning, setIsRunning] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Derived
  const validJobs = jobs.filter(j => j.platform)
  const activeJobs = jobs.filter(j => j.phase === 'polling' || j.phase === 'submitting')
  const allDone = isRunning && activeJobs.length === 0
  const creditCost = validJobs.length

  // ── Polling ──────────────────────────────────────────────────────────────────

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

  // Stop polling when all done
  useEffect(() => {
    if (allDone && pollingRef.current) {
      clearInterval(pollingRef.current)
    }
  }, [allDone])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const updateJob = (localId: string, url: string) => {
    setJobs(prev => prev.map(j => j.localId !== localId ? j : { ...j, url, platform: detectPlatform(url) }))
  }

  const removeJob = (localId: string) => {
    setJobs(prev => prev.filter(j => j.localId !== localId))
  }

  const addJob = () => {
    if (jobs.length < 10) setJobs(prev => [...prev, makeJob()])
  }

  const handleSubmit = useCallback(async () => {
    const valid = jobs.filter(j => j.platform && j.phase === 'idle')
    if (!valid.length) return

    setIsRunning(true)

    // Submit all valid jobs sequentially
    for (const job of valid) {
      setJobs(prev => prev.map(j => j.localId !== job.localId ? j : { ...j, phase: 'submitting' }))
      try {
        const res = await apiPost<{ id: string }>('/api/v1/transcriptions', { videoUrl: job.url })
        setJobs(prev => prev.map(j => j.localId !== job.localId ? j : { ...j, phase: 'polling', txId: res.id }))
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Erreur'
        setJobs(prev => prev.map(j => j.localId !== job.localId ? j : { ...j, phase: 'error', error: msg }))
      }
    }
  }, [jobs])

  const handleCopy = useCallback((localId: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(localId)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const reset = () => {
    setJobs([makeJob()])
    setIsRunning(false)
    setCopiedId(null)
    if (pollingRef.current) clearInterval(pollingRef.current)
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const inputJobs = jobs.filter(j => j.phase === 'idle')
  const runningOrDoneJobs = jobs.filter(j => j.phase !== 'idle')

  return (
    <div style={{ maxWidth: 640 }}>

      {/* Credit warning */}
      {credits < creditCost && validJobs.length > 0 && !isRunning && (
        <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 7, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', fontSize: 12, color: '#EF4444' }}>
          Vous avez {credits} crédit{credits !== 1 ? 's' : ''} — {creditCost - credits} vidéo{creditCost - credits > 1 ? 's' : ''} ne pourra pas être traitée.
        </div>
      )}

      {/* URL inputs (input phase) */}
      {!isRunning && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {jobs.map(job => (
            <UrlRow
              key={job.localId}
              job={job}
              onChange={url => updateJob(job.localId, url)}
              onRemove={() => removeJob(job.localId)}
              canRemove={jobs.length > 1}
              disabled={false}
            />
          ))}

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {jobs.length < 10 && (
              <button
                onClick={addJob}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 7, background: 'transparent', border: '1px dashed rgba(255,255,255,0.12)', color: '#8B8B8B', fontSize: 13, cursor: 'pointer' }}
              >
                <Plus size={14} /> Ajouter une vidéo
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={validJobs.length === 0 || credits === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 20px', borderRadius: 7,
                background: validJobs.length > 0 && credits > 0 ? '#5E6AD2' : 'rgba(94,106,210,0.3)',
                color: validJobs.length > 0 && credits > 0 ? '#fff' : '#8B8B8B',
                fontSize: 13, fontWeight: 600, border: 'none',
                cursor: validJobs.length > 0 && credits > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              {validJobs.length === 0
                ? 'Lancer'
                : validJobs.length === 1
                  ? 'Lancer (1 crédit)'
                  : `Lancer ${validJobs.length} vidéos (${Math.min(validJobs.length, credits)} crédits)`}
            </button>
          </div>
        </div>
      )}

      {/* Running + done jobs */}
      {runningOrDoneJobs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: isRunning && inputJobs.length > 0 ? 16 : 0 }}>
          {runningOrDoneJobs.map(job => (
            <JobResult
              key={job.localId}
              job={job}
              onCopy={(text) => handleCopy(job.localId, text)}
              copied={copiedId === job.localId}
            />
          ))}
        </div>
      )}

      {/* Reset button when all done */}
      {allDone && (
        <button
          onClick={reset}
          style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 7, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#8B8B8B', fontSize: 13, cursor: 'pointer' }}
        >
          <Plus size={14} /> Nouvelle série
        </button>
      )}
    </div>
  )
}
