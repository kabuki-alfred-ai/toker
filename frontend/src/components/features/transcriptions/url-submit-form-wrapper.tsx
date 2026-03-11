'use client'

import { useState, useCallback, useRef } from 'react'
import { Clock, Copy, Plus, ExternalLink, Check, Loader2, AlertCircle } from 'lucide-react'
import { UrlSubmitForm } from './url-submit-form'
import { TranscriptionStatus } from './transcription-status'
import { cn } from '@/lib/utils'

type Phase = 'idle' | 'polling' | 'done' | 'error'

interface Segment { start: number; end: number; text: string }

interface Props {
  credits: number
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function UrlSubmitFormWrapper({ credits }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [transcriptionId, setTranscriptionId] = useState<string | null>(null)
  const [completedText, setCompletedText] = useState<string | null>(null)
  const [segments, setSegments] = useState<Segment[]>([])
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSubmitted = useCallback((id: string) => {
    setTranscriptionId(id)
    setPhase('polling')
  }, [])

  const handleDone = useCallback((text: string, segs: Segment[]) => {
    setCompletedText(text)
    setSegments(segs)
    setPhase('done')
  }, [])

  const handleError = useCallback(() => {
    setPhase('error')
  }, [])

  const reset = () => {
    setPhase('idle')
    setTranscriptionId(null)
    setCompletedText(null)
    setSegments([])
    setCopied(false)
  }

  const handleCopy = useCallback(async () => {
    if (!completedText) return
    await navigator.clipboard.writeText(completedText)
    setCopied(true)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied(false), 2000)
  }, [completedText])

  if (phase === 'polling' && transcriptionId) {
    return (
      <div className="max-w-2xl animate-in fade-in duration-500">
        <h1 className="text-xl font-bold text-foreground mb-6 flex items-center gap-3">
          <Loader2 size={24} className="animate-spin text-primary" />
          Transcription en cours
        </h1>
        <TranscriptionStatus
          transcriptionId={transcriptionId}
          onDone={handleDone}
          onError={handleError}
        />
      </div>
    )
  }

  if (phase === 'done' && completedText !== null) {
    const hasSegments = segments.length > 0
    return (
      <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Check size={24} />
            </div>
            Transcription terminée
          </h1>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCopy}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg",
                copied 
                  ? "bg-emerald-500 text-white shadow-emerald-500/20" 
                  : "bg-primary text-primary-foreground shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
              )}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copié !' : 'Copier'}
            </button>
            <button
              onClick={reset}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-card border border-border text-sm font-bold text-muted-foreground hover:text-foreground transition-all active:scale-[0.98]"
            >
              <Plus size={16} />
              Nouvelle
            </button>
            {transcriptionId && (
              <a
                href={`/transcriptions/${transcriptionId}`}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-card border border-border text-sm font-bold text-muted-foreground hover:text-foreground no-underline transition-all"
              >
                <span>Voir détail</span>
                <ExternalLink size={16} />
              </a>
            )}
          </div>
        </div>

        {hasSegments ? (
          <div className="space-y-1 max-h-[500px] overflow-y-auto p-2 bg-card/30 rounded-2xl border border-border/50">
            {segments.map((seg, i) => (
              <div key={i} className="flex gap-5 p-4 rounded-xl hover:bg-background/50 transition-colors">
                <span className="flex items-center gap-1.5 text-xs font-bold text-primary font-mono shrink-0 h-fit mt-0.5 px-2 py-0.5 rounded bg-primary/10">
                  <Clock size={12} />
                  {formatTime(seg.start)}
                </span>
                <p className="text-sm text-foreground leading-relaxed">
                  {seg.text}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-card border border-border text-sm text-foreground leading-relaxed whitespace-pre-wrap shadow-sm">
            {completedText}
          </div>
        )}
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="max-w-2xl animate-in zoom-in-95 duration-300">
        <div className="p-6 rounded-2xl bg-destructive/5 border border-destructive/20 flex gap-4">
          <AlertCircle size={24} className="text-destructive shrink-0 mt-1" />
          <div>
            <p className="text-destructive font-bold mb-1">La transcription a échoué.</p>
            <p className="text-sm text-muted-foreground mb-4">Votre crédit a été remboursé automatiquement.</p>
            <button 
              onClick={reset} 
              className="px-6 py-2 rounded-xl bg-destructive/10 text-destructive text-sm font-bold hover:bg-destructive/20 transition-all active:scale-[0.98]"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <UrlSubmitForm credits={credits} onSubmitted={handleSubmitted} />
}
