import { useState } from 'react'

const B = {
  navy: "#121E2D", gold: "#C6A05B", goldSoft: "rgba(198,160,91,.12)",
  goldBorder: "rgba(198,160,91,.22)", white: "#FFFFFF",
}

export default function LoginScreen({ onSignIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await onSignIn(email, password)
    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'Email ou mot de passe incorrect.'
        : error.message)
    }
    setLoading(false)
  }

  return (
    <div style={styles.container}>
      <div style={styles.orb} />
      <div style={styles.card}>
        <div style={styles.logoRow}>
          <span style={styles.logoText}>ÉLEVIA</span>
        </div>
        <div style={styles.tagline}>Nutrition personnalisée</div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={styles.input}
            autoComplete="email"
            required
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={styles.input}
            autoComplete="current-password"
            required
          />
          {error && <div style={styles.error}>{error}</div>}
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div style={styles.footer}>
          Pas encore de compte ? Prends rendez-vous sur<br/>
          <span style={{ color: B.gold, fontWeight: 600 }}>elevianutrition.com</span>
        </div>
      </div>
      <div style={styles.version}>v1.1.0</div>
    </div>
  )
}

const styles = {
  container: {
    width: '100%', maxWidth: 430, height: '100dvh', margin: '0 auto',
    background: `linear-gradient(160deg, #0A1620 0%, ${B.navy} 40%, #122438 100%)`,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden', fontFamily: "'DM Sans', -apple-system, sans-serif",
  },
  orb: {
    position: 'absolute', width: 300, height: 300, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(198,160,91,.08) 0%, transparent 70%)',
    top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
  },
  card: {
    position: 'relative', zIndex: 1, width: '85%', maxWidth: 340,
    textAlign: 'center',
  },
  logoRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  logoText: {
    fontSize: 28, fontWeight: 800, letterSpacing: 4, color: B.gold,
    fontStyle: 'italic', fontFamily: "'Cormorant Garamond', 'Georgia', serif",
  },
  tagline: {
    marginTop: 8, fontSize: 11, fontWeight: 600, letterSpacing: 3,
    color: 'rgba(198,160,91,.45)', textTransform: 'uppercase',
  },
  form: {
    marginTop: 40, display: 'flex', flexDirection: 'column', gap: 12,
  },
  input: {
    width: '100%', padding: '14px 16px', borderRadius: 14,
    border: `1px solid ${B.goldBorder}`, background: 'rgba(255,255,255,.06)',
    color: B.white, fontSize: 15, fontFamily: "'DM Sans', sans-serif",
    outline: 'none', boxSizing: 'border-box',
  },
  error: {
    fontSize: 13, color: '#FF3B30', textAlign: 'center', padding: '4px 0',
  },
  button: {
    width: '100%', padding: 14, borderRadius: 14, background: B.gold,
    color: B.white, fontSize: 15, fontWeight: 800, border: 'none',
    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", marginTop: 4,
  },
  footer: {
    marginTop: 32, fontSize: 12, color: 'rgba(255,255,255,.35)', lineHeight: 1.6,
  },
  version: {
    position: 'absolute', bottom: 40, fontSize: 10, color: 'rgba(255,255,255,.15)',
    letterSpacing: 1,
  },
}
