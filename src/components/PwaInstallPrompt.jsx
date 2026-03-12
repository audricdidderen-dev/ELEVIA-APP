import { useState, useEffect } from 'react'

/**
 * PwaInstallPrompt — Shows a banner prompting the user to add the app
 * to their home screen. Only on iOS Safari (standalone not yet installed).
 * Shows once per session, dismissable, respects localStorage.
 */
export default function PwaInstallPrompt({ accent }) {
  const [show, setShow] = useState(false)
  const accentColor = accent || '#C6A05B'

  useEffect(() => {
    // Don't show if already installed as PWA
    if (window.navigator.standalone) return
    if (window.matchMedia('(display-mode: standalone)').matches) return

    // Don't show if already dismissed
    if (localStorage.getItem('elevia_pwa_dismissed')) return

    // Only show on iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const isSafari = /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|Chrome/.test(navigator.userAgent)

    // Also show on Android Chrome (has beforeinstallprompt)
    const isAndroid = /Android/.test(navigator.userAgent)

    if (isIOS && isSafari) {
      // Show after a short delay so the app loads first
      const t = setTimeout(() => setShow(true), 2000)
      return () => clearTimeout(t)
    }

    if (isAndroid) {
      // Listen for the native install prompt
      const handler = (e) => {
        e.preventDefault()
        window._deferredInstallPrompt = e
        setShow(true)
      }
      window.addEventListener('beforeinstallprompt', handler)
      return () => window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const dismiss = () => {
    setShow(false)
    localStorage.setItem('elevia_pwa_dismissed', '1')
  }

  const installAndroid = async () => {
    if (window._deferredInstallPrompt) {
      window._deferredInstallPrompt.prompt()
      await window._deferredInstallPrompt.userChoice
      window._deferredInstallPrompt = null
    }
    dismiss()
  }

  if (!show) return null

  const isAndroid = /Android/.test(navigator.userAgent)

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      zIndex: 9998,
      padding: '0 12px 12px',
      animation: 'slideUp .4s ease-out',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 20,
        padding: '18px 18px 16px',
        boxShadow: '0 -4px 32px rgba(0,0,0,.12), 0 2px 8px rgba(0,0,0,.08)',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: `linear-gradient(135deg, #0E1E2E, #1a3a5c)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: accentColor, fontFamily: 'Georgia, serif' }}>E</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1A1A1A' }}>
              Ajoute Élevia à ton écran
            </div>
            <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.4, marginTop: 2 }}>
              Accès instantané, plein écran, sans barre de navigation.
            </div>
          </div>
          <button onClick={dismiss} aria-label="Fermer" style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 4, flexShrink: 0, color: '#9CA3AF', fontSize: 18,
          }}>✕</button>
        </div>

        {isAndroid ? (
          <button onClick={installAndroid} style={{
            width: '100%', padding: '12px 0', borderRadius: 14,
            border: 'none', background: accentColor, color: '#fff',
            fontSize: 14, fontWeight: 800, cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: `0 4px 16px ${accentColor}30`,
          }}>Installer l'app</button>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 14px',
            background: 'rgba(15,30,46,.03)',
            borderRadius: 14,
            border: '1px solid rgba(15,30,46,.06)',
          }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12l7-7 7 7"/>
              </svg>
            </span>
            <div style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.5 }}>
              Appuie sur{' '}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'text-bottom', margin: '0 2px' }}>
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
              {' '}puis <strong>Sur l'écran d'accueil</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
