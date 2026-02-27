# Audit UX & Adherence -- Elevia App

> **Date** : 27 fevrier 2026
> **Perimetre** : `elevia-prototype.jsx` (1145 lignes), hooks Supabase, `objectiveConfig.js`, `transformPlanData.js`, `LoginScreen.jsx`
> **Methode** : Analyse de code + recherche scientifique (SDT, Fogg, Hook Model, meta-analyses 2024-2025)

---

## Table des matieres

1. [Diagnostic de l'existant](#1-diagnostic-de-lexistant)
2. [Parcours utilisateur actuel](#2-parcours-utilisateur-actuel)
3. [Recommandations P0 (critique)](#3-recommandations-p0--critique)
4. [Recommandations P1 (important)](#4-recommandations-p1--important)
5. [Recommandations P2 (nice-to-have)](#5-recommandations-p2--nice-to-have)
6. [Synthese et roadmap](#6-synthese-et-roadmap)

---

## 1. Diagnostic de l'existant

### Forces

| Point fort | Detail |
|---|---|
| **Architecture d'objectifs solide** | 5 objectifs (PW, MAINT, GAIN_*) avec theming dynamique (or/bleu), vocabulaire adapte, logique de progression inversee. Rare et bien execute. |
| **Systeme d'equivalences** | Le concept EQ + items + stepper est unique : il traduit un plan dietetique pro en gestes simples ("+1 tranche", "+1 banane"). |
| **Week vs Day view** | Double vue jour/semaine qui respecte le principe "l'equilibre se fait sur la semaine" -- coherent avec la science nutritionnelle. |
| **Out-of-plan logging** | Le patient peut logger ce qui est hors plan avec education positive ("Tu peux le faire") au lieu de la culpabilite. Approche SDT (autonomie). |
| **Conseils riches** | Axes prioritaires/secondaires, detail expandable, micro-tips rotatifs, evaluation hebdomadaire. |
| **Suivi mesures** | Graphiques multiples (poids, taille, %MG, IMC, ratio), KPI deltas, historique tabule. |
| **Optimistic updates** | `useFoodLogs` fait du optimistic UI + rollback -- UX fluide. |
| **Ton premium** | Police DM Sans + Playfair, palette navy/gold, design Apple-like, tutoiement respectueux. |

### Faiblesses

| Faiblesse | Impact | Severite |
|---|---|---|
| **Pas d'onboarding** | Le patient arrive directement sur le Plan Tab sans explication. Confusion garantie au premier lancement. | P0 |
| **Pas de streaks/milestones** | Tables `user_streaks` et `user_milestones` existent en DB mais ne sont pas utilisees. Aucun mecanisme de retention comportementale. | P0 |
| **Pas de notifications** | Les toggles dans Settings sont purement visuels (mock). Aucun rappel reel. | P0 |
| **Splash screen = temps mort** | 2.2s de splash fixe sans progression ni contenu utile. Perception de lenteur. | P1 |
| **Pas de feedback post-log** | Apres un log, un snackbar texte "checkmark nom ajoute" apparait 2.5s. Pas d'animation, pas de celebreration, pas de progression visible. | P1 |
| **Evaluation non persistee** | Le modal d'evaluation semaine collecte des scores mais `evalScores` est un `useState` local -- perdu au refresh. | P1 |
| **Pas de suppression de log inline** | `onDeleteLog` est passe mais jamais utilise dans l'UI (pas de swipe-to-delete, pas de bouton). | P1 |
| **Pas de message du dieteticien** | Aucun canal de communication asynchrone diet -> patient dans l'app. | P2 |
| **Donnees mockees en dur** | WeekView affiche `wk={kcal:9520,...}` en dur (ligne 638). Les donnees semaine ne viennent pas des logs reels. | P1 |
| **CSS inline massif** | ~150 lignes de CSS en template literal + styles inline partout. Maintenance complexe, pas de dark mode possible. | P2 |
| **Pas d'etat vide** | Si un patient n'a aucun log, aucun bilan, aucune mesure : pas d'empty state, pas de guidance. | P1 |

---

## 2. Parcours utilisateur actuel

### Premier lancement

```
Login -> Splash (2.2s fixe) -> Plan Tab (jour)
```

**Problemes** :
- Zero onboarding, zero explication du systeme d'equivalences
- Le patient voit 5 slots vides avec "Appuie sur + pour ajouter" et un ring a 0%
- Pas d'indication de ce qu'est une "equivalence", un "slot", une "portion"
- La vue Semaine n'est pas suggeree
- Les guides video dans Profil > Guides sont enterres a 3 clics de profondeur

**Recherche** : Les apps avec onboarding interactif ont un taux de retention D7 2x superieur a celles sans (Appcues 2024). MyFitnessPal et Noom font un onboarding personalise avant le premier ecran.

### Flow quotidien

```
Ouvre l'app -> Plan Tab -> Clic "+" sur un slot -> Modal (Plan/Autres)
-> Choisis EQ -> Stepper/Portion -> Valider -> Snackbar "ajoute"
```

**Problemes** :
- Apres validation, retour direct au slot -- pas de celebreration
- Le ring kcal se met a jour mais sans animation
- Pas de suggestion "il te manque X pour finir le petit-dej"
- Pas de rappel si un slot est vide a 12h
- Pas de streak counter visible nulle part

**Recherche** : BJ Fogg (Tiny Habits) : le "celebration" immediat apres le comportement est le mecanisme principal d'ancrage. Sans lui, le comportement ne devient pas habitude.

### Flow hebdomadaire

```
Dimanche -> Conseils Tab -> "Evaluer ma semaine" -> Modal scoring -> "Enregistrer" (perdu au refresh)
```

**Problemes** :
- L'evaluation n'est pas sauvegardee (useState local)
- Pas de lien entre l'evaluation et le bilan dans Historique
- Le bilan dans Historique a un score mais on ne sait pas d'ou il vient (pas de breakdown par EQ)
- Pas de notification "C'est dimanche, evalue ta semaine"

### Points d'abandon identifies

1. **Jour 1** : Confusion devant l'interface sans onboarding
2. **Jour 3-5** : Pas de rappel -> oubli -> perte de streak (invisible)
3. **Semaine 2** : Pas de milestone, pas de celebreration de progres -> motivation decline
4. **Semaine 4+** : Pas de variation, pas de challenge, routine monotone

---

## 3. Recommandations P0 -- Critique

### P0-1. Onboarding guide au premier lancement

**Justification scientifique** : L'onboarding progressif reduit le churn D1 de 50% (Appcues). Duolingo laisse l'utilisateur essayer avant meme de creer un compte, creant un "aha moment" immediat.

**Description** : Un overlay en 4-5 etapes au premier lancement qui explique le concept core.

**Effort** : ~2 jours

**Implementation** :

```jsx
// Nouveau fichier : src/components/OnboardingOverlay.jsx
import { useState } from 'react'

const STEPS = [
  {
    title: "Bienvenue sur Elevia",
    body: "Ton plan nutritionnel est deja pret. On va te montrer comment il fonctionne.",
    highlight: null,
  },
  {
    title: "Ton plan du jour",
    body: "Chaque repas est divise en equivalences. Une equivalence = une categorie d'aliments avec une quantite definie pour toi.",
    highlight: "slot", // CSS pointer vers le premier slot
  },
  {
    title: "Ajouter un aliment",
    body: "Appuie sur + pour logger ce que tu manges. C'est rapide : choisis l'aliment, ajuste la quantite, valide.",
    highlight: "slot-add",
  },
  {
    title: "L'equilibre se fait sur la semaine",
    body: "Pas de stress si un jour n'est pas parfait. Passe en vue Semaine pour voir ta progression globale.",
    highlight: "seg",
  },
  {
    title: "Tu es pret(e) !",
    body: "Commence par ton petit-dejeuner. On est la pour t'accompagner.",
    highlight: null,
    cta: "C'est parti",
  },
]

export default function OnboardingOverlay({ onComplete }) {
  const [step, setStep] = useState(0)
  const s = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(10,22,32,.85)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-end',
      padding: '0 24px 80px',
    }}>
      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{
            width: i === step ? 24 : 6, height: 6, borderRadius: 3,
            background: i === step ? 'var(--accent)' : 'rgba(255,255,255,.2)',
            transition: 'all .3s',
          }} />
        ))}
      </div>

      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <div style={{
          fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 8,
        }}>{s.title}</div>
        <div style={{
          fontSize: 14, color: 'rgba(255,255,255,.7)', lineHeight: 1.6,
          marginBottom: 24,
        }}>{s.body}</div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} style={{
              padding: '12px 24px', borderRadius: 14, border: '1px solid rgba(255,255,255,.2)',
              background: 'transparent', color: 'rgba(255,255,255,.6)',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>Precedent</button>
          )}
          <button onClick={() => {
            if (isLast) onComplete()
            else setStep(step + 1)
          }} style={{
            padding: '12px 32px', borderRadius: 14, border: 'none',
            background: 'var(--accent)', color: '#fff',
            fontSize: 14, fontWeight: 800, cursor: 'pointer',
          }}>{isLast ? s.cta : 'Suivant'}</button>
        </div>
      </div>
    </div>
  )
}
```

**Integration dans `EleviaApp`** :

```jsx
// Dans EleviaApp, apres le splash :
const [showOnboarding, setShowOnboarding] = useState(() => {
  return !localStorage.getItem('elevia_onboarding_done')
})

function completeOnboarding() {
  localStorage.setItem('elevia_onboarding_done', '1')
  setShowOnboarding(false)
}

// Dans le return, juste avant </DataCtx.Provider> :
{showOnboarding && <OnboardingOverlay onComplete={completeOnboarding} />}
```

---

### P0-2. Streaks et milestones (tables DB deja pretes)

**Justification scientifique** : Forrester 2024 : les apps avec streaks + milestones reduisent le churn 30 jours de 35%. Les apps combinant les deux mecanismes voient un DAU 40-60% superieur. Le streak est le mecanisme de retention #1 de Duolingo.

**Description** : Afficher un streak counter en haut du Plan Tab + debloquer des milestones.

**Effort** : ~3 jours (hook + UI + backend sync)

**Implementation** :

```jsx
// Nouveau hook : src/hooks/useStreaks.js
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useStreaks(session) {
  const [streak, setStreak] = useState({ current: 0, longest: 0, lastLogDate: null })
  const userId = session?.user?.id

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function fetch() {
      const { data } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .eq('streak_type', 'daily_log')
        .single()

      if (!cancelled && data) {
        setStreak({
          current: data.current_count || 0,
          longest: data.longest_count || 0,
          lastLogDate: data.last_activity_date,
        })
      }
    }
    fetch()
    return () => { cancelled = true }
  }, [userId])

  const incrementStreak = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10)
    if (streak.lastLogDate === today) return // Already counted today

    const newCurrent = streak.current + 1
    const newLongest = Math.max(streak.longest, newCurrent)

    // Optimistic
    setStreak({ current: newCurrent, longest: newLongest, lastLogDate: today })

    await supabase.from('user_streaks').upsert({
      user_id: userId,
      streak_type: 'daily_log',
      current_count: newCurrent,
      longest_count: newLongest,
      last_activity_date: today,
    }, { onConflict: 'user_id,streak_type' })
  }, [userId, streak])

  return { streak, incrementStreak }
}
```

**Composant StreakBanner** :

```jsx
function StreakBanner({ current, longest }) {
  const obj = useObjective()
  if (current === 0) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 8, padding: '8px 16px', marginBottom: 12,
      background: obj.accentSoft, border: `1px solid ${obj.accentBorder}`,
      borderRadius: 14,
    }}>
      <span style={{ fontSize: 18 }}>
        {current >= 7 ? '🔥' : current >= 3 ? '✨' : '⭐'}
      </span>
      <span style={{
        fontSize: 13, fontWeight: 800, color: obj.accent,
      }}>{current} jour{current > 1 ? 's' : ''}</span>
      <span style={{
        fontSize: 11, color: 'rgba(15,30,46,.45)',
      }}>de suite</span>
      {current === longest && current > 3 && (
        <span style={{
          fontSize: 10, fontWeight: 700, color: '#34C759',
          background: 'rgba(52,199,89,.08)',
          padding: '2px 8px', borderRadius: 99,
        }}>Record !</span>
      )}
    </div>
  )
}
```

**Placement** : En haut du `PlanTab`, juste apres le titre et le segmented control.

---

### P0-3. Notifications intelligentes (rappels reels)

**Justification scientifique** : Le "Prompt" est le 3e pilier du Fogg Behavior Model (B = M.A.P). Sans prompt, meme une personne motivee et capable ne fera pas l'action. Les apps de sante avec notifications contextuelles ont un taux de logging 2.7x superieur (Simon-Kucher 2024).

**Description** : Utiliser le Service Worker + Push API ou au minimum `Notification API` pour des rappels.

**Effort** : ~3-4 jours (PWA + notification scheduling)

**Implementation (Notification API basique)** :

```js
// src/lib/notifications.js
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function scheduleReminder(title, body, delayMs) {
  if (Notification.permission !== 'granted') return null
  const timeoutId = setTimeout(() => {
    new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      tag: 'elevia-reminder',
    })
  }, delayMs)
  return timeoutId
}

// Exemples d'usage dans l'app :
// Au login ou onboarding :
// requestNotificationPermission()
//
// Chaque matin a 7h30 (via Service Worker pour production) :
// "Bonjour ! Commence par logger ton petit-dejeuner."
//
// Si aucun log a 12h :
// "Midi ! N'oublie pas de logger ton repas."
//
// Dimanche soir :
// "C'est le moment d'evaluer ta semaine."
```

Pour une solution production-ready, il faut un Service Worker avec `self.registration.showNotification()` et une planification via `setTimeout` ou idealement Supabase Edge Functions + Web Push.

**Quick win** : meme sans push natif, on peut afficher un bandeau dans l'app quand un slot est vide depuis X heures :

```jsx
function SlotReminder({ slot, logs }) {
  const slotLogs = logs.filter(l => l.slotId === slot.id)
  if (slotLogs.length > 0) return null

  const hour = new Date().getHours()
  const slotHours = { breakfast: 9, snack1: 11, coldMeal: 13, snack2: 17, hotMeal: 20 }
  if (hour < (slotHours[slot.id] || 24)) return null

  return (
    <div style={{
      padding: '6px 12px', fontSize: 11, color: '#E8863A',
      background: 'rgba(232,134,58,.08)', borderRadius: 10,
      marginTop: 4, fontWeight: 600,
    }}>
      Tu n'as pas encore logge ce repas
    </div>
  )
}
```

---

## 4. Recommandations P1 -- Important

### P1-1. Celebrations et micro-interactions post-log

**Justification scientifique** : BJ Fogg (Tiny Habits) : "Celebration is the fuel of habit formation." Un feedback emotionnel positif immediat ancre le comportement. Noom et Headspace utilisent des animations + messages contextuels a chaque action.

**Description** : Remplacer le snackbar minimal par une celebration contextuelle.

**Effort** : ~1 jour

**Implementation** :

```jsx
// Remplacer dans PlanTab, la logique handleLog :
function handleLog(log) {
  onAddLog(log)
  // Contextual celebration
  const messages = [
    `${getLogLabel(log.eqId, log.itemId)} ajoute`,
    'Bien joue !',
    'Continue comme ca !',
    'Un pas de plus vers ton objectif',
    'Parfait, on avance !',
  ]
  const msg = messages[Math.floor(Math.random() * messages.length)]
  setSnack(msg)
  setTimeout(() => setSnack(null), 2500)
}
```

**Animation CSS a ajouter** :

```css
@keyframes snackPop {
  0% { transform: translateY(20px) scale(0.95); opacity: 0 }
  50% { transform: translateY(-4px) scale(1.02) }
  100% { transform: translateY(0) scale(1); opacity: 1 }
}
.snackbar {
  animation: snackPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
}
```

**Celebration avancee** (quand un slot est "complet" ou quand la cible jour est atteinte) :

```jsx
function checkMilestoneReached(dayNut, dayTargets, obj) {
  const pct = dayNut.kcal / dayTargets.kcal
  if (obj.progressDir === 'down') {
    // PW: completion = entre 90% et 105%
    return pct >= 0.9 && pct <= 1.05
  } else {
    // GAIN: completion = >= 95%
    return pct >= 0.95
  }
}

// Dans handleLog, apres onAddLog :
if (checkMilestoneReached(newDayNut, DAY_TARGETS, obj)) {
  setSnack('Objectif du jour atteint ! 🎯')
  // Optionnel : vibration haptic
  if (navigator.vibrate) navigator.vibrate(100)
}
```

---

### P1-2. Empty states educatifs

**Justification scientifique** : Un etat vide est un moment d'apprentissage. Les apps avec empty states guides ont un taux d'activation (1ere action) 3x superieur a celles qui affichent du vide (Appcues 2024).

**Description** : Ajouter des messages guides dans chaque section quand elle est vide.

**Effort** : ~0.5 jour

**Implementation** :

```jsx
// Plan Tab - quand aucun log du jour
function EmptyDayState({ obj }) {
  return (
    <div style={{
      textAlign: 'center', padding: '32px 24px',
      background: obj.accentSoft,
      border: `1px dashed ${obj.accentBorder}`,
      borderRadius: 20, marginTop: 16,
    }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>🍽️</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', marginBottom: 6 }}>
        Ta journee commence ici
      </div>
      <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>
        Appuie sur le <strong>+</strong> de ton premier repas pour commencer a logger.
        Chaque ajout compte !
      </div>
    </div>
  )
}

// Historique - quand aucun bilan
function EmptyBilanState() {
  return (
    <div style={{
      textAlign: 'center', padding: '24px',
      border: '1px dashed rgba(15,30,46,.12)',
      borderRadius: 20,
    }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>📊</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', marginBottom: 6 }}>
        Pas encore de bilan
      </div>
      <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>
        Ton premier bilan sera disponible dimanche apres ta premiere semaine complete.
      </div>
    </div>
  )
}
```

---

### P1-3. Persister l'evaluation hebdomadaire

**Justification scientifique** : L'auto-evaluation est le mecanisme principal de la SDT pour la competence. Si le patient evalue sa semaine mais que l'evaluation est perdue, le feedback loop est casse.

**Description** : Connecter le modal d'evaluation a `useWeeklyBilans.createBilan`.

**Effort** : ~0.5 jour

**Implementation** : Modifier le `AdviceTab` pour recevoir `onCreateBilan` en props et envoyer les scores.

```jsx
// Dans AdviceTab, remplacer le bouton Enregistrer :
<button className="btn-primary" onClick={async () => {
  // Calculer un score d'adherence a partir des evaluations
  const scores = Object.values(evalScores)
  if (scores.length === 0) return
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  const adherenceScore = Math.round(avg / 2 * 100) // 0-100

  if (onCreateBilan) {
    const { start, end } = getWeekBounds()
    await onCreateBilan({
      weekStart: start,
      weekEnd: end,
      adherenceScore,
      notes: `Auto-eval: ${JSON.stringify(evalScores)}`,
    })
  }
  setEvalOpen(false)
}}>Enregistrer</button>
```

---

### P1-4. Corriger les donnees mockees de WeekView

**Probleme** : Ligne 638 de `elevia-prototype.jsx` :
```jsx
const wk={kcal:9520,p:595,l:285,g:920}; // HARDCODED
```

**Impact** : La vue Semaine montre toujours les memes macros, quelle que soit la realite des logs.

**Effort** : ~0.5 jour

**Implementation** :

```jsx
// Dans WeekView, remplacer le const wk hardcoded par un calcul reel :
const wk = useMemo(() => {
  const n = { kcal: 0, p: 0, l: 0, g: 0 }
  // logs contient les logs du jour ; pour la semaine complete,
  // il faudrait tous les logs de la semaine depuis useFoodLogs
  // En attendant, approximation : dayNut * joursEcoules + weekConsumedEstimate
  logs.forEach(l => { n.kcal += l.kcal; n.p += l.p; n.l += l.l; n.g += l.g })
  return n
}, [logs])
```

Note : pour une precision complete, il faut que `useFoodLogs` expose aussi les logs de toute la semaine (pas seulement today). Le hook fetche deja `weekRes` mais ne l'expose pas dans le state.

---

### P1-5. Suppression de log inline

**Probleme** : `onDeleteLog` est passe au composant mais jamais expose dans l'UI.

**Effort** : ~0.5 jour

**Implementation** : Ajouter un long-press ou un swipe pour supprimer un log :

```jsx
// Dans le rendu des logs de PlanTab, ajouter un onClick pour afficher les options :
{sl.map(l => (
  <div className="log-item" key={l.id}
    onClick={() => {
      if (confirm('Supprimer cet ajout ?')) {
        onDeleteLog?.(l.id, l.eqId, l.qtyPortion)
      }
    }}
    style={{ cursor: 'pointer' }}
  >
    {/* ... contenu existant ... */}
  </div>
))}
```

Idealement, utiliser un modal de confirmation plutot qu'un `confirm()` natif pour rester dans l'esthetique de l'app.

---

### P1-6. Splash screen avec progression reelle

**Description** : Remplacer le splash 2.2s fixe par un splash qui reflete le chargement reel des donnees.

**Effort** : ~0.5 jour

**Implementation** :

```jsx
// Dans main.jsx, au lieu d'un splash fixe :
function SplashScreen({ subtitle, progress }) {
  return (
    <div style={{ /* ... meme style ... */ }}>
      {/* ... logo ... */}
      {subtitle && <div style={{ /* ... */ }}>{subtitle}</div>}
      {progress != null && (
        <div style={{
          width: 120, height: 3, borderRadius: 2,
          background: 'rgba(198,160,91,.15)', marginTop: 20,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${progress}%`, height: '100%',
            background: '#C6A05B', borderRadius: 2,
            transition: 'width 0.3s ease',
          }} />
        </div>
      )}
    </div>
  )
}
```

Et dans `EleviaApp`, supprimer le `splash` state + timer. Le splash est maintenant gere par le loading reel dans `main.jsx`.

---

## 5. Recommandations P2 -- Nice-to-have

### P2-1. Messages du dieteticien (async)

**Justification scientifique** : La "relatedness" (SDT) est le 3e besoin fondamental. Le lien avec le dieteticien est le differentiel cle d'Elevia vs MyFitnessPal. Les apps avec coaching async (Noom, WW) ont un taux de retention 6 mois 3x superieur.

**Description** : Ajouter un espace de messages asynchrones (diet -> patient). Pas un chat bidirectionnel complet, mais un systeme de notes/encouragements.

**Effort** : ~3-4 jours

**Schema DB** (deja Supabase) :

```sql
CREATE TABLE IF NOT EXISTS dietitian_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  plan_id uuid REFERENCES client_plans(id),
  message_text text NOT NULL,
  message_type text DEFAULT 'encouragement', -- 'encouragement', 'adjustment', 'milestone'
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

