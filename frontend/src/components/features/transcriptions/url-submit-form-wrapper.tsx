'use client'

import { useState, useCallback, useRef } from 'react'
import { Clock, Copy, Plus, ExternalLink, Check, Loader2, AlertCircle } from 'lucide-react'
import { UrlSubmitForm } from './url-submit-form'
import { TranscriptionStatus } from './transcription-status'

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
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#F2F2F2', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Loader2 size={24} className="animate-spin" color="#5E6AD2" />
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
      <div style={{ maxWidth: 640 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#F2F2F2', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Check size={24} color="#22C55E" />
            Transcription terminée
          </h1>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleCopy}
              style={{
                background: copied ? 'rgba(34,197,94,0.15)' : '#5E6AD2',
                border: 'none', borderRadius: 6,
                color: copied ? '#22C55E' : '#fff',
                fontSize: 13, fontWeight: 500,
                padding: '7px 16px', cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copié !' : 'Copier'}
            </button>
            <button
              onClick={reset}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 6,
                color: '#8B8B8B',
                fontSize: 13,
                padding: '7px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'background 0.15s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Plus size={14} />
              Nouvelle
            </button>
            {transcriptionId && (
              <a
                href={`/transcriptions/${transcriptionId}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#8B8B8B',
                  fontSize: 13,
                  textDecoration: 'none',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span>Voir détail</span>
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>

        {hasSegments ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 440, overflowY: 'auto' }}>
            {segments.map((seg, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, padding: '8px 14px', borderRadius: 6, background: '#111111', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: 11, color: '#5E6AD2', fontFamily: 'monospace', whiteSpace: 'nowrap', paddingTop: 2, minWidth: 42, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={10} />
                  {formatTime(seg.start)}
                </span>
                <span style={{ fontSize: 14, color: '#E5E5E5', lineHeight: 1.6 }}>{seg.text}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '20px 24px', borderRadius: 8, background: '#111111', border: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'pre-wrap', color: '#F2F2F2', fontSize: 14, lineHeight: 1.7, maxHeight: 400, overflowY: 'auto' }}>
            {completedText}
          </div>
        )}
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div style={{ maxWidth: 640 }}>
        <div style={{ padding: '16px 20px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', gap: 12 }}>
          <AlertCircle size={20} color="#EF4444" style={{ marginTop: 2 }} />
          <div>
            <p style={{ color: '#EF4444', fontSize: 14, margin: 0, fontWeight: 500 }}>La transcription a échoué.</p>
            <p style={{ color: '#8B8B8B', fontSize: 13, margin: '6px 0 0' }}>Votre crédit a été remboursé automatiquement.</p>
          </div>
        </div>
        <button onClick={reset} style={{ marginTop: 16, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#8B8B8B', fontSize: 13, padding: '6px 14px', cursor: 'pointer', transition: 'background 0.15s' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
          Réessayer
        </button>
      </div>
    )
  }

  return <UrlSubmitForm credits={credits} onSubmitted={handleSubmitted} />
}
