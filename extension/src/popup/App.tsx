import React, { useEffect, useState, useCallback } from 'react'
import { getToken, setToken, clearToken } from '../lib/storage'
import { apiRequest } from '../lib/api-client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface User { id: string; email: string; role: string; credits: { balance: number } }
interface LoginResponse { data: { id: string; email: string; role: string; access_token: string } }
interface MeResponse { 
  data?: { id: string; email: string; role: string; credits: { balance: number } };
  id?: string; email?: string; role?: string; credits?: { balance: number };
}
interface TranscriptionResponse { 
  data?: { id: string; status: string; text?: string };
  id?: string; status?: string; text?: string;
}

type Screen = 'loading' | 'login' | 'main'
type TxPhase = 'idle' | 'submitting' | 'polling' | 'done' | 'error'

// ─── Platform detection ───────────────────────────────────────────────────────

const PLATFORMS: { name: string; regex: RegExp }[] = [
  { name: 'TikTok', regex: /tiktok\.com\/@[\w.]+\/video\/\d+/ },
  { name: 'Instagram', regex: /instagram\.com\/reel\/[\w-]+/ },
  { name: 'YouTube Shorts', regex: /youtube\.com\/shorts\/[\w-]+|youtu\.be\/[\w-]+/ },
]

function detectPlatform(url: string): string | null {
  for (const p of PLATFORMS) {
    if (p.regex.test(url)) return p.name
  }
  return null
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  wrap: { padding: 20, background: '#0A0A0A', color: '#F2F2F2', width: 380, minHeight: 520, fontFamily: 'system-ui, sans-serif', boxSizing: 'border-box' as const },
  logo: { fontSize: 17, fontWeight: 700, color: '#5E6AD2', marginBottom: 4 },
  label: { fontSize: 12, color: '#8B8B8B', marginBottom: 6, display: 'block' },
  input: { width: '100%', padding: '9px 12px', borderRadius: 7, background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: '#F2F2F2', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const },
  btn: { width: '100%', padding: '10px 0', borderRadius: 7, background: '#5E6AD2', color: '#fff', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer', marginTop: 4 },
  btnSm: { padding: '7px 14px', borderRadius: 6, background: '#5E6AD2', color: '#fff', fontWeight: 600, fontSize: 12, border: 'none', cursor: 'pointer' },
  btnGhost: { padding: '7px 14px', borderRadius: 6, background: 'transparent', color: '#8B8B8B', fontSize: 12, border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' },
  card: { padding: '12px 14px', borderRadius: 8, background: '#111', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 10 },
  err: { color: '#EF4444', fontSize: 12, marginTop: 6 },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [currentUrl, setCurrentUrl] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [txPhase, setTxPhase] = useState<TxPhase>('idle')
  const [txId, setTxId] = useState('')
  const [txText, setTxText] = useState('')
  const [txError, setTxError] = useState('')
  const [copied, setCopied] = useState(false)

  // Load current tab URL + check auth
  useEffect(() => {
    ;(async () => {
      // Check for URL pre-filled by content script button click
      const stored = await chrome.storage.local.get('pending_url')
      const pendingUrl = stored.pending_url as string | undefined
      if (pendingUrl) {
        await chrome.storage.local.remove('pending_url')
        setCurrentUrl(pendingUrl)
        setUrlInput(pendingUrl)
      } else {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        const url = tab?.url ?? ''
        setCurrentUrl(url)
        if (detectPlatform(url)) setUrlInput(url)
      }

      const token = await getToken()
      if (!token) { setScreen('login'); return }

      try {
        const res = await apiRequest<MeResponse>('/users/me')
        const userData = res.data ?? res as User
        if (userData && 'credits' in userData) {
          setUser(userData)
          setScreen('main')
        } else {
          throw new Error('Invalid user data')
        }
      } catch {
        await clearToken()
        setScreen('login')
      }
    })()
  }, [])

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    try {
      const res = await apiRequest<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })
      await setToken(res.data.access_token)
      const meRes = await apiRequest<MeResponse>('/users/me')
      const userData = meRes.data ?? meRes as User
      if (userData) setUser(userData)
      setScreen('main')
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Erreur de connexion')
    } finally {
      setLoginLoading(false)
    }
  }, [loginEmail, loginPassword])

  const handleLogout = useCallback(async () => {
    await clearToken()
    setUser(null)
    setScreen('login')
    setTxPhase('idle')
    setTxText('')
  }, [])

  const handleSubmit = useCallback(async () => {
    const url = urlInput.trim()
    if (!url || !detectPlatform(url)) return
    setTxPhase('submitting')
    setTxError('')
    try {
      const res = await apiRequest<TranscriptionResponse>('/transcriptions', {
        method: 'POST',
        body: JSON.stringify({ videoUrl: url }), // Correct field name to match backend: videoUrl
      })
      const txData = res.data ?? res as { id: string }
      setTxId(txData.id)
      setTxPhase('polling')
    } catch (err: unknown) {
      setTxError(err instanceof Error ? err.message : 'Erreur')
      setTxPhase('error')
    }
  }, [urlInput])

  // Polling
  useEffect(() => {
    if (txPhase !== 'polling' || !txId) return
    const interval = setInterval(async () => {
      try {
        const res = await apiRequest<TranscriptionResponse>(`/transcriptions/${txId}`)
        const txData = res.data ?? res as { status: string; text?: string }
        const { status, text } = txData
        if (status === 'COMPLETED') {
          setTxText(text ?? '')
          setTxPhase('done')
          // Refresh balance
          const meRes = await apiRequest<MeResponse>('/users/me')
          const userData = meRes.data ?? meRes as User
          if (userData) setUser(userData)
          clearInterval(interval)
        } else if (status === 'FAILED') {
          setTxError('Transcription échouée — crédit remboursé')
          setTxPhase('error')
          clearInterval(interval)
        }
      } catch { /* keep polling */ }
    }, 2000)
    return () => clearInterval(interval)
  }, [txPhase, txId])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(txText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [txText])

  const handleReset = useCallback(() => {
    setTxPhase('idle')
    setTxText('')
    setTxError('')
    setTxId('')
  }, [])

  const platform = detectPlatform(urlInput)

  // ── Render ─────────────────────────────────────────────────────────────────

  if (screen === 'loading') {
    return (
      <div style={{ ...s.wrap, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#555', fontSize: 13 }}>Chargement…</span>
      </div>
    )
  }

  if (screen === 'login') {
    return (
      <div style={s.wrap}>
        <p style={s.logo}>ViralScript</p>
        <p style={{ color: '#555', fontSize: 12, marginBottom: 24 }}>Transcription instantanée de vidéos</p>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" required autoFocus value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="vous@email.com" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>Mot de passe</label>
            <input style={s.input} type="password" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {loginError && <p style={s.err}>{loginError}</p>}
          <button style={{ ...s.btn, opacity: loginLoading ? 0.6 : 1 }} type="submit" disabled={loginLoading}>
            {loginLoading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
        <p style={{ marginTop: 16, fontSize: 11, color: '#555', textAlign: 'center' }}>
          Pas de compte ?{' '}
          <a href="http://localhost:3000/register" target="_blank" rel="noreferrer" style={{ color: '#5E6AD2' }}>S'inscrire</a>
        </p>
      </div>
    )
  }

  // ── Main screen ─────────────────────────────────────────────────────────────
  return (
    <div style={s.wrap}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={s.logo}>ViralScript</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CreditBadge balance={user?.credits.balance ?? 0} />
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#555', fontSize: 11, cursor: 'pointer' }}>Déco.</button>
        </div>
      </div>

      {/* URL input */}
      {(txPhase === 'idle' || txPhase === 'error') && (
        <div style={s.card}>
          <label style={s.label}>URL de la vidéo</label>
          <input
            style={s.input}
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="https://www.tiktok.com/@..."
          />
          {urlInput && (
            <p style={{ marginTop: 6, fontSize: 11, color: platform ? '#22C55E' : '#EF4444' }}>
              {platform ? `✓ ${platform} détecté` : '✗ URL non reconnue (TikTok / Reels / Shorts)'}
            </p>
          )}
          {txPhase === 'error' && <p style={s.err}>{txError}</p>}

          {(user?.credits.balance ?? 0) === 0 ? (
            <a href="http://localhost:3000/credits" target="_blank" rel="noreferrer"
              style={{ display: 'block', marginTop: 10, textAlign: 'center', fontSize: 12, color: '#5E6AD2' }}>
              Crédits épuisés — recharger →
            </a>
          ) : (
            <button
              style={{ ...s.btn, marginTop: 12, opacity: !platform ? 0.4 : 1 }}
              disabled={!platform}
              onClick={handleSubmit}
            >
              Transcrire (1 crédit)
            </button>
          )}
        </div>
      )}

      {/* Submitting */}
      {txPhase === 'submitting' && (
        <div style={{ ...s.card, textAlign: 'center', padding: 24 }}>
          <Spinner />
          <p style={{ color: '#8B8B8B', fontSize: 13, marginTop: 10 }}>Envoi en cours…</p>
        </div>
      )}

      {/* Polling */}
      {txPhase === 'polling' && (
        <div style={{ ...s.card, padding: 20 }}>
          <ProgressSteps />
          <p style={{ color: '#8B8B8B', fontSize: 12, marginTop: 12, textAlign: 'center' }}>
            Transcription en cours… (peut prendre 30 à 60 s)
          </p>
        </div>
      )}

      {/* Done */}
      {txPhase === 'done' && (
        <div style={s.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#22C55E', fontWeight: 600 }}>✓ Transcription terminée</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={s.btnSm} onClick={handleCopy}>{copied ? '✓ Copié !' : 'Copier'}</button>
              <button style={s.btnGhost} onClick={handleReset}>Nouvelle</button>
            </div>
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto', fontSize: 12, color: '#C4C4C4', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {txText}
          </div>
          <a href={`http://localhost:3000/transcriptions/${txId}`} target="_blank" rel="noreferrer"
            style={{ display: 'block', marginTop: 10, fontSize: 11, color: '#5E6AD2', textAlign: 'right' }}>
            Voir dans l'app →
          </a>
        </div>
      )}

      {/* Info when idle and no video detected on current page */}
      {txPhase === 'idle' && !detectPlatform(currentUrl) && !urlInput && (
        <p style={{ fontSize: 11, color: '#555', textAlign: 'center', marginTop: 8 }}>
          Naviguez sur TikTok, Instagram Reels ou YouTube Shorts pour détecter automatiquement la vidéo.
        </p>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CreditBadge({ balance }: { balance: number }) {
  const color = balance === 0 ? '#EF4444' : balance <= 2 ? '#F59E0B' : '#22C55E'
  return (
    <span style={{ fontSize: 12, fontWeight: 700, color, background: `${color}18`, padding: '3px 9px', borderRadius: 12 }}>
      {balance} crédit{balance !== 1 ? 's' : ''}
    </span>
  )
}

function Spinner() {
  return (
    <div style={{ width: 28, height: 28, border: '3px solid rgba(255,255,255,0.08)', borderTop: '3px solid #5E6AD2', borderRadius: '50%', margin: '0 auto', animation: 'spin 0.8s linear infinite' }} />
  )
}

function ProgressSteps() {
  const steps = ['Téléchargement', 'Analyse audio', 'Transcription']
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
      {steps.map((step, i) => (
        <div key={step} style={{ textAlign: 'center' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: i === 0 ? '#5E6AD2' : 'rgba(255,255,255,0.06)', border: i > 0 ? '2px dashed rgba(255,255,255,0.1)' : 'none', margin: '0 auto 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
            {i === 0 ? <Spinner /> : '○'}
          </div>
          <span style={{ fontSize: 10, color: '#555' }}>{step}</span>
        </div>
      ))}
    </div>
  )
}
