'use client'

import { useState } from 'react'

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
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {packs.map((pack) => (
          <div
            key={pack.id}
            className="mobile-stack"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderRadius: 10,
              background: '#111111',
              border: `1px solid ${pack.recommended ? 'rgba(94,106,210,0.5)' : 'rgba(255,255,255,0.06)'}`,
              position: 'relative',
              gap: 16,
            }}
          >
            {pack.recommended && (
              <span style={{ position: 'absolute', top: -10, left: 16, background: '#5E6AD2', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.05em' }}>
                RECOMMANDÉ
              </span>
            )}
            <div>
              <p style={{ color: '#F2F2F2', fontSize: 16, fontWeight: 600, margin: 0 }}>{pack.credits} crédits</p>
              <p style={{ color: '#8B8B8B', fontSize: 13, margin: '2px 0 0' }}>{pack.credits} transcriptions</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ color: '#F2F2F2', fontSize: 18, fontWeight: 600 }}>{pack.price}</span>
              <button
                onClick={() => handleBuy(pack.id)}
                disabled={loading !== null}
                style={{
                  padding: '8px 18px',
                  borderRadius: 6,
                  background: loading === pack.id ? 'rgba(94,106,210,0.5)' : '#5E6AD2',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 500,
                  border: 'none',
                  cursor: loading !== null ? 'not-allowed' : 'pointer',
                }}
              >
                {loading === pack.id ? '...' : 'Acheter'}
              </button>
            </div>
          </div>
        ))}
      </div>
      {error && <p style={{ marginTop: 12, fontSize: 13, color: '#EF4444' }}>{error}</p>}
    </div>
  )
}
