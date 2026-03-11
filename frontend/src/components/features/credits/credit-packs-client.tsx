'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Check, Loader2 } from 'lucide-react'

interface Pack {
  id: string
  credits: number
  price: string
  label: string
  recommended?: boolean
}

export function CreditPacksClient({ packs }: { packs: readonly Pack[] }) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleBuy(packId: string) {
    setLoading(packId)
    setError(null)
    try {
      const res = await fetch('/api/v1/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId }),
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Erreur')
      const data = await res.json() as { url: string }
      window.location.href = data.url
    } catch {
      setError('Une erreur est survenue. Réessayez.')
      setLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        {packs.map((pack) => (
          <div
            key={pack.id}
            className={cn(
              "relative flex items-center justify-between p-5 rounded-2xl bg-card border transition-all duration-300",
              pack.recommended 
                ? "border-primary shadow-lg shadow-primary/5 ring-1 ring-primary/20" 
                : "border-border hover:border-primary/30"
            )}
          >
            {pack.recommended && (
              <span className="absolute -top-2.5 left-6 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded shadow-sm tracking-wider uppercase">
                Recommandé
              </span>
            )}
            <div className="space-y-1">
              <p className="text-lg font-bold text-foreground">{pack.credits} crédits</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Check size={12} className="text-emerald-500" />
                <span>{pack.credits} transcriptions</span>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-xl font-black text-foreground">{pack.price}</span>
              <button
                onClick={() => handleBuy(pack.id)}
                disabled={loading !== null}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                  loading === pack.id
                    ? "bg-primary/50 text-primary-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:scale-[1.05] active:scale-[0.95] cursor-pointer shadow-md shadow-primary/10"
                )}
              >
                {loading === pack.id ? <Loader2 size={18} className="animate-spin" /> : 'Acheter'}
              </button>
            </div>
          </div>
        ))}
      </div>
      {error && (
        <p className="mt-4 p-3 rounded-lg bg-destructive/5 text-destructive text-sm font-medium animate-in fade-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  )
}
