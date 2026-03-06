'use client'

import { useEffect, useState, useRef } from 'react'

type Status = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

interface Segment { start: number; end: number; text: string }

interface TranscriptionData {
  id: string
  status: Status
  text: string | null
  segments: Segment[] | null
  errorMsg: string | null
}

interface Step {
  label: string
  doneWhen: Status[]
  activeWhen: Status[]
}

const STEPS: Step[] = [
  { label: 'Extraction audio', doneWhen: ['PROCESSING', 'COMPLETED', 'FAILED'], activeWhen: ['PROCESSING'] },
  { label: 'Transcription Whisper-1', doneWhen: ['COMPLETED'], activeWhen: ['PROCESSING'] },
  { label: 'Sauvegarde', doneWhen: ['COMPLETED'], activeWhen: [] },
]

function StepIndicator({ step, status }: { step: Step; status: Status }) {
  const done = step.doneWhen.includes(status)
  const active = step.activeWhen.includes(status) && !done
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 16, color: done ? '#22C55E' : active ? '#5E6AD2' : '#555' }}>
        {done ? '✓' : active ? '↻' : '○'}
      </span>
      <span style={{ fontSize: 14, color: done ? '#F2F2F2' : active ? '#A5B4FC' : '#555' }}>
        {step.label}{active ? '…' : ''}
      </span>
    </div>
  )
}

interface Props {
  transcriptionId: string
  onDone: (text: string, segments: Segment[]) => void
  onError: () => void
}

export function TranscriptionStatus({ transcriptionId, onDone, onError }: Props) {
  const [data, setData] = useState<TranscriptionData | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/v1/transcriptions/${transcriptionId}`, { credentials: 'include' })
        if (!res.ok) {
          console.error('[TranscriptionStatus] poll error:', res.status)
          return
        }
        const json = await res.json() as TranscriptionData
        setData(json)
        if (json.status === 'COMPLETED') {
          clearInterval(intervalRef.current!)
          onDone(json.text ?? '', json.segments ?? [])
        } else if (json.status === 'FAILED') {
          clearInterval(intervalRef.current!)
          onError()
        }
      } catch (err) {
        console.error('[TranscriptionStatus] poll exception:', err)
      }
    }

    poll()
    intervalRef.current = setInterval(poll, 2000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [transcriptionId, onDone, onError])

  const status = data?.status ?? 'PENDING'

  return (
    <div style={{ maxWidth: 480 }}>
      <p style={{ color: '#8B8B8B', fontSize: 13, marginBottom: 20 }}>
        {status === 'PENDING' ? "En file d'attente…" : status === 'PROCESSING' ? 'Traitement en cours…' : ''}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {STEPS.map((step) => (
          <StepIndicator key={step.label} step={step} status={status} />
        ))}
      </div>
      {status === 'FAILED' && (
        <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <p style={{ color: '#EF4444', fontSize: 14, margin: 0 }}>La vidéo est peut-être privée ou le lien invalide.</p>
          <p style={{ color: '#8B8B8B', fontSize: 13, margin: '6px 0 0' }}>Votre crédit a été remboursé automatiquement.</p>
        </div>
      )}
    </div>
  )
}
