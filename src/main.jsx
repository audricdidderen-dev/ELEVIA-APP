import React from 'react'
import ReactDOM from 'react-dom/client'
import { useAuth } from './hooks/useAuth'
import { usePlanData } from './hooks/usePlanData'
import { useFoodLogs } from './hooks/useFoodLogs'
import { useMeasurements } from './hooks/useMeasurements'
import { useWeeklyBilans } from './hooks/useWeeklyBilans'
import { useStreaks } from './hooks/useStreaks'
import { useMilestones } from './hooks/useMilestones'
import { useDietitianMessages } from './hooks/useDietitianMessages'
import LoginScreen from './components/LoginScreen'
import EleviaApp from '../elevia-prototype.jsx'

function App() {
  const { session, loading: authLoading, signIn, signOut } = useAuth()
  const { data: planData, loading: dataLoading, error: dataError } = usePlanData(session)
  const { logs, weekConsumed, weekNutrients, loading: logsLoading, addLog, deleteLog } = useFoodLogs(session, planData)
  const { measurements, addMeasurement } = useMeasurements(session, planData?.MEASUREMENTS)
  const { bilans, createBilan } = useWeeklyBilans(session, planData?._planId, planData?.BILANS)
  const { streak, incrementStreak } = useStreaks(session)
  const { milestones, milestoneDefs, newlyUnlocked, checkAndAward, dismissPopup } = useMilestones(session)
  const { messages: dietMessages, unreadCount: dietUnread, markAsRead: dietMarkRead, markAllAsRead: dietMarkAllRead } = useDietitianMessages(session)

  // Auth loading
  if (authLoading) {
    return <SplashScreen />
  }

  // Not logged in
  if (!session) {
    return <LoginScreen onSignIn={signIn} />
  }

  // Data loading
  if (dataLoading || !planData) {
    return <SplashScreen subtitle="Chargement de ton plan..." />
  }

  // Data error
  if (dataError) {
    return (
      <div style={{
        width: '100%', maxWidth: 430, height: '100dvh', margin: '0 auto',
        background: 'linear-gradient(160deg, #0A1620 0%, #121E2D 40%, #122438 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'DM Sans', sans-serif", padding: 32, textAlign: 'center',
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#FF3B30', marginBottom: 12 }}>Erreur</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,.6)', lineHeight: 1.6, marginBottom: 24 }}>{dataError}</div>
        <button onClick={signOut} style={{
          padding: '12px 32px', borderRadius: 14, background: 'rgba(198,160,91,.15)',
          border: '1px solid rgba(198,160,91,.3)', color: '#C6A05B', fontSize: 14,
          fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>Se déconnecter</button>
      </div>
    )
  }

  // Merge live data into planData — use hook data if available, fallback to planData
  const liveData = {
    ...planData,
    MEASUREMENTS: measurements.length > 0 ? measurements : planData.MEASUREMENTS,
    BILANS: bilans.length > 0 ? bilans : planData.BILANS,
  }

  return (
    <EleviaApp
      session={session}
      signOut={signOut}
      planData={liveData}
      logs={logs}
      weekConsumed={weekConsumed}
      weekNutrients={weekNutrients}
      onAddLog={addLog}
      onDeleteLog={deleteLog}
      onAddMeasurement={addMeasurement}
      onCreateBilan={createBilan}
      streak={streak}
      onIncrementStreak={incrementStreak}
      milestones={milestones}
      milestoneDefs={milestoneDefs}
      newlyUnlocked={newlyUnlocked}
      onCheckMilestones={checkAndAward}
      onDismissMilestone={dismissPopup}
      dietMessages={dietMessages}
      dietUnread={dietUnread}
      onDietMarkRead={dietMarkRead}
      onDietMarkAllRead={dietMarkAllRead}
    />
  )
}

function SplashScreen({ subtitle }) {
  return (
    <div style={{
      width: '100%', maxWidth: 430, height: '100dvh', margin: '0 auto',
      background: 'linear-gradient(160deg, #0A1620 0%, #121E2D 40%, #122438 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute', width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(198,160,91,.08) 0%, transparent 70%)',
        top: '35%', left: '50%', transform: 'translate(-50%,-50%)',
      }} />
      <div style={{
        fontSize: 28, fontWeight: 800, letterSpacing: 4, color: '#C6A05B',
        fontStyle: 'italic', fontFamily: "'Playfair Display', 'Georgia', serif",
      }}>ÉLEVIA</div>
      {subtitle && (
        <div style={{
          marginTop: 16, fontSize: 12, color: 'rgba(198,160,91,.45)', fontWeight: 600,
          fontFamily: "'DM Sans', sans-serif",
        }}>{subtitle}</div>
      )}
      {subtitle && (
        <div style={{
          width: 120, height: 3, borderRadius: 2,
          background: 'rgba(198,160,91,.12)', marginTop: 20,
          overflow: 'hidden',
        }}>
          <div style={{
            width: '60%', height: '100%',
            background: '#C6A05B', borderRadius: 2,
            animation: 'splashBar 1.8s ease-in-out infinite',
          }} />
        </div>
      )}
      <style>{`@keyframes splashBar{0%{width:10%;margin-left:0}50%{width:60%;margin-left:20%}100%{width:10%;margin-left:90%}}`}</style>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