**Composant** :

```jsx
function DietitianMessage({ message }) {
  const obj = useObjective()
  return (
    <div style={{
      padding: 14, borderRadius: 16,
      background: `linear-gradient(135deg, ${obj.accentSoft}, rgba(198,160,91,.04))`,
      border: `1px solid ${obj.accentBorder}`,
      marginBottom: 12,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 14,
          background: obj.accent, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800, color: '#fff',
        }}>AD</div>
        <span style={{ fontSize: 12, fontWeight: 700, color: obj.accent }}>
          Audric, ton dieteticien
        </span>
      </div>
      <div style={{
        fontSize: 13, color: '#1A1A1A', lineHeight: 1.6,
      }}>{message.message_text}</div>
    </div>
  )
}
```

**Placement** : En haut du Plan Tab ou dans un onglet dedie "Messages" (5e onglet dans la tab bar).

---

### P2-2. Milestones et badges deblocables

**Justification scientifique** : Hook Model (Nir Eyal) -- le "Variable Reward" est ce qui rend l'experience addictive. Les recompenses previsibles lassent ; les recompenses inattendues creent de l'anticipation (dopamine). Les apps avec milestones voient un DAU 40-60% superieur.

**Description** : Utiliser la table `user_milestones` pour des badges deblocables.

**Effort** : ~2 jours

