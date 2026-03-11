import { useState } from 'react'

const B = {
  navy: "#121E2D", gold: "#C6A05B", cream: "#F6F3EE",
}

export default function SetPasswordScreen({ onSetPassword }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    const { error } = await onSetPassword(password)
    if (error) {
      setError(error.message)
    }
    setLoading(false)
  }

  return (
    <div style={styles.container}>
      <div style={styles.topBar} />
      <div style={styles.card}>
        <div style={styles.title}>Bienvenue sur Élevia</div>
        <div style={styles.subtitle}>
          Crée ton mot de passe pour accéder à ton espace nutrition.
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={styles.input}
            autoComplete="new-password"
            minLength={8}
            required
          />
          <input
            type="password"
            placeholder="Confirmer le mot de passe"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            style={styles.input}
            autoComplete="new-password"
            minLength={8}
            required
          />
          {error && <div style={styles.error}>{error}</div>}
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Enregistrement...' : 'Créer mon mot de passe'}
          </button>
        </form>

        <div style={styles.hint}>Minimum 8 caractères</div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    width: '100%', maxWidth: 430, height: '100dvh', margin: '0 auto',
    background: B.cream,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden', fontFamily: "'DM Sans', -apple-system, sans-serif",
  },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 4,
    background: `linear-gradient(90deg, ${B.gold}, ${B.navy})`,
  },
  card: {
    position: 'relative', zIndex: 1, width: '85%', maxWidth: 340,
    textAlign: 'center',
  },
  title: {
    fontSize: 22, fontWeight: 800, color: B.navy, marginBottom: 8,
    fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
  },
  subtitle: {
    fontSize: 14, color: 'rgba(15,30,46,.55)', lineHeight: 1.6,
  },
  form: {
    marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12,
  },
  input: {
    width: '100%', padding: '14px 16px', borderRadius: 14,
    border: '1px solid rgba(15,30,46,.12)', background: '#FFFFFF',
    color: B.navy, fontSize: 15, fontFamily: "'DM Sans', sans-serif",
    outline: 'none', boxSizing: 'border-box',
  },
  error: {
    fontSize: 13, color: '#FF3B30', textAlign: 'center', padding: '4px 0',
  },
  button: {
    width: '100%', padding: 14, borderRadius: 14, background: B.navy,
    color: '#FFFFFF', fontSize: 15, fontWeight: 800, border: 'none',
    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", marginTop: 4,
  },
  hint: {
    marginTop: 16, fontSize: 11, color: 'rgba(15,30,46,.3)',
  },
}
