import { useState, useEffect } from 'react'

const STEPS = [
  {
    target: 'kcal-ring',
    title: 'Ton cercle du jour',
    bodyPW: "Ce cercle montre ta consommation par rapport à ton budget. Tant qu'il reste de la place, tu es dans les clous.",
    bodyGAIN: "Ce cercle montre ta progression vers ton objectif. L'idée, c'est de le remplir.",
  },
  {
    target: 'slot-add',
    title: 'Le bouton +',
    bodyPW: "C'est ici que tu ajoutes ce que tu manges. Appuie sur + à chaque repas.",
    bodyGAIN: "C'est ici que tu ajoutes ce que tu manges. Appuie sur + à chaque repas.",
  },
  {
    target: 'macros',
    title: 'Tes macros',
    bodyPW: "Protéines, lipides, glucides : ces compteurs s'actualisent à chaque ajout. Pas besoin de calculer.",
    bodyGAIN: "Protéines, lipides, glucides : ces compteurs s'actualisent à chaque ajout. Pas besoin de calculer.",
  },
  {
    target: 'seg-toggle',
    title: 'Jour / Semaine',
    bodyPW: "Passe en vue Semaine pour voir ta progression globale. C'est là que l'équilibre se construit.",
    bodyGAIN: "Passe en vue Semaine pour voir ta progression globale. C'est là que l'équilibre se construit.",
  },
  {
    target: 'tab-bar',
    title: 'Tes onglets',
    bodyPW: "Plan, Conseils, Historique, Profil : tout est là. Explore à ton rythme.",
    bodyGAIN: "Plan, Conseils, Historique, Profil : tout est là. Explore à ton rythme.",
  },
]

export default function GuidedTour({ onComplete, objectiveCode, accent }) {
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState(null)
  const isGain = objectiveCode?.startsWith('GAIN')
  const accentColor = accent || '#C6A05B'
  const s = STEPS[step]
  const isLast = step === STEPS.length - 1

  useEffect(() => {
    const el = document.querySelector(`[data-tour="${s.target}"]`)
    if (!el) {
      // Auto-skip to next step if target element is missing
      if (isLast) onComplete()
      else setStep(prev => prev + 1)
      return
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })

    const update = () => {
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    }

    update()
    const t = setTimeout(update, 400)

    const onMove = () => requestAnimationFrame(update)
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    return () => {
      clearTimeout(t)
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
    }
  }, [step, s.target])

  if (!rect) return null

  const pad = 10
  const spot = {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  }

  const viewH = window.innerHeight
  const below = rect.top < viewH / 2

  return <>
    {/* Invisible full-screen blocker */}
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000 }} />

    {/* Spotlight hole with dark surround */}
    <div style={{
      position: 'fixed',
      top: spot.top, left: spot.left,
      width: spot.width, height: spot.height,
      borderRadius: 16,
      boxShadow: '0 0 0 9999px rgba(10,22,32,.85)',
      zIndex: 10001,
      pointerEvents: 'none',
      transition: 'all .3s ease-out',
    }} />

    {/* Tooltip */}
    <div style={{
      position: 'fixed',
      left: 16, right: 16,
      ...(below
        ? { top: spot.top + spot.height + 14 }
        : { bottom: viewH - spot.top + 14 }),
      background: '#fff',
      borderRadius: 20,
      padding: '22px 20px 18px',
      boxShadow: '0 8px 40px rgba(0,0,0,.18)',
      zIndex: 10002,
      fontFamily: "'DM Sans', sans-serif",
      animation: 'fadeUp .3s ease-out',
    }}>
      {/* Counter */}
      <div style={{
        fontSize: 11, fontWeight: 700, color: accentColor,
        marginBottom: 6, letterSpacing: '.3px',
      }}>{step + 1}/{STEPS.length}</div>

      {/* Title */}
      <div style={{
        fontSize: 18, fontWeight: 700, color: '#1A1A1A',
        fontFamily: "'Cormorant Garamond', serif",
        marginBottom: 8,
      }}>{s.title}</div>

      {/* Body */}
      <div style={{
        fontSize: 13, color: '#6B7280', lineHeight: 1.6,
        marginBottom: 20,
      }}>{isGain ? s.bodyGAIN : s.bodyPW}</div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} style={{
            padding: '10px 18px', borderRadius: 12,
            border: '1px solid rgba(15,30,46,.1)',
            background: 'transparent', color: '#6B7280',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>Précédent</button>
        )}
        <button onClick={() => {
          if (isLast) onComplete()
          else setStep(step + 1)
        }} style={{
          flex: 1, padding: '10px 18px', borderRadius: 12,
          border: 'none', background: accentColor, color: '#fff',
          fontSize: 13, fontWeight: 800, cursor: 'pointer',
          fontFamily: 'inherit',
          boxShadow: `0 4px 16px ${accentColor}30`,
        }}>{isLast ? "C'est compris !" : 'Suivant'}</button>
      </div>

      {/* Skip link */}
      {!isLast && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button onClick={onComplete} style={{
            background: 'none', border: 'none',
            color: 'rgba(15,30,46,.3)', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>Passer</button>
        </div>
      )}
    </div>
  </>
}