**Milestones proposes** :

| Milestone | Condition | Badge |
|---|---|---|
| Premier log | 1 log | "Premier pas" |
| 3 jours de suite | streak = 3 | "Lancee" |
| 7 jours de suite | streak = 7 | "Semaine complete" |
| 30 jours de suite | streak = 30 | "Mois en or" |
| 100% du jour | day kcal entre 95-105% | "Journee parfaite" |
| 5 journees parfaites | cumul | "Regularite" |
| Premiere mesure | 1 mesure ajoutee | "Le suivi commence" |
| Score > 80 | 1 bilan > 80 | "Solide" |
| Tous les conseils lus | readSet.size === ADVICES.length | "Savant" |

```jsx
function MilestoneUnlocked({ milestone, onDismiss }) {
  return (
    <div className="overlay" onClick={onDismiss}>
      <div style={{
        background: '#fff', borderRadius: 24, padding: '32px 24px',
        textAlign: 'center', maxWidth: 300, margin: '0 auto',
        animation: 'fadeUp 0.4s ease-out',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#1A1A1A' }}>
          {milestone.title}
        </div>
        <div style={{
          fontSize: 13, color: '#6B7280', marginTop: 8, lineHeight: 1.6,
        }}>{milestone.description}</div>
        <button className="btn-primary" onClick={onDismiss}
          style={{ marginTop: 20 }}>
          Super !
        </button>
      </div>
    </div>
  )
}
```

