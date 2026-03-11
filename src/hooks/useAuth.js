import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [session, setSession] = useState(undefined) // undefined = loading, null = no session
  const [loading, setLoading] = useState(true)
  const [needsPasswordSet, setNeedsPasswordSet] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setLoading(false)
      // Supabase fires PASSWORD_RECOVERY for both invite and password reset flows
      if (event === 'PASSWORD_RECOVERY') {
        setNeedsPasswordSet(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const setPassword = async (password) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (!error) setNeedsPasswordSet(false)
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return { session, loading, needsPasswordSet, signIn, setPassword, signOut }
}
