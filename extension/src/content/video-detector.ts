// Content script — video detection + contextual icon injection next to the player

const PLATFORMS: { name: string; regex: RegExp; selector: string }[] = [
  {
    name: 'TikTok',
    regex: /tiktok\.com\/@[\w.]+\/video\/\d+/,
    selector: '[class*="DivVideoWrapper"], [class*="video-container"], .tiktok-web-player',
  },
  {
    name: 'Instagram',
    regex: /instagram\.com\/reel\/[\w-]+/,
    selector: 'video, [role="dialog"] article, main article',
  },
  {
    name: 'YouTube Shorts',
    regex: /youtube\.com\/shorts\/[\w-]+/,
    selector: '#shorts-player, ytd-shorts, #player-container',
  },
]

const BTN_ID = 'viralscript-btn'
const TOOLTIP_ID = 'viralscript-tooltip'

// SVG icon: text lines with a play arrow
const ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
  <polyline points="14 2 14 8 20 8"/>
  <line x1="16" y1="13" x2="8" y2="13"/>
  <line x1="16" y1="17" x2="8" y2="17"/>
  <polyline points="10 9 9 9 8 9"/>
</svg>`

function getCurrentPlatform() {
  const url = window.location.href
  return PLATFORMS.find(p => p.regex.test(url)) ?? null
}

function getPlayerRect(platform: (typeof PLATFORMS)[number]): DOMRect | null {
  const el = document.querySelector<HTMLElement>(platform.selector)
  if (!el) return null
  const rect = el.getBoundingClientRect()
  // sanity-check: element must be visible and reasonably sized
  if (rect.width < 50 || rect.height < 50) return null
  return rect
}

function createButton(): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.id = BTN_ID
  btn.innerHTML = ICON_SVG
  btn.setAttribute('aria-label', 'ViralScript — Transcrire cette vidéo')

  Object.assign(btn.style, {
    position: 'fixed',
    zIndex: '2147483647',
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    background: 'rgba(94, 106, 210, 0.92)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    color: '#fff',
    border: '2px solid rgba(255,255,255,0.2)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    transition: 'transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease',
    opacity: '0',
    transform: 'scale(0.85)',
    padding: '0',
  })

  // Tooltip
  const tooltip = document.createElement('div')
  tooltip.id = TOOLTIP_ID
  Object.assign(tooltip.style, {
    position: 'fixed',
    zIndex: '2147483646',
    background: 'rgba(10,10,10,0.9)',
    color: '#fff',
    fontSize: '12px',
    fontFamily: 'system-ui, sans-serif',
    fontWeight: '600',
    padding: '5px 10px',
    borderRadius: '6px',
    pointerEvents: 'none',
    opacity: '0',
    transition: 'opacity 0.15s ease',
    whiteSpace: 'nowrap',
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
  })
  tooltip.textContent = '⚡ Transcrire'
  document.body.appendChild(tooltip)

  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'scale(1.1)'
    btn.style.opacity = '1'
    btn.style.boxShadow = '0 6px 24px rgba(94,106,210,0.6)'
    // Position tooltip to the left of the button
    const btnRect = btn.getBoundingClientRect()
    tooltip.style.top = `${btnRect.top + btnRect.height / 2 - 14}px`
    tooltip.style.left = `${btnRect.left - tooltip.offsetWidth - 10}px`
    tooltip.style.opacity = '1'
  })

  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'scale(1)'
    btn.style.opacity = '0.92'
    btn.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)'
    tooltip.style.opacity = '0'
  })

  btn.addEventListener('click', () => {
    const url = window.location.href
    chrome.storage.local.set({ pending_url: url })
    chrome.runtime.sendMessage({ type: 'OPEN_POPUP_WITH_URL', url })

    // Brief pulse feedback
    btn.style.transform = 'scale(0.92)'
    setTimeout(() => { btn.style.transform = 'scale(1)' }, 120)
  })

  return btn
}

function positionButton(btn: HTMLButtonElement, platform: (typeof PLATFORMS)[number]) {
  const rect = getPlayerRect(platform)
  if (!rect) return

  // Place the icon on the right edge of the player, vertically centered in the top third
  const top = rect.top + rect.height * 0.15
  const left = rect.right + 10

  // If it would go off-screen on the right, put it inside the player (right edge - 54px)
  const finalLeft = left + 54 > window.innerWidth ? rect.right - 54 : left

  btn.style.top = `${top}px`
  btn.style.left = `${finalLeft}px`
}

let positionInterval: ReturnType<typeof setInterval> | null = null

function injectButton(platform: (typeof PLATFORMS)[number]) {
  if (document.getElementById(BTN_ID)) return

  const btn = createButton()
  document.body.appendChild(btn)

  // Initial position
  positionButton(btn, platform)

  // Animate in
  requestAnimationFrame(() => {
    btn.style.opacity = '0.92'
    btn.style.transform = 'scale(1)'
  })

  // Keep position in sync with player (handles scroll, resize, SPA layout shifts)
  positionInterval = setInterval(() => {
    const b = document.getElementById(BTN_ID) as HTMLButtonElement | null
    if (b) positionButton(b, platform)
  }, 300)
}

function removeButton() {
  document.getElementById(BTN_ID)?.remove()
  document.getElementById(TOOLTIP_ID)?.remove()
  if (positionInterval) {
    clearInterval(positionInterval)
    positionInterval = null
  }
}

function checkAndInject() {
  const platform = getCurrentPlatform()
  if (platform) {
    injectButton(platform)
  } else {
    removeButton()
  }
}

// Run on hard navigation
setTimeout(checkAndInject, 500)

// Watch for SPA navigation
let lastUrl = window.location.href
const navObserver = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href
    removeButton()
    setTimeout(checkAndInject, 600)
  }
})
navObserver.observe(document.body, { childList: true, subtree: true })
