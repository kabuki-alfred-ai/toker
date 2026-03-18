import React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Customization {
  fontSize: number
  color: string
  highlightColor: string
  bgColor: string
  position: number  // 0 = top, 100 = bottom
  animatedEmojis: boolean
}

interface CustomizationPanelProps {
  value: Customization
  onChange: (value: Customization) => void
  preset: string
}

export function CustomizationPanel({ value, onChange, preset }: CustomizationPanelProps) {
  const [open, setOpen] = React.useState(false)

  function update(key: keyof Customization, val: string | number) {
    onChange({ ...value, [key]: val })
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold bg-card hover:bg-accent/10 transition-colors"
      >
        <span>Personnalisation</span>
        <ChevronDown size={16} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="px-4 py-4 space-y-4 border-t border-border">
          {/* Font size */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Taille de police — {value.fontSize}px
            </label>
            <input
              type="range"
              min={16}
              max={72}
              value={value.fontSize}
              onChange={(e) => update('fontSize', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Position */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Position verticale</label>
              <span className="text-xs font-mono text-muted-foreground">{value.position}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={95}
              value={value.position}
              onChange={(e) => update('position', parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground/50">
              <span>Haut</span>
              <span>Bas</span>
            </div>
          </div>

          {/* Animated Emojis */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Emojis animés</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">Apparaissent automatiquement selon les mots</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={value.animatedEmojis}
              onClick={() => onChange({ ...value, animatedEmojis: !value.animatedEmojis })}
              className={cn(
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                value.animatedEmojis ? 'bg-primary' : 'bg-muted-foreground/30',
              )}
            >
              <span
                className={cn(
                  'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform',
                  value.animatedEmojis ? 'translate-x-4' : 'translate-x-1',
                )}
              />
            </button>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Couleur texte</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={value.color}
                  onChange={(e) => update('color', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border border-border"
                />
                <span className="text-xs font-mono text-muted-foreground">{value.color}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Surbrillance</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={value.highlightColor}
                  onChange={(e) => update('highlightColor', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border border-border"
                />
                <span className="text-xs font-mono text-muted-foreground">{value.highlightColor}</span>
              </div>
            </div>

            {(preset === 'PILL' || preset === 'OUTLINE') && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {preset === 'PILL' ? 'Fond' : 'Contour'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={value.bgColor.replace(/CC|80|FF/g, '')}
                    onChange={(e) => update('bgColor', e.target.value + 'CC')}
                    className="w-8 h-8 rounded cursor-pointer border border-border"
                  />
                  <span className="text-xs font-mono text-muted-foreground">{value.bgColor}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
