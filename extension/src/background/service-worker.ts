// Background service worker — MV3
// Story 5.1 (auth) + Story 5.3 (transcription launch + status relay)

import { getToken } from '../lib/storage'

const API_BASE = 'http://localhost:3001/api/v1'

chrome.runtime.onInstalled.addListener(() => {
  console.log('[ViralScript] Extension installed')
})

// ─── Message handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'OPEN_POPUP_WITH_URL') {
    // Store the URL and open popup (popup reads pending_url on load)
    chrome.storage.local.set({ pending_url: message.url })
    // Note: chrome.action.openPopup() requires user gesture; content script click qualifies
    chrome.action.openPopup?.().catch(() => {
      // openPopup not available in all contexts — popup will read pending_url on next open
    })
    sendResponse({ ok: true })
    return false
  }

  if (message.type === 'SUBMIT_TRANSCRIPTION') {
    handleSubmitTranscription(message.url)
      .then(result => sendResponse({ ok: true, ...result }))
      .catch(err => sendResponse({ ok: false, error: err.message }))
    return true // keep channel open for async response
  }

  if (message.type === 'POLL_TRANSCRIPTION') {
    pollTranscription(message.id)
      .then(result => sendResponse({ ok: true, ...result }))
      .catch(err => sendResponse({ ok: false, error: err.message }))
    return true
  }
})

// ─── API helpers ──────────────────────────────────────────────────────────────

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function handleSubmitTranscription(url: string) {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/transcriptions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ url }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { message?: string }).message ?? `API error: ${res.status}`)
  }
  const data = await res.json()
  return { id: (data as { data: { id: string } }).data.id }
}

async function pollTranscription(id: string) {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/transcriptions/${id}`, { headers })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const data = await res.json()
  const tx = (data as { data: { status: string; text?: string; errorMsg?: string } }).data
  return { status: tx.status, text: tx.text, errorMsg: tx.errorMsg }
}
