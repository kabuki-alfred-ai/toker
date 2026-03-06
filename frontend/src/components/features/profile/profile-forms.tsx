'use client'

import { useState } from 'react'
import { Check, AlertCircle, Loader2 } from 'lucide-react'

// ─── Shared primitives ─────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, color: '#8B8B8B', fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: '#0A0A0A',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 6,
  padding: '9px 12px',
  color: '#F2F2F2',
  fontSize: 14,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

function StatusBanner({ type, msg }: { type: 'success' | 'error'; msg: string }) {
  const isSuccess = type === 'success'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 6,
      background: isSuccess ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
      border: `1px solid ${isSuccess ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
      fontSize: 13, color: isSuccess ? '#22C55E' : '#EF4444',
    }}>
      {isSuccess ? <Check size={14} /> : <AlertCircle size={14} />}
      {msg}
    </div>
  )
}

function SaveButton({ loading, label = 'Enregistrer' }: { loading: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 18px', borderRadius: 6, background: '#5E6AD2', color: '#fff',
        fontSize: 13, fontWeight: 500, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s',
      }}
    >
      {loading && <Loader2 size={13} className="animate-spin" />}
      {label}
    </button>
  )
}

// ─── Profile form ───────────────────────────────────────────────────────────────

export function ProfileInfoForm({ initial }: { initial: { firstName: string | null; lastName: string | null } }) {
  const [firstName, setFirstName] = useState(initial.firstName ?? '')
  const [lastName, setLastName] = useState(initial.lastName ?? '')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch('/api/v1/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim() }),
      })
      if (!res.ok) throw new Error('Erreur serveur')
      setStatus({ type: 'success', msg: 'Profil mis à jour.' })
    } catch {
      setStatus({ type: 'error', msg: 'Une erreur est survenue.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Prénom">
          <input style={inputStyle} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Prénom" />
        </Field>
        <Field label="Nom">
          <input style={inputStyle} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Nom" />
        </Field>
      </div>
      {status && <StatusBanner {...status} />}
      <SaveButton loading={loading} />
    </form>
  )
}

// ─── Email form ─────────────────────────────────────────────────────────────────

export function EmailForm({ currentEmail }: { currentEmail: string }) {
  const [email, setEmail] = useState(currentEmail)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch('/api/v1/users/me/email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, currentPassword: password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Erreur serveur')
      setStatus({ type: 'success', msg: 'Email mis à jour.' })
      setPassword('')
    } catch (err) {
      setStatus({ type: 'error', msg: err instanceof Error ? err.message : 'Erreur serveur' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label="Nouvel email">
        <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} required />
      </Field>
      <Field label="Mot de passe actuel (confirmation)">
        <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
      </Field>
      {status && <StatusBanner {...status} />}
      <SaveButton loading={loading} label="Changer l'email" />
    </form>
  )
}

// ─── Password form ──────────────────────────────────────────────────────────────

export function PasswordForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (next !== confirm) {
      setStatus({ type: 'error', msg: 'Les mots de passe ne correspondent pas.' })
      return
    }
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch('/api/v1/users/me/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Erreur serveur')
      setStatus({ type: 'success', msg: 'Mot de passe mis à jour.' })
      setCurrent(''); setNext(''); setConfirm('')
    } catch (err) {
      setStatus({ type: 'error', msg: err instanceof Error ? err.message : 'Erreur serveur' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label="Mot de passe actuel">
        <input style={inputStyle} type="password" value={current} onChange={e => setCurrent(e.target.value)} placeholder="••••••••" required />
      </Field>
      <Field label="Nouveau mot de passe">
        <input style={inputStyle} type="password" value={next} onChange={e => setNext(e.target.value)} placeholder="8 caractères minimum" required />
      </Field>
      <Field label="Confirmer le nouveau mot de passe">
        <input style={inputStyle} type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" required />
      </Field>
      {status && <StatusBanner {...status} />}
      <SaveButton loading={loading} label="Changer le mot de passe" />
    </form>
  )
}
