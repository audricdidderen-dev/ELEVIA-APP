import { useState } from 'react'

/**
 * OnboardingOverlay — 2-step intro before the guided tour.
 * Adapts messaging to the patient's objective (PW vs GAIN).
 * Stored in localStorage so it only shows once.
 */

const STEPS_PW = [
  {
    title: "Bienvenue sur Élevia",
    body: "Ton plan nutritionnel personnalisé est prêt. On va te montrer comment il fonctionne en 30 secondes.",
    icon: "✨",
  },
  {
    title: "On va te montrer l'essentiel",
    body: "Quelques points clés directement sur ton interface. C'est rapide, promis.",
    icon: "👆",
    cta: "C'est parti",
  },
]

const STEPS_GAIN = [
  {
    title: "Bienvenue sur Élevia",
    body: "Ton plan nutritionnel de prise de masse est prêt. On va te montrer comment il fonctionne en 30 secondes.",
    icon: "✨",
  },
  {
    title: "On va te montrer l'essentiel",
    body: "Quelques points clés directement sur ton interface. C'est rapide, promis.",
    icon: "👆",
    cta: "C'est parti",
  },
]

export default function OnboardingOverlay({ onComplete, objectiveCode, accent }) {
  const [step, setStep] = useState(0)
  const isGain = objectiveCode?.startsWith('GAIN')
  const STEPS = isGain ? STEPS_GAIN : STEPS_PW
  const s = STEPS[step]
  const isLast = step === STEPS.length - 1
  const accentColor = accent || '#C6A05B'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(10,22,32,.92)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-end',
      padding: '0 28px 72px',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Icon */}
      <div style={{
        fontSize: 44, marginBottom: 20,
        animation: 'fadeUp .4s ease-out',
      }}>{s.icon}</div>

      {/* Content */}
      <div style={{ textAlign: 'center', maxWidth: 320, animation: 'fadeUp .4s ease-out' }}>
        <div style={{
          fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 10,
          letterSpacing: '-0.2px',
        }}>{s.title}</div>
        <div style={{
          fontSize: 14, color: 'rgba(255,255,255,.65)', lineHeight: 1.65,
          marginBottom: 28,
        }}>{s.body}</div>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{
            width: i === step ? 24 : 6, height: 6, borderRadius: 3,
            background: i === step ? accentColor : 'rgba(255,255,255,.15)',
            transition: 'all .3s ease',
          }} />
        ))}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 320 }}>
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} style={{
            flex: 1, padding: '14px 0', borderRadius: 14,
            border: '1px solid rgba(255,255,255,.12)',
            background: 'transparent', color: 'rgba(255,255,255,.5)',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>Précédent</button>
        )}
        <button onClick={() => {
          if (isLast) onComplete()
          else setStep(step + 1)
        }} style={{
          flex: step > 0 ? 1 : undefined, width: step > 0 ? undefined : '100%',
          padding: '14px 0', borderRadius: 14, border: 'none',
          background: accentColor, color: '#fff',
          fontSize: 14, fontWeight: 800, cursor: 'pointer',
          fontFamily: 'inherit',
          boxShadow: `0 4px 20px ${accentColor}40`,
        }}>{isLast ? (s.cta || 'Commencer') : 'Suivant'}</button>
      </div>

      {/* Skip link */}
      {!isLast && (
        <button onClick={onComplete} style={{
          marginTop: 16, background: 'none', border: 'none',
          color: 'rgba(255,255,255,.25)', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>Passer l'introduction</button>
      )}
    </div>
  )
}