---

### P2-3. Weekly Challenge (variation)

**Justification scientifique** : La monotonie est le facteur #1 d'abandon a long terme (meta-analyse PMC 2023). Introduire de la variabilite (Variable Reward, Hook Model) maintient l'engagement.

**Description** : Un mini-challenge hebdomadaire affiche en haut du Plan Tab.

**Exemples** :
- "Cette semaine : essaie un nouveau fruit"
- "Challenge : 5 jours sans hors-plan"
- "Defis proteines : atteins ta cible P chaque jour"

**Effort** : ~1 jour

```jsx
function WeeklyChallenge({ weekNumber }) {
  const obj = useObjective()
  const challenges = [
    { text: "Essaie un fruit que tu n'as pas encore logge", reward: "+1 badge variete" },
    { text: "Atteins ta cible proteines 5 jours sur 7", reward: "Challenge proteines" },
    { text: "Zero hors-plan cette semaine", reward: "Discipline en or" },
    { text: "Logge tes 3 repas principaux chaque jour", reward: "Regularite" },
  ]
  const challenge = challenges[weekNumber % challenges.length]

  return (
    <div style={{
      padding: '12px 16px', borderRadius: 14,
      background: `linear-gradient(135deg, rgba(15,30,46,.03), ${obj.accentSoft})`,
      border: `1px solid ${obj.accentBorder}`,
      display: 'flex', alignItems: 'center', gap: 12,
      marginBottom: 12,
    }}>
      <span style={{ fontSize: 20, flexShrink: 0 }}>🎯</span>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: obj.accent, textTransform: 'uppercase', letterSpacing: '.5px' }}>
          Challenge de la semaine
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', marginTop: 2 }}>
          {challenge.text}
        </div>
      </div>
    </div>
  )
}
```

