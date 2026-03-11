'use client'

import { useEffect, useState, useRef } from 'react'
import { Check, Loader2, Circle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    <div className="flex items-center gap-4 animate-in slide-in-from-left-2 duration-300">
      <div className={cn(
        "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500",
        done ? "bg-emerald-500/20 text-emerald-500" : 
        active ? "bg-primary/20 text-primary" : 
        "bg-muted text-muted-foreground/30"
      )}>
        {done ? <Check size={14} strokeWidth={3} /> : 
         active ? <Loader2 size={14} className="animate-spin" /> : 
         <Circle size={10} fill="currentColor" />}
      </div>
      <span className={cn(
        "text-sm font-medium transition-colors duration-500",
        done ? "text-foreground font-bold" : 
        active ? "text-primary font-bold" : 
        "text-muted-foreground"
      )}>
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
          if (intervalRef.current) clearInterval(intervalRef.current)
          onDone(json.text ?? '', json.segments ?? [])
        } else if (json.status === 'FAILED') {
          if (intervalRef.current) clearInterval(intervalRef.current)
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
    <div className="max-w-md space-y-6">
      <div className="space-y-4 py-2">
        {STEPS.map((step) => (
          <StepIndicator key={step.label} step={step} status={status} />
        ))}
      </div>
      
      {status === 'FAILED' && (
        <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 flex gap-4 animate-in shake-1 duration-500">
          <AlertCircle size={20} className="text-destructive shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-destructive text-sm font-bold">La vidéo est peut-être privée ou le lien invalide.</p>
            <p className="text-muted-foreground text-xs font-medium">Votre crédit a été remboursé automatiquement.</p>
          </div>
        </div>
      )}
    </div>
  )
}
