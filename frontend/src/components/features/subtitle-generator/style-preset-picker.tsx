import React from 'react'
import { cn } from '@/lib/utils'

type Preset = 'KARAOKE' | 'BOLD_SHADOW' | 'PILL' | 'OUTLINE'

interface StylePresetPickerProps {
  value: Preset
  onChange: (preset: Preset) => void
}

const PRESETS: { id: Preset; label: string; description: string }[] = [
  { id: 'KARAOKE', label: 'Karaoke', description: 'Mot actif en surbrillance' },
  { id: 'BOLD_SHADOW', label: 'Bold Shadow', description: 'Texte gras avec ombre portée' },
  { id: 'PILL', label: 'Pill', description: 'Texte sur fond arrondi coloré' },
  { id: 'OUTLINE', label: 'Outline', description: 'Texte blanc avec contour' },
]

function PresetPreview({ preset }: { preset: Preset }) {
  switch (preset) {
    case 'KARAOKE':
      return (
        <div className="flex gap-1 justify-center items-end pb-2">
          <span className="text-[10px] font-bold text-white/50">bonjour</span>
          <span className="text-[11px] font-bold text-yellow-400">monde</span>
          <span className="text-[10px] font-bold text-white/50">ici</span>
        </div>
      )
    case 'BOLD_SHADOW':
      return (
        <div className="flex justify-center items-end pb-2">
          <span className="text-[11px] font-black text-white" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.9)' }}>
            bonjour monde
          </span>
        </div>
      )
    case 'PILL':
      return (
        <div className="flex justify-center items-end pb-2">
          <span className="text-[10px] font-bold text-white bg-black/70 rounded-full px-2 py-0.5">
            bonjour monde
          </span>
        </div>
      )
    case 'OUTLINE':
      return (
        <div className="flex justify-center items-end pb-2">
          <span
            className="text-[11px] font-bold text-white"
            style={{ WebkitTextStroke: '1px #000', textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' }}
          >
            bonjour monde
          </span>
        </div>
      )
  }
}

export function StylePresetPicker({ value, onChange }: StylePresetPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onChange(preset.id)}
          className={cn(
            'rounded-xl border-2 p-3 text-left transition-all cursor-pointer',
            value === preset.id
              ? 'border-primary bg-primary/10'
              : 'border-border bg-card hover:bg-accent/10'
          )}
        >
          <div className="h-10 flex items-center justify-center bg-muted/50 rounded-lg mb-2">
            <PresetPreview preset={preset.id} />
          </div>
          <p className="text-xs font-bold text-foreground">{preset.label}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{preset.description}</p>
        </button>
      ))}
    </div>
  )
}