---

### P2-4. Micro-animation du ring kcal

**Description** : Animer le ring quand les kcal changent pour renforcer le feedback visuel.

**Effort** : ~0.5 jour

```css
/* Ajouter au CSS inline */
@keyframes ringPulse {
  0% { filter: drop-shadow(0 0 0 transparent) }
  50% { filter: drop-shadow(0 0 8px var(--accent)) }
  100% { filter: drop-shadow(0 0 0 transparent) }
}
.ring-updated {
  animation: ringPulse 0.6s ease-out;
}
```

Et dans le composant, declencher la classe quand `dayNut.kcal` change (via un `useEffect` + `useState` pour le flag d'animation).

---

### P2-5. Quick-add depuis le slot (derniers items)

**Justification** : Reduire la friction (Fogg: Ability). Si le patient mange la meme chose au petit-dej chaque jour, le forcer a naviguer Plan -> item -> stepper -> valider est trop long.

**Description** : Afficher les 2-3 derniers items logges dans ce slot comme chips cliquables.

**Effort** : ~1 jour

```jsx
function QuickAddChips({ slotId, recentLogs, onQuickLog }) {
  const { getLogLabel } = useHelpers()
  // Derniers 3 eq uniques logges dans ce slot
  const recent = []
  const seen = new Set()
  for (const l of recentLogs.slice().reverse()) {
    if (l.slotId !== slotId) continue
    const key = `${l.eqId}:${l.itemId}`
    if (seen.has(key)) continue
    seen.add(key)
    recent.push(l)
    if (recent.length >= 3) break
  }

  if (recent.length === 0) return null

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
      {recent.map(l => (
        <button key={`${l.eqId}:${l.itemId}`} onClick={() => onQuickLog(l)} style={{
          padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
          background: 'rgba(15,30,46,.04)', border: '1px solid rgba(15,30,46,.08)',
          color: '#6B7280', cursor: 'pointer', fontFamily: 'inherit',
        }}>
          + {getLogLabel(l.eqId, l.itemId)}
        </button>
      ))}
    </div>
  )
}
```

---

## 6. Synthese et roadmap

### Matrice impact/effort

```
        IMPACT
  Eleve  |  P0-2 Streaks      P0-1 Onboarding    P0-3 Notifications
         |  P1-1 Celebrations  P2-2 Milestones     P2-1 Messages diet
         |
  Moyen  |  P1-2 Empty states  P1-3 Eval persist   P2-3 Weekly challenge
         |  P1-5 Delete log    P1-6 Splash          P2-5 Quick-add
         |
  Faible |  P1-4 Fix mock data                     P2-4 Ring animation
         +--------------------------------------------------
            Faible              Moyen               Eleve    EFFORT
```

### Ordre d'implementation recommande

| Phase | Items | Duree estimee |
|---|---|---|
| **Sprint 1** | P0-1 Onboarding + P1-2 Empty states + P1-6 Splash | ~3 jours |
| **Sprint 2** | P0-2 Streaks + P1-1 Celebrations + P1-4 Fix mock | ~3 jours |
| **Sprint 3** | P0-3 Notifications + P1-3 Eval persist + P1-5 Delete | ~3 jours |
| **Sprint 4** | P2-2 Milestones + P2-3 Challenges + P2-5 Quick-add | ~3 jours |
| **Sprint 5** | P2-1 Messages diet + P2-4 Ring animation | ~4 jours |

### Principes directeurs

1. **Fogg B=MAP** : Chaque feature doit augmenter la Motivation (celebrations, streaks), l'Ability (quick-add, empty states) ou le Prompt (notifications, reminders).

2. **SDT** : Autonomie (choix hors plan sans culpabilite), Competence (streaks, milestones, scores), Relatedness (messages du diet).

3. **Hook Model** : Trigger (notifications) -> Action (log rapide) -> Variable Reward (celebrations aleatoires, milestones inattendus) -> Investment (streak, historique, mesures).

4. **Coherence Elevia** : Ton premium, pas de gamification infantile. Les badges sont sobres ("Premier pas", "Mois en or"), pas des confettis. Le design reste Apple-like.

---

### References scientifiques

- BJ Fogg, *Tiny Habits: The Small Changes That Change Everything* (2020) -- Fogg Behavior Model (B=MAP)
- Nir Eyal, *Hooked: How to Build Habit-Forming Products* (2014) -- Hook Model (Trigger-Action-Reward-Investment)
- Ryan & Deci, *Self-Determination Theory and the Facilitation of Intrinsic Motivation* (2000) -- Autonomy, Competence, Relatedness
- Forrester 2024, *Mobile App Retention* -- streaks + milestones = -35% churn 30 jours
- Appcues 2024, *Mobile Onboarding Best Practices* -- onboarding interactif = 2x retention D7
- Simon-Kucher 2024, *How Digital Health Offerings Can Promote Behavioral Changes with Effective UX Design*
- PMC (2023), *Behavior Change Effectiveness Using Nutrition Apps in People With Chronic Diseases: Scoping Review*
- PMC (2024), *The use of internet-based smartphone apps consistently improved consumers' healthy eating behaviors*
