# Smart Feedback System -- Specification complete

> **Date** : 27 fevrier 2026
> **Perimetre** : Systeme de bilans, feedbacks, messages contextuels, pop-ups, snackbars
> **Objectif** : Que l'app "vive" intelligemment sans etre intrusive

---

## Table des matieres

1. [Decision architecturale : Rules Engine leger](#1-decision-architecturale)
2. [Inventaire de l'existant](#2-inventaire-de-lexistant)
3. [Le moteur de feedback : `useFeedbackEngine`](#3-le-moteur-de-feedback)
4. [Couche 1 -- Snackbars post-action](#4-couche-1--snackbars-post-action)
5. [Couche 2 -- Bannieres contextuelles](#5-couche-2--bannieres-contextuelles)
6. [Couche 3 -- Pop-ups educatifs (one-shot)](#6-couche-3--pop-ups-educatifs)
7. [Couche 4 -- Bilan hebdomadaire complet](#7-couche-4--bilan-hebdomadaire)
8. [Couche 5 -- Messages du dieteticien](#8-couche-5--messages-du-dieteticien)
9. [Catalogue complet des regles](#9-catalogue-complet-des-regles)
10. [Schema DB et migration](#10-schema-db-et-migration)
11. [Implementation detaillee](#11-implementation-detaillee)

---

## 1. Decision architecturale

### La question

Les regles d'affichage (conditions, messages, timing) doivent-elles etre :
1. Codees en dur (simple mais rigide)
2. Stockees en Supabase (flexible mais complexe)
3. Un mix des deux

### La reponse : Option 3 -- Mix intelligent

**Principe** : la *logique de declenchement* est dans le code (car elle depend de l'etat local : logs du jour, heure, navigation). Les *contenus des messages* sont dans une table Supabase (car Audric voudra les modifier sans deployer).

```
┌─────────────────────────────────────────────┐
│  SUPABASE : feedback_rules                   │
│  (contenu, ton, variantes, actif/inactif)    │
│  → Le dieteticien peut modifier les textes   │
└────────────────┬────────────────────────────┘
                 │ fetch au login (cache local)
                 ▼
┌─────────────────────────────────────────────┐
│  CLIENT : useFeedbackEngine                  │
│  (logique de declenchement, conditions,      │
│   priorite, cooldowns, state local)          │
│  → Le code decide QUAND afficher             │
└────────────────┬────────────────────────────┘
                 │ events
                 ▼
┌─────────────────────────────────────────────┐
│  UI : FeedbackLayer                          │
│  (snackbars, bannieres, pop-ups, modals)     │
│  → Le composant decide COMMENT afficher      │
└─────────────────────────────────────────────┘
```

**Pourquoi ce mix** :

| Aspect | En dur (code) | En Supabase (table) |
|---|---|---|
| Conditions de declenchement | OUI -- depend du state React | NON |
| Textes des messages | NON | OUI -- modifiable par Audric |
| Priorite / ordre | OUI -- gere par le moteur | Metadata (champ `priority`) |
| Activation/desactivation | NON | OUI -- champ `is_active` |
| Cooldown apres affichage | OUI -- localStorage | NON |
| Variantes par objectif | NON | OUI -- champ `objective_codes` |

**Avantages** :
- Audric peut changer les textes depuis Supabase Dashboard sans toucher au code
- La logique complexe (timing, conditions multi-facteurs) reste dans React ou elle a acces au state
- Pas d'over-engineering : pas besoin de DSL, de parser de regles, de moteur Rete
- Les regles sont listees dans un fichier de config local comme fallback (offline)

**Ce qu'on ne fait PAS** :
- Pas de editeur visuel de regles (trop tot)
- Pas de A/B testing de messages (pas assez de patients)
- Pas de ML pour personnaliser (un seul dieteticien)

---

## 2. Inventaire de l'existant

### Ce qui existe deja

| Element | Ou | Etat |
|---|---|---|
| Snackbar post-log | `PlanTab:593` | Minimal : `"checkmark {nom} ajoute"`, disparait apres 2.5s, pas d'animation |
| Education hors-plan | `AddModal:486-496` | Un seul pop-up one-shot au premier log hors-plan |
| Evaluation semaine | `AdviceTab:750-757` | Modal avec scoring par axe, mais `evalScores` est un useState local -- perdu au refresh |
| dayHint | `PlanTab:611` | Texte statique fixe sous les macros du jour, jamais change |
| weekAlertTitle/Msg | `WeekView:644` | Alerte dans la vue semaine -- statique, pas conditionnelle |
| BilanDetail | `HistoryTab:762-790` | Affichage d'un bilan avec score + texte -- mais pas de creation de bilan |
| Micro-tips rotatifs | `AdviceTab:738` | Rotation manuelle ("Suivant ->"), pas automatique, pas contextuel |

### Ce qui existe en DB mais n'est pas connecte

| Table | Colonnes cles | Potentiel |
|---|---|---|
| `weekly_bilans` | `energy_level`, `hunger_level`, `sleep_quality`, `stress_level`, `dietitian_feedback` | 5 colonnes non-utilisees dans l'UI |
| `user_streaks` | `streak_type`, `current_count`, `longest_count`, `last_activity_date` | Gamification prete |
| `user_milestones` | `milestone_type`, `milestone_value`, `achieved_at` | Badges deblocables |
| `notifications` | 17 colonnes | Table infrastructure complete, jamais utilisee |

### Ce qui manque completement

- Aucune table de regles de feedback
- Aucun mecanisme de cooldown ("ne pas remontrer avant X jours")
- Aucun tracking de "premiere fois" (first log, first HP, first bilan, first measurement)
- Aucune logique conditionnelle (si pas de log depuis 3h, si streak risque de casser, etc.)
- Le bilan n'est PAS cree par l'app (seeds uniquement)

---

## 3. Le moteur de feedback : `useFeedbackEngine`

### Architecture

Le moteur est un hook React qui :
1. Charge les regles depuis Supabase (cache localStorage, TTL 24h)
2. Evalue les conditions a chaque render significatif
3. Gere la queue de feedbacks avec priorites
4. Respecte les cooldowns

```
useFeedbackEngine({
  logs,            // logs du jour
  weekConsumed,    // conso semaine
  dayTargets,      // cibles jour
  weekTargets,     // cibles semaine
  streak,          // depuis useStreaks
  milestones,      // depuis useMilestones
  bilans,          // historique bilans
  objective,       // config objectif
  measurements,    // historique mesures
})
→ {
  snackbar: { message, type, action } | null,
  banner: { message, type, dismissable } | null,
  popup: { id, title, body, cta, onDismiss } | null,
  bilanReady: boolean,
  showSnackbar(msg, type),
  dismissBanner(id),
  dismissPopup(id),
  markSeen(ruleId),
}
```

### Les 5 couches de feedback

```
Priorite basse ← ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ → Priorite haute

[Snackbar]  [Banniere]  [Pop-up educatif]  [Bilan hebdo]  [Message diet]
 2-3 sec     persistant   one-shot           modal complet   asynch
 post-action  contextuel  premier usage       dimanche        diet→patient
```

**Regle de base** : jamais 2 feedbacks a la fois. La couche superieure override la couche inferieure.

### Priorite et anti-spam

```js
const PRIORITY = {
  SNACKBAR: 10,        // bref, post-action immediate
  BANNER_INFO: 20,     // bandeau doux, contextuel
  BANNER_ALERT: 30,    // bandeau important (streak en danger)
  POPUP_EDUCATIONAL: 40, // modal educatif one-shot
  POPUP_MILESTONE: 50, // celebration milestone
  BILAN_WEEKLY: 60,    // bilan complet dimanche
  MESSAGE_DIET: 70,    // message du dieteticien (toujours prioritaire)
}

// Cooldowns : empeche le re-affichage
const COOLDOWNS = {
  banner_no_log_today: 4 * 3600 * 1000,     // 4h entre rappels
  banner_streak_danger: 12 * 3600 * 1000,    // 12h
  popup_educational: Infinity,                // one-shot (jamais re-affiche)
  popup_milestone: Infinity,                  // one-shot
  snackbar_celebration: 0,                    // toujours (post-action)
}
```

---

## 4. Couche 1 -- Snackbars post-action

### Principe

Le snackbar apparait 0-1 seconde apres une action du patient. Il est court (1 ligne), positif, et disparait seul apres 2.5-3 secondes.

### Regles de snackbar

| ID | Declencheur | Condition | Messages (variantes) | Ton |
|---|---|---|---|---|
| `snack_log_basic` | Apres chaque log | Toujours | "Ajoute", "{nom} ajoute" | Neutre |
| `snack_log_streak_new` | Apres 1er log du jour | `streak.lastLogDate !== today` | "1er ajout du jour -- ta serie continue !", "Jour {N} de suite !" | Encourageant |
| `snack_log_slot_done` | Log qui complete un slot | Toutes les EQ du slot logguees | "Petit-dej complet !", "Repas du midi -- done" | Celebrant |
| `snack_log_day_target` | Log qui fait passer le ring >=95% | `dayNut.kcal / dayTargets.kcal >= 0.95` pour la 1ere fois du jour | PW: "Budget du jour bien gere !" / GAIN: "Objectif atteint !" | Celebrant |
| `snack_log_hp_first` | 1er log hors-plan de la semaine | `!weekHasHP && log.isOutOfPlan` | "Logger c'est deja bien. L'honnetete fait partie du plan." | Bienveillant |
| `snack_log_hp_many` | 3e+ log hors-plan du jour | `hpCountToday >= 3` | "Journee gourmande ? Pas de souci -- repere indicatif." | Deculpabilisant |
| `snack_eval_saved` | Evaluation hebdo enregistree | Toujours | "Evaluation enregistree. Bravo pour ta reflexion." | Valorisant |
| `snack_measure_saved` | Mesure ajoutee | Toujours | "Mesure enregistree. Le suivi fait la difference." | Encourageant |

### Logique de selection

```js
// Dans handleLog (PlanTab), remplacer le snackbar existant :
function getPostLogSnackbar(log, { logs, dayNut, dayTargets, obj, streak, weekConsumed }) {
  const today = new Date().toISOString().slice(0, 10)
  const isFirstLogToday = streak.lastLogDate !== today
  const dayPct = (dayNut.kcal + log.kcal) / dayTargets.kcal
  const wasUnderTarget = dayNut.kcal / dayTargets.kcal < 0.95
  const hpCountToday = logs.filter(l => l.isOutOfPlan).length

  // Priorite decroissante : le premier match gagne
  if (isFirstLogToday && streak.current > 0) {
    return { msg: `Jour ${streak.current + 1} de suite !`, type: 'celebration' }
  }
  if (wasUnderTarget && dayPct >= 0.95) {
    const msgs = obj.progressDir === 'down'
      ? ['Budget du jour bien gere !', 'Tu es dans la zone !']
      : ['Objectif atteint !', 'Cible du jour validee !']
    return { msg: msgs[Math.floor(Math.random() * msgs.length)], type: 'celebration' }
  }
  if (log.isOutOfPlan && hpCountToday === 0) {
    return { msg: "Logger c'est deja bien.", type: 'supportive' }
  }

  // Default : variants aleatoires pour eviter la monotonie
  const defaults = [
    `${getLogLabel(log.eqId, log.itemId)} ajoute`,
    'Ajoute !',
    'Bien joue',
    'On avance',
    'Parfait',
  ]
  return { msg: defaults[Math.floor(Math.random() * defaults.length)], type: 'basic' }
}
```

### Style des snackbars par type

```jsx
function Snackbar({ message, type, onDismiss }) {
  const obj = useObjective()
  const styles = {
    basic:       { bg: '#1A1A1A', color: '#fff', icon: null },
    celebration: { bg: obj.accent, color: '#fff', icon: '🎯' },
    supportive:  { bg: '#1A1A1A', color: '#fff', icon: '💪' },
    warning:     { bg: '#E8863A', color: '#fff', icon: null },
  }
  const s = styles[type] || styles.basic

  return (
    <div style={{
      position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
      padding: '10px 20px', borderRadius: 14,
      background: s.bg, color: s.color,
      fontSize: 13, fontWeight: 700,
      display: 'flex', alignItems: 'center', gap: 8,
      boxShadow: '0 8px 32px rgba(0,0,0,.25)',
      animation: 'snackPop 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      zIndex: 100,
    }}>
      {s.icon && <span>{s.icon}</span>}
      {message}
    </div>
  )
}
```

---

## 5. Couche 2 -- Bannieres contextuelles

### Principe

Les bannieres sont des messages non-bloquants qui apparaissent dans le flow normal de la page. Elles restent visibles jusqu'a ce que le patient les dismiss ou que la condition ne soit plus remplie.

### Regles de banniere

| ID | Declencheur | Condition | Message | Emplacement | Cooldown |
|---|---|---|---|---|---|
| `ban_morning_no_log` | Ouverture app, 9h-12h | 0 logs aujourd'hui | "Bonjour ! Commence par ton petit-dejeuner." | Haut de PlanTab | 4h |
| `ban_midday_no_log` | Ouverture app, 12h-14h | 0 logs repas midi | "C'est l'heure du dejeuner. Pense a logger." | Haut de PlanTab | 4h |
| `ban_evening_no_log` | Ouverture app, 18h-21h | 0 logs repas soir | "Bon appetit ! N'oublie pas de logger ton diner." | Haut de PlanTab | 4h |
| `ban_streak_danger` | Ouverture app, apres 20h | `streak.current > 2 && noLogToday` | "Ta serie de {N} jours est en jeu. Un seul ajout suffit !" | Haut de PlanTab | 12h |
| `ban_weekly_behind` | Vue Semaine | `weekPct < 50% && dayOfWeek >= 4` (jeudi+) | "Tu es en retard cette semaine. Concentre-toi sur les EQ cles." | Haut de WeekView | 24h |
| `ban_protein_low` | Apres 15h | `dayProtein < 50% target && hour >= 15` | "Tes proteines sont un peu basses. Ajoute une source au prochain repas." | Sous macros PlanTab | 6h |
| `ban_great_day` | Ring >= 95% | `dayPct >= 0.95 && dayPct <= 1.1` | PW: "Journee bien geree !" / GAIN: "Super journee, continue !" | Haut de PlanTab | 24h |
| `ban_bilan_available` | Dimanche | `dayOfWeek === 0 && !bilanThisWeek` | "C'est dimanche -- ton bilan de la semaine est pret." | Haut de AdviceTab | 24h |

### Composant banniere

```jsx
function FeedbackBanner({ rule, onDismiss }) {
  const obj = useObjective()
  const toneStyles = {
    info:    { bg: obj.accentSoft, border: obj.accentBorder, icon: '💡', color: '#1A1A1A' },
    nudge:   { bg: 'rgba(59,130,246,.06)', border: 'rgba(59,130,246,.15)', icon: '👋', color: '#1A1A1A' },
    alert:   { bg: 'rgba(232,134,58,.06)', border: 'rgba(232,134,58,.2)', icon: '⚡', color: '#E8863A' },
    success: { bg: 'rgba(52,199,89,.06)', border: 'rgba(52,199,89,.15)', icon: '✓', color: '#34C759' },
  }
  const s = toneStyles[rule.tone] || toneStyles.info

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '12px 14px', borderRadius: 14,
      background: s.bg, border: `1px solid ${s.border}`,
      marginBottom: 12,
      animation: 'fadeUp 0.3s ease-out',
    }}>
      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: s.color, lineHeight: 1.5 }}>
          {rule.message}
        </div>
        {rule.action && (
          <button onClick={rule.action.handler} style={{
            marginTop: 6, background: 'none', border: 'none', padding: 0,
            fontSize: 12, fontWeight: 700, color: obj.accent, cursor: 'pointer',
          }}>{rule.action.label} →</button>
        )}
      </div>
      {onDismiss && (
        <button onClick={() => onDismiss(rule.id)} style={{
          background: 'none', border: 'none', padding: 4,
          fontSize: 14, color: 'rgba(15,30,46,.25)', cursor: 'pointer',
        }}>×</button>
      )}
    </div>
  )
}
```

### Logique de declenchement

```js
function evaluateBanners({ logs, dayNut, dayTargets, weekConsumed, weekTargets, streak, obj, bilans }) {
  const now = new Date()
  const hour = now.getHours()
  const dow = now.getDay() // 0=dimanche
  const today = now.toISOString().slice(0, 10)
  const logsToday = logs.length
  const dayPct = dayNut.kcal / dayTargets.kcal
  const protPct = dayNut.p / dayTargets.p
  const noLogToday = streak.lastLogDate !== today

  const active = []

  // Rappels temporels
  if (hour >= 9 && hour < 12 && logsToday === 0) {
    active.push({ id: 'ban_morning_no_log', message: 'Bonjour ! Commence par ton petit-dejeuner.', tone: 'nudge', priority: 20, cooldown: 4 * 3600000 })
  }
  if (hour >= 12 && hour < 14 && !logs.some(l => l.slotId === 'coldMeal')) {
    active.push({ id: 'ban_midday_no_log', message: "C'est l'heure du dejeuner. Pense a logger.", tone: 'nudge', priority: 20, cooldown: 4 * 3600000 })
  }
  if (hour >= 18 && hour < 21 && !logs.some(l => l.slotId === 'hotMeal')) {
    active.push({ id: 'ban_evening_no_log', message: "Bon appetit ! N'oublie pas de logger ton diner.", tone: 'nudge', priority: 20, cooldown: 4 * 3600000 })
  }

  // Streak en danger
  if (hour >= 20 && noLogToday && streak.current > 2) {
    active.push({
      id: 'ban_streak_danger',
      message: `Ta serie de ${streak.current} jours est en jeu. Un seul ajout suffit !`,
      tone: 'alert', priority: 30, cooldown: 12 * 3600000,
    })
  }

  // Proteines basses
  if (hour >= 15 && protPct < 0.5 && logsToday > 0) {
    active.push({
      id: 'ban_protein_low',
      message: 'Tes proteines sont un peu basses. Ajoute une source au prochain repas.',
      tone: 'info', priority: 20, cooldown: 6 * 3600000,
    })
  }

  // Bonne journee
  if (dayPct >= 0.95 && dayPct <= 1.1) {
    const msg = obj.progressDir === 'down' ? 'Journee bien geree !' : 'Super journee, continue !'
    active.push({ id: 'ban_great_day', message: msg, tone: 'success', priority: 15, cooldown: 24 * 3600000 })
  }

  // Bilan disponible dimanche
  if (dow === 0) {
    const bilanThisWeek = bilans.some(b => {
      const ws = new Date(b.weekStart)
      return ws.toISOString().slice(0, 10) >= getWeekStart(now)
    })
    if (!bilanThisWeek) {
      active.push({
        id: 'ban_bilan_available',
        message: "C'est dimanche -- ton bilan de la semaine est pret.",
        tone: 'info', priority: 35, cooldown: 24 * 3600000,
        action: { label: 'Faire mon bilan', handler: () => { /* navigate to AdviceTab + open eval */ } },
      })
    }
  }

  // Filtrer par cooldown (check localStorage)
  return active
    .filter(rule => !isCoolingDown(rule.id, rule.cooldown))
    .sort((a, b) => b.priority - a.priority)
}
```

---

## 6. Couche 3 -- Pop-ups educatifs (one-shot)

### Principe

Pop-ups modaux qui apparaissent UNE SEULE FOIS a des moments cles du parcours. Apres fermeture, ils ne reviennent jamais. Geres via `localStorage` (set `seen_popup_{id}`).

### Catalogue de pop-ups educatifs

| ID | Declencheur | Titre | Corps | CTA |
|---|---|---|---|---|
| `edu_first_log` | Apres le tout 1er log | "Premier ajout !" | "Bien joue pour ce premier pas. Chaque ajout compte dans ta progression. L'equilibre se fait sur la semaine, pas sur un seul repas." | "Compris" |
| `edu_first_hp` | 1er log hors-plan (existe deja partiellement) | "Tu peux le faire" | "{obj.hpEducation}" -- texte objectif-specifique deja dans objectiveConfig | "Compris" |
| `edu_first_bilan` | Dimanche, 1ere semaine complete | "Ton premier bilan" | "Chaque dimanche, tu peux evaluer ta semaine. Le score n'est pas une note -- c'est un repere pour voir ta progression dans le temps." | "Voir mon bilan" |
| `edu_week_view` | 1ere visite de la vue Semaine | "La vue Semaine" | "Ici tu vois combien de portions tu as mangees par equivalence. Les barres te montrent ou tu en es. L'objectif n'est pas la perfection -- c'est la constance." | "Compris" |
| `edu_first_measurement` | 1ere mesure ajoutee | "Le suivi commence" | "Tes mesures sont la pour toi, pas pour te juger. Le poids peut varier de 1-2 kg dans la journee -- c'est normal. Ce qui compte, c'est la tendance sur plusieurs semaines." | "Compris" |
| `edu_streak_3` | Streak atteint 3 | "3 jours de suite !" | "Tu as logge 3 jours consecutifs. C'est le debut d'une habitude. Les etudes montrent qu'apres 3 jours, le comportement commence a se stabiliser." | "On continue" |
| `edu_streak_7` | Streak atteint 7 | "Une semaine complete !" | "7 jours de suite. Tu es en train de construire une vraie habitude. La plupart des patients qui tiennent 7 jours atteignent leurs objectifs." | "Merci" |
| `edu_streak_30` | Streak atteint 30 | "Un mois !" | "30 jours. C'est officiellement une habitude. Tu fais partie des patients les plus reguliers. Continue, les resultats suivent." | "Impressionnant" |
| `edu_score_drop` | Score bilan chute de >15 pts | "Semaine difficile ?" | "Ton score a baisse cette semaine, et c'est OK. Une semaine difficile ne definit pas ta progression. Reviens a l'essentiel : les 2-3 equivalences les plus importantes." | "C'est reparti" |
| `edu_first_advice_read` | 1er conseil lu (clic sur AdvItem) | "Tes conseils" | "Les conseils sont classes par priorite. Pas besoin de tout suivre d'un coup -- concentre-toi sur un seul axe prioritaire par semaine." | "Compris" |

### Composant pop-up educatif

```jsx
function EducationalPopup({ popup, onDismiss }) {
  const obj = useObjective()
  return (
    <div className="overlay" onClick={onDismiss}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{
        maxHeight: '55%', textAlign: 'center', padding: '24px 20px',
      }}>
        <div className="modal-handle" />
        {popup.icon && <div style={{ fontSize: 40, marginBottom: 12 }}>{popup.icon}</div>}
        <div className="modal-title">{popup.title}</div>
        <div style={{
          fontSize: 13, color: '#1A1A1A', lineHeight: 1.7,
          marginTop: 12, textAlign: 'left',
        }}>{popup.body}</div>
        <button className="btn-primary" onClick={() => {
          markPopupSeen(popup.id)
          onDismiss()
        }} style={{ marginTop: 20 }}>{popup.cta}</button>
      </div>
    </div>
  )
}

// Gestion one-shot
function hasSeenPopup(id) {
  return localStorage.getItem(`elevia_seen_${id}`) === '1'
}
function markPopupSeen(id) {
  localStorage.setItem(`elevia_seen_${id}`, '1')
}
```

### Logique de declenchement

```js
function evaluatePopups({ logs, streak, milestones, bilans, isFirstEver }) {
  // Ne checker que si pas deja vu
  const candidates = []

  if (logs.length === 1 && !hasSeenPopup('edu_first_log')) {
    candidates.push({
      id: 'edu_first_log', icon: '🎉', priority: 40,
      title: 'Premier ajout !',
      body: "Bien joue pour ce premier pas. Chaque ajout compte...",
      cta: 'Compris',
    })
  }

  if (streak.current === 3 && !hasSeenPopup('edu_streak_3')) {
    candidates.push({
      id: 'edu_streak_3', icon: '✨', priority: 50,
      title: '3 jours de suite !',
      body: "Tu as logge 3 jours consecutifs...",
      cta: 'On continue',
    })
  }

  if (streak.current === 7 && !hasSeenPopup('edu_streak_7')) {
    candidates.push({
      id: 'edu_streak_7', icon: '🔥', priority: 50,
      title: 'Une semaine complete !',
      body: "7 jours de suite. Tu es en train de construire une vraie habitude...",
      cta: 'Merci',
    })
  }

  if (streak.current === 30 && !hasSeenPopup('edu_streak_30')) {
    candidates.push({
      id: 'edu_streak_30', icon: '🏆', priority: 50,
      title: 'Un mois !',
      body: "30 jours. C'est officiellement une habitude...",
      cta: 'Impressionnant',
    })
  }

  // Score drop
  if (bilans.length >= 2) {
    const last = bilans[0].score
    const prev = bilans[1].score
    if (prev - last > 15 && !hasSeenPopup(`edu_score_drop_${bilans[0].week}`)) {
      candidates.push({
        id: `edu_score_drop_${bilans[0].week}`, icon: '💪', priority: 45,
        title: 'Semaine difficile ?',
        body: "Ton score a baisse cette semaine, et c'est OK...",
        cta: "C'est reparti",
      })
    }
  }

  return candidates.sort((a, b) => b.priority - a.priority)
}
```

---

## 7. Couche 4 -- Bilan hebdomadaire complet

### Etat actuel vs. ce qui devrait exister

**Actuel** :
- Modal d'evaluation dans AdviceTab (scoring par axe de conseil) -> useState local -> perdu
- BilanDetail dans HistoryTab : affiche score + texte statique
- `useWeeklyBilans.createBilan()` accepte 5 colonnes qualitatives (energy, hunger, sleep, stress) mais n'est JAMAIS appele
- Bilans crees uniquement via seeds

**Cible** :
- Formulaire complet dimanche soir
- Score calcule automatiquement depuis les food_logs
- Questions bien-etre (energy, hunger, sleep, stress)
- Retour diet (dietitian_feedback) affiche si present
- Sauvegarde en DB via createBilan
- Message contextuel base sur le score et la tendance

### Flow du bilan

```
Dimanche, ouverture de l'app
     │
     ▼
Banniere "Ton bilan est pret" (couche 2)
     │ clic "Faire mon bilan"
     ▼
┌─────────────────────────────┐
│  MODAL BILAN - Etape 1/3    │
│  Resume automatique          │
│                              │
│  Score adherence : 78        │
│  (calcule depuis food_logs)  │
│                              │
│  kcal : 92% de la cible     │
│  P : 85% | L : 102% | G : 88│
│  Hors plan : 3 ajouts (180kc)│
│  Streak : 5 jours            │
│                              │
│  [Suivant →]                 │
└─────────────────────────────┘
     │
     ▼
┌─────────────────────────────┐
│  MODAL BILAN - Etape 2/3    │
│  Comment te sens-tu ?        │
│                              │
│  Energie   ○ ○ ● ○ ○        │
│  Faim      ○ ● ○ ○ ○        │
│  Sommeil   ○ ○ ○ ● ○        │
│  Stress    ○ ○ ● ○ ○        │
│                              │
│  Notes (optionnel) :         │
│  ┌──────────────────┐       │
│  │                  │       │
│  └──────────────────┘       │
│                              │
│  [← Retour]  [Suivant →]    │
└─────────────────────────────┘
     │
     ▼
┌─────────────────────────────┐
│  MODAL BILAN - Etape 3/3    │
│  Message personnalise        │
│                              │
│  Score >= 80:                │
│  "Excellente semaine ! Tu as │
│   suivi ton plan avec        │
│   constance..."              │
│                              │
│  Score 60-80:                │
│  "Bonne dynamique..."        │
│                              │
│  Score < 60:                 │
│  "Semaine difficile ?..."    │
│                              │
│  {dietitian_feedback si dispo}│
│                              │
│  [Enregistrer]               │
└─────────────────────────────┘
     │
     ▼
Snackbar "Bilan enregistre. Bravo pour ta reflexion."
Pop-up milestone si pertinent (1er bilan, 4 bilans de suite, etc.)
```

### Calcul automatique du score d'adherence

```js
/**
 * Calcule le score d'adherence 0-100 a partir des food_logs de la semaine.
 *
 * Methode :
 * - Pour chaque EQ du plan, ratio = min(consumed / target, 1.3)
 * - Si ratio entre 0.8 et 1.2 : score plein (10 pts)
 * - Si ratio entre 0.5 et 0.8 ou 1.2 et 1.5 : score partiel (6 pts)
 * - Sinon : 0 pts
 * - Malus hors-plan : -2 pts par ajout HP au-dela du 3e
 * - Score final normalise 0-100
 */
function calculateAdherenceScore(weekConsumed, planTargets, hpCount) {
  const eqIds = Object.keys(planTargets)
  if (eqIds.length === 0) return 0

  let totalScore = 0
  const maxScore = eqIds.length * 10

  for (const eqId of eqIds) {
    const target = planTargets[eqId]
    const consumed = weekConsumed[eqId] || 0
    if (target === 0) { totalScore += 10; continue }

    const ratio = consumed / target

    if (ratio >= 0.8 && ratio <= 1.2) {
      totalScore += 10 // Dans la zone
    } else if ((ratio >= 0.5 && ratio < 0.8) || (ratio > 1.2 && ratio <= 1.5)) {
      totalScore += 6  // Proche
    } else if (ratio > 0 && ratio < 0.5) {
      totalScore += 2  // Au moins essaye
    }
    // ratio === 0 ou ratio > 1.5 : 0 points
  }

  // Malus hors-plan (au-dela de 3 HP)
  const hpMalus = Math.max(0, hpCount - 3) * 2
  const rawScore = Math.max(0, (totalScore / maxScore) * 100 - hpMalus)
  return Math.round(Math.min(100, rawScore))
}
```

### Messages personnalises par objectif et score

```js
/**
 * Genere le message de fin de bilan. Tient compte de :
 * - L'objectif (PW, GAIN_*, MAINT)
 * - Le score actuel
 * - La tendance (amelioration ou regression)
 * - Le streak
 */
function getBilanMessage({ obj, score, prevScore, streak }) {
  const improving = prevScore != null && score > prevScore
  const declining = prevScore != null && score < prevScore - 10

  if (score >= 85) {
    if (improving) return "Tu progresses de semaine en semaine. C'est exactement la dynamique qu'on veut voir."
    if (streak.current >= 7) return "Excellente semaine, et un streak de " + streak.current + " jours. La regularite paye."
    return obj.bilanSummary[85]
  }

  if (score >= 70) {
    if (improving) return "Tu es en progression, c'est ce qui compte. Continue sur cette lancee."
    return obj.bilanSummary[70]
  }

  if (score >= 55) {
    if (declining) return "Score en baisse cette semaine. C'est normal d'avoir des hauts et des bas. L'essentiel est de revenir au cadre."
    return obj.bilanSummary[55]
  }

  // < 55
  if (obj.progressDir === 'up') {
    // GAIN : le sous-manger est le probleme
    return "Tu n'as pas atteint ta cible cette semaine. Essaie de ne pas sauter de repas -- chaque occasion de manger compte."
  }
  return obj.bilanSummary[0]
}
```

### Composant BilanModal complet

```jsx
function BilanModal({ onClose, onSave, weekConsumed, planTargets, logs, streak, bilans, obj }) {
  const [step, setStep] = useState(1)
  const [wellbeing, setWellbeing] = useState({ energy: 3, hunger: 3, sleep: 3, stress: 3 })
  const [notes, setNotes] = useState('')

  // Calcul auto
  const hpCount = logs.filter(l => l.isOutOfPlan).length
  const score = useMemo(
    () => calculateAdherenceScore(weekConsumed, planTargets, hpCount),
    [weekConsumed, planTargets, hpCount]
  )
  const prevScore = bilans.length > 0 ? bilans[0].score : null
  const message = getBilanMessage({ obj, score, prevScore, streak })
  const dietFeedback = null // TODO: fetch from weekly_bilans.dietitian_feedback

  // Semaine data
  const totalKcal = Object.entries(weekConsumed).reduce((sum, [eqId, qty]) => {
    // approximation
    return sum + qty * 100 // idealement lookup catalogue
  }, 0)

  function handleSave() {
    const { start, end } = getWeekBounds()
    onSave({
      weekStart: start,
      weekEnd: end,
      adherenceScore: score,
      energyLevel: wellbeing.energy,
      hungerLevel: wellbeing.hunger,
      sleepQuality: wellbeing.sleep,
      stressLevel: wellbeing.stress,
      notes,
    })
    onClose()
  }

  const scoreColor = score >= 85 ? '#34C759' : score >= 70 ? obj.accent : score >= 55 ? '#6B7280' : '#E8863A'

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{
        maxHeight: '85%', display: 'flex', flexDirection: 'column',
      }}>
        <div className="modal-handle" />

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 16 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              width: s === step ? 20 : 6, height: 6, borderRadius: 3,
              background: s === step ? obj.accent : 'rgba(15,30,46,.12)',
              transition: 'all .3s',
            }} />
          ))}
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>

          {/* STEP 1 : Resume auto */}
          {step === 1 && <>
            <div className="modal-title">Bilan de la semaine</div>

            {/* Score ring */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
              <div style={{
                width: 80, height: 80, borderRadius: 99,
                background: `${scoreColor}18`, border: `3px solid ${scoreColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 28, color: scoreColor,
              }}>{score}</div>
            </div>
            <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: scoreColor }}>
              {getScoreLabel(obj, score)}
            </div>

            {/* Metrics */}
            <div style={{ marginTop: 20 }}>
              {Object.entries(planTargets).slice(0, 5).map(([eqId, target]) => {
                const consumed = weekConsumed[eqId] || 0
                const pct = target > 0 ? consumed / target : 0
                return (
                  <div key={eqId} style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A', width: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {eqId.replace(/_/g, ' ')}
                    </span>
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(15,30,46,.06)' }}>
                      <div style={{
                        width: `${Math.min(pct * 100, 100)}%`, height: '100%',
                        borderRadius: 3,
                        background: pct >= 0.8 && pct <= 1.2 ? '#34C759' : pct >= 0.5 ? obj.accent : '#E8863A',
                      }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', width: 40, textAlign: 'right' }}>
                      {consumed}/{target}
                    </span>
                  </div>
                )
              })}
            </div>

            {hpCount > 0 && (
              <div style={{
                marginTop: 12, padding: '8px 12px', borderRadius: 10,
                background: 'rgba(232,134,58,.06)', border: '1px solid rgba(232,134,58,.15)',
                fontSize: 12, color: '#E8863A', fontWeight: 600,
              }}>
                {hpCount} ajout{hpCount > 1 ? 's' : ''} hors plan cette semaine
              </div>
            )}
          </>}

          {/* STEP 2 : Bien-etre */}
          {step === 2 && <>
            <div className="modal-title">Comment te sens-tu ?</div>
            <div className="modal-sub" style={{ marginBottom: 20 }}>
              Ces infos restent entre toi et ton dieteticien.
            </div>

            {[
              { key: 'energy', label: 'Energie', low: 'Epuise', high: 'En forme' },
              { key: 'hunger', label: 'Faim', low: 'Affame', high: 'Rassasie' },
              { key: 'sleep', label: 'Sommeil', low: 'Mauvais', high: 'Excellent' },
              { key: 'stress', label: 'Stress', low: 'Eleve', high: 'Zen' },
            ].map(({ key, label, low, high }) => (
              <div key={key} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>
                  {label}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[1, 2, 3, 4, 5].map(v => (
                    <button key={v} onClick={() => setWellbeing(w => ({ ...w, [key]: v }))}
                      style={{
                        flex: 1, padding: '10px 4px', borderRadius: 10,
                        fontSize: 16, cursor: 'pointer', fontFamily: 'inherit',
                        border: wellbeing[key] === v
                          ? `2px solid ${obj.accent}`
                          : '2px solid rgba(15,30,46,.08)',
                        background: wellbeing[key] === v ? obj.accentSoft : '#F7F7F7',
                        transition: 'all .2s',
                      }}>
                      {['😫', '😕', '😐', '🙂', '😁'][v - 1]}
                    </button>
                  ))}
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 10, color: '#6B7280', marginTop: 4, padding: '0 4px',
                }}>
                  <span>{low}</span><span>{high}</span>
                </div>
              </div>
            ))}

            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', marginBottom: 6 }}>
                Notes (optionnel)
              </div>
              <textarea
                value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Un commentaire sur ta semaine..."
                rows={3}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 12,
                  border: '1px solid #E5E7EB', fontSize: 13,
                  fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          </>}

          {/* STEP 3 : Message */}
          {step === 3 && <>
            <div className="modal-title">Ta semaine en un mot</div>

            <div style={{
              marginTop: 20, padding: 16, borderRadius: 16,
              background: `linear-gradient(135deg, ${obj.accentSoft}, rgba(15,30,46,.02))`,
              border: `1px solid ${obj.accentBorder}`,
            }}>
              <div style={{ fontSize: 14, color: '#1A1A1A', lineHeight: 1.7 }}>
                {message}
              </div>
            </div>

            {dietFeedback && (
              <div style={{
                marginTop: 12, padding: 14, borderRadius: 16,
                background: 'rgba(59,130,246,.04)',
                border: '1px solid rgba(59,130,246,.15)',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 12, background: obj.accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800, color: '#fff',
                  }}>AD</div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: obj.accent }}>
                    Audric, ton dieteticien
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#1A1A1A', lineHeight: 1.6 }}>
                  {dietFeedback}
                </div>
              </div>
            )}

            {streak.current >= 5 && (
              <div style={{
                marginTop: 12, padding: '8px 14px', borderRadius: 10,
                background: 'rgba(52,199,89,.06)', border: '1px solid rgba(52,199,89,.15)',
                fontSize: 12, fontWeight: 700, color: '#34C759',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                🔥 Streak : {streak.current} jours de suite
              </div>
            )}
          </>}
        </div>

        {/* Navigation buttons */}
        <div style={{
          display: 'flex', gap: 12, marginTop: 16, flexShrink: 0,
        }}>
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} style={{
              flex: 1, padding: 14, borderRadius: 14,
              border: '1px solid rgba(15,30,46,.12)', background: '#fff',
              fontSize: 14, fontWeight: 700, color: '#6B7280',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>Retour</button>
          )}
          {step < 3 ? (
            <button onClick={() => setStep(s => s + 1)} className="btn-primary"
              style={{ flex: step === 1 ? 1 : 1 }}>
              Suivant
            </button>
          ) : (
            <button onClick={handleSave} className="btn-primary" style={{ flex: 1 }}>
              Enregistrer
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## 8. Couche 5 -- Messages du dieteticien

### Principe

Messages asynchrones du dieteticien vers le patient. Pas un chat bidirectionnel complet -- Audric ecrit via Supabase Dashboard ou un futur back-office, le patient lit dans l'app.

### Types de messages

| Type | Declencheur (cote diet) | Exemple | Affichage |
|---|---|---|---|
| `encouragement` | Manuel par Audric | "Bravo pour cette semaine Martin. Continue comme ca." | Banniere en haut de PlanTab |
| `adjustment` | Changement de plan | "J'ai ajuste ton plan : +1 collation le matin." | Pop-up modal |
| `milestone_comment` | Apres milestone patient | "Tu as tenu 30 jours, c'est enorme. On en reparle a la prochaine consult." | Banniere dans Profil |
| `bilan_feedback` | Apres bilan hebdo | "Score de 82 cette semaine, bravo. Pour la semaine pro, concentre-toi sur tes proteines au dejeuner." | Affiche dans BilanDetail (colonne `dietitian_feedback` existante) |
| `alert` | Observation du diet | "Je vois que tu logges moins cette semaine. Tout va bien ?" | Pop-up modal |

### Schema DB

La table `notifications` (17 colonnes) existe deja mais n'a pas de RLS et n'est pas connectee. Plutot que la reutiliser telle quelle (schema peut-etre inadapte), on cree une table dediee, simple :

```sql
CREATE TABLE IF NOT EXISTS dietitian_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  plan_id uuid REFERENCES client_plans(id),
  message_type text NOT NULL DEFAULT 'encouragement',
    -- CHECK (message_type IN ('encouragement', 'adjustment', 'milestone_comment', 'bilan_feedback', 'alert'))
  title text,
  body text NOT NULL,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE dietitian_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own messages"
  ON dietitian_messages FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users mark as read"
  ON dietitian_messages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Hook

```js
// src/hooks/useDietitianMessages.js
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useDietitianMessages(session) {
  const [messages, setMessages] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const userId = session?.user?.id

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function fetch() {
      const { data } = await supabase
        .from('dietitian_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (!cancelled && data) {
        setMessages(data)
        setUnreadCount(data.filter(m => !m.is_read).length)
      }
    }

    fetch()

    // Realtime subscription for new messages
    const channel = supabase
      .channel('diet-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'dietitian_messages',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setMessages(prev => [payload.new, ...prev])
        setUnreadCount(c => c + 1)
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [userId])

  const markAsRead = useCallback(async (messageId) => {
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, is_read: true, read_at: new Date().toISOString() } : m
    ))
    setUnreadCount(c => Math.max(0, c - 1))

    await supabase.from('dietitian_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', messageId)
  }, [])

  return { messages, unreadCount, markAsRead }
}
```

### Affichage

Le message le plus recent non-lu s'affiche en banniere en haut du PlanTab (priorite haute -- au-dessus des bannieres contextuelles) :

```jsx
function DietitianBanner({ message, onRead }) {
  const obj = useObjective()
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '14px 16px', borderRadius: 16,
      background: `linear-gradient(135deg, ${obj.accentSoft}, rgba(198,160,91,.03))`,
      border: `1px solid ${obj.accentBorder}`,
      marginBottom: 12,
      animation: 'fadeUp 0.3s ease-out',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 16, flexShrink: 0,
        background: obj.accent, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 800, color: '#fff',
      }}>AD</div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: obj.accent,
          textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 4,
        }}>Message de ton dieteticien</div>
        <div style={{ fontSize: 13, color: '#1A1A1A', lineHeight: 1.6 }}>
          {message.body}
        </div>
      </div>
      <button onClick={() => onRead(message.id)} style={{
        background: 'none', border: 'none', padding: 4,
        fontSize: 14, color: 'rgba(15,30,46,.25)', cursor: 'pointer',
      }}>×</button>
    </div>
  )
}
```

---

## 9. Catalogue complet des regles

### Table Supabase `feedback_rules`

```sql
CREATE TABLE IF NOT EXISTS feedback_rules (
  id text PRIMARY KEY,                      -- 'snack_log_basic', 'ban_morning_no_log', etc.
  layer text NOT NULL,                      -- 'snackbar', 'banner', 'popup', 'bilan'
  trigger_event text NOT NULL,              -- 'post_log', 'app_open', 'streak_change', 'bilan_ready', etc.
  priority integer DEFAULT 10,
  objective_codes text[] DEFAULT '{}',       -- {} = tous, {'PW','MAINT'} = seulement ceux-la
  messages jsonb NOT NULL,                   -- {"fr": ["variante1", "variante2"]}
  tone text DEFAULT 'info',                  -- 'info', 'nudge', 'alert', 'success', 'celebration', 'supportive'
  icon text,                                 -- emoji
  cta_label text,                            -- null si pas de bouton
  cooldown_ms bigint DEFAULT 0,              -- 0 = pas de cooldown
  is_one_shot boolean DEFAULT false,         -- true = ne s'affiche qu'une fois
  is_active boolean DEFAULT true,            -- desactivable par Audric
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Pas de RLS necessaire : les regles sont publiques (identiques pour tous les patients)
-- On les charge au login et on cache en localStorage
```

### Seed des regles

```sql
INSERT INTO feedback_rules (id, layer, trigger_event, priority, objective_codes, messages, tone, icon, cooldown_ms, is_one_shot) VALUES

-- SNACKBARS
('snack_log_basic', 'snackbar', 'post_log', 10, '{}',
 '{"fr":["Ajoute !","Bien joue","On avance","Parfait"]}',
 'basic', null, 0, false),

('snack_log_streak_day', 'snackbar', 'post_log_first_today', 25, '{}',
 '{"fr":["Jour {streak} de suite !","Ta serie continue !","1er ajout du jour -- {streak} jours de suite"]}',
 'celebration', '🔥', 0, false),

('snack_day_target_reached', 'snackbar', 'day_target_reached', 30, '{}',
 '{"fr":["Objectif du jour atteint !","Dans la zone !"]}',
 'celebration', '🎯', 0, false),

('snack_day_target_reached_pw', 'snackbar', 'day_target_reached', 30, '{"PW","MAINT"}',
 '{"fr":["Budget du jour bien gere !","Journee maitrisee !"]}',
 'celebration', '🎯', 0, false),

('snack_hp_first', 'snackbar', 'post_log_hp_first_week', 20, '{}',
 '{"fr":["Logger c''est deja bien. L''honnetete fait partie du plan."]}',
 'supportive', '💪', 0, false),

-- BANNIERES
('ban_morning_no_log', 'banner', 'app_open', 20, '{}',
 '{"fr":["Bonjour ! Commence par ton petit-dejeuner.","Bien dormi ? Commence ta journee par un premier ajout."]}',
 'nudge', '👋', 14400000, false),

('ban_midday_no_log', 'banner', 'app_open', 20, '{}',
 '{"fr":["C''est l''heure du dejeuner. Pense a logger.","Midi ! N''oublie pas ton repas."]}',
 'nudge', '🍽️', 14400000, false),

('ban_evening_no_log', 'banner', 'app_open', 20, '{}',
 '{"fr":["Bon appetit ! N''oublie pas de logger ton diner.","Bientot le diner -- pense a logger."]}',
 'nudge', '🌙', 14400000, false),

('ban_streak_danger', 'banner', 'app_open', 35, '{}',
 '{"fr":["Ta serie de {streak} jours est en jeu. Un seul ajout suffit !","Attention -- encore un ajout pour maintenir ton streak de {streak} jours."]}',
 'alert', '⚡', 43200000, false),

('ban_protein_low', 'banner', 'app_open', 22, '{}',
 '{"fr":["Tes proteines sont un peu basses. Ajoute une source au prochain repas.","Pense a tes proteines pour le prochain repas."]}',
 'info', '💡', 21600000, false),

('ban_great_day', 'banner', 'day_target_reached', 15, '{}',
 '{"fr":["Journee bien geree !","Super journee, continue !"]}',
 'success', '✓', 86400000, false),

('ban_great_day_gain', 'banner', 'day_target_reached', 15, '{"GAIN_LEAN","GAIN_COMFORT","GAIN_GUIDE"}',
 '{"fr":["Objectif calorique atteint ! Tes muscles te remercient.","Super journee nutritionnelle !"]}',
 'success', '✓', 86400000, false),

('ban_bilan_ready', 'banner', 'app_open', 40, '{}',
 '{"fr":["C''est dimanche -- ton bilan de la semaine est pret.","Fin de semaine : prends 2 minutes pour ton bilan."]}',
 'info', '📊', 86400000, false),

-- POP-UPS EDUCATIFS
('edu_first_log', 'popup', 'post_log', 40, '{}',
 '{"fr":["Bien joue pour ce premier pas. Chaque ajout compte dans ta progression. L''equilibre se fait sur la semaine, pas sur un seul repas."]}',
 'celebration', '🎉', 0, true),

('edu_first_hp', 'popup', 'post_log_hp', 40, '{}',
 '{"fr":["{obj.hpEducation}"]}',
 'supportive', '🙌', 0, true),

('edu_first_bilan', 'popup', 'bilan_saved', 40, '{}',
 '{"fr":["Chaque dimanche, tu peux evaluer ta semaine. Le score n''est pas une note -- c''est un repere pour voir ta progression dans le temps."]}',
 'info', '📊', 0, true),

('edu_first_week_view', 'popup', 'view_week_first', 40, '{}',
 '{"fr":["Ici tu vois combien de portions tu as mangees par equivalence. Les barres te montrent ou tu en es. L''objectif n''est pas la perfection -- c''est la constance."]}',
 'info', '📋', 0, true),

('edu_first_measurement', 'popup', 'measurement_saved', 40, '{}',
 '{"fr":["Tes mesures sont la pour toi, pas pour te juger. Le poids peut varier de 1-2 kg dans la journee -- c''est normal. Ce qui compte, c''est la tendance sur plusieurs semaines."]}',
 'info', '📏', 0, true),

('edu_streak_3', 'popup', 'streak_reached', 50, '{}',
 '{"fr":["Tu as logge 3 jours consecutifs. C''est le debut d''une habitude."]}',
 'celebration', '✨', 0, true),

('edu_streak_7', 'popup', 'streak_reached', 50, '{}',
 '{"fr":["7 jours de suite. Tu es en train de construire une vraie habitude. La plupart des patients qui tiennent 7 jours atteignent leurs objectifs."]}',
 'celebration', '🔥', 0, true),

('edu_streak_30', 'popup', 'streak_reached', 50, '{}',
 '{"fr":["30 jours. C''est officiellement une habitude. Tu fais partie des patients les plus reguliers. Continue, les resultats suivent."]}',
 'celebration', '🏆', 0, true),

('edu_score_drop', 'popup', 'bilan_saved', 45, '{}',
 '{"fr":["Ton score a baisse cette semaine, et c''est OK. Une semaine difficile ne definit pas ta progression. Reviens a l''essentiel : les 2-3 equivalences les plus importantes."]}',
 'supportive', '💪', 0, false);
```

---

## 10. Schema DB et migration

### Resume des tables a creer/modifier

| Action | Table | Detail |
|---|---|---|
| **CREATE** | `feedback_rules` | Regles de feedback (textes, conditions, priorites) |
| **CREATE** | `dietitian_messages` | Messages diet -> patient |
| **ALTER** | `user_milestones` | Ajouter INSERT policy si manquante |
| **SEED** | `feedback_rules` | 20+ regles initiales |
| Existant | `user_streaks` | Deja prete, juste connecter |
| Existant | `user_milestones` | Deja prete, juste connecter |
| Existant | `weekly_bilans` | Connecter les 5 colonnes non-utilisees |

### Migration SQL complete

```sql
-- 1. feedback_rules
CREATE TABLE IF NOT EXISTS feedback_rules (
  id text PRIMARY KEY,
  layer text NOT NULL CHECK (layer IN ('snackbar', 'banner', 'popup', 'bilan')),
  trigger_event text NOT NULL,
  priority integer DEFAULT 10,
  objective_codes text[] DEFAULT '{}',
  messages jsonb NOT NULL DEFAULT '{"fr":[]}',
  tone text DEFAULT 'info' CHECK (tone IN ('info', 'nudge', 'alert', 'success', 'celebration', 'supportive')),
  icon text,
  cta_label text,
  cooldown_ms bigint DEFAULT 0,
  is_one_shot boolean DEFAULT false,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Pas de RLS : regles identiques pour tous
-- Mais proteger contre modification accidentelle
GRANT SELECT ON feedback_rules TO anon, authenticated;

-- 2. dietitian_messages
CREATE TABLE IF NOT EXISTS dietitian_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  plan_id uuid REFERENCES client_plans(id),
  message_type text NOT NULL DEFAULT 'encouragement'
    CHECK (message_type IN ('encouragement', 'adjustment', 'milestone_comment', 'bilan_feedback', 'alert')),
  title text,
  body text NOT NULL,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dietitian_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own messages"
  ON dietitian_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users mark as read"
  ON dietitian_messages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Fix user_milestones INSERT policy if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_milestones' AND policyname LIKE '%INSERT%'
  ) THEN
    EXECUTE 'CREATE POLICY "Users insert own milestones" ON user_milestones FOR INSERT WITH CHECK (auth.uid() = user_id)';
  END IF;
END$$;
```

---

## 11. Implementation detaillee

### Le hook complet : `useFeedbackEngine`

```js
// src/hooks/useFeedbackEngine.js
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

const CACHE_KEY = 'elevia_feedback_rules'
const CACHE_TTL = 24 * 3600 * 1000 // 24h
const SEEN_PREFIX = 'elevia_seen_'
const COOLDOWN_PREFIX = 'elevia_cd_'

// Fallback rules (offline mode)
const FALLBACK_RULES = [
  { id: 'snack_log_basic', layer: 'snackbar', trigger_event: 'post_log', priority: 10,
    messages: { fr: ['Ajoute !', 'Bien joue', 'On avance'] }, tone: 'basic', cooldown_ms: 0 },
  { id: 'ban_morning_no_log', layer: 'banner', trigger_event: 'app_open', priority: 20,
    messages: { fr: ['Bonjour ! Commence par ton petit-dejeuner.'] }, tone: 'nudge', icon: '👋', cooldown_ms: 14400000 },
]

function isSeen(ruleId) {
  return localStorage.getItem(SEEN_PREFIX + ruleId) === '1'
}

function markSeen(ruleId) {
  localStorage.setItem(SEEN_PREFIX + ruleId, '1')
}

function isCoolingDown(ruleId, cooldownMs) {
  if (cooldownMs <= 0) return false
  const last = localStorage.getItem(COOLDOWN_PREFIX + ruleId)
  if (!last) return false
  return Date.now() - Number(last) < cooldownMs
}

function setCooldown(ruleId) {
  localStorage.setItem(COOLDOWN_PREFIX + ruleId, String(Date.now()))
}

function pickMessage(rule) {
  const variants = rule.messages?.fr || []
  if (variants.length === 0) return ''
  return variants[Math.floor(Math.random() * variants.length)]
}

function matchesObjective(rule, objectiveCode) {
  if (!rule.objective_codes || rule.objective_codes.length === 0) return true
  return rule.objective_codes.includes(objectiveCode)
}

export function useFeedbackEngine({
  logs = [],
  dayNut = {},
  dayTargets = {},
  weekConsumed = {},
  weekTargets = {},
  planTargets = {},
  streak = {},
  bilans = [],
  objective = {},
  session = null,
}) {
  const [rules, setRules] = useState([])
  const [activeBanner, setActiveBanner] = useState(null)
  const [activePopup, setActivePopup] = useState(null)
  const [activeSnackbar, setActiveSnackbar] = useState(null)
  const snackTimeoutRef = useRef(null)

  // Load rules from cache or Supabase
  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      try {
        const { data, ts } = JSON.parse(cached)
        if (Date.now() - ts < CACHE_TTL) {
          setRules(data)
          return
        }
      } catch {}
    }

    // Fetch from Supabase
    supabase.from('feedback_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .then(({ data, error }) => {
        if (data && !error) {
          setRules(data)
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
        } else {
          setRules(FALLBACK_RULES)
        }
      })
  }, [])

  // Show snackbar (public API)
  const showSnackbar = useCallback((message, tone = 'basic', icon = null) => {
    if (snackTimeoutRef.current) clearTimeout(snackTimeoutRef.current)
    setActiveSnackbar({ message, tone, icon })
    snackTimeoutRef.current = setTimeout(() => setActiveSnackbar(null), 3000)
  }, [])

  // Dismiss banner
  const dismissBanner = useCallback((ruleId) => {
    setCooldown(ruleId)
    setActiveBanner(null)
  }, [])

  // Dismiss popup
  const dismissPopup = useCallback((ruleId) => {
    markSeen(ruleId)
    setActivePopup(null)
  }, [])

  // Evaluate banners on state changes
  useEffect(() => {
    if (rules.length === 0) return

    const now = new Date()
    const hour = now.getHours()
    const dow = now.getDay()
    const today = now.toISOString().slice(0, 10)
    const logsToday = logs.length
    const dayPct = dayTargets.kcal > 0 ? dayNut.kcal / dayTargets.kcal : 0
    const protPct = dayTargets.p > 0 ? dayNut.p / dayTargets.p : 0
    const noLogToday = streak.lastLogDate !== today

    const bannerRules = rules.filter(r => r.layer === 'banner' && matchesObjective(r, objective.code))
    const candidates = []

    for (const rule of bannerRules) {
      if (rule.is_one_shot && isSeen(rule.id)) continue
      if (isCoolingDown(rule.id, rule.cooldown_ms)) continue

      let match = false

      // Evaluate trigger conditions
      switch (rule.id) {
        case 'ban_morning_no_log':
          match = hour >= 9 && hour < 12 && logsToday === 0
          break
        case 'ban_midday_no_log':
          match = hour >= 12 && hour < 14 && !logs.some(l => l.slotId === 'coldMeal')
          break
        case 'ban_evening_no_log':
          match = hour >= 18 && hour < 21 && !logs.some(l => l.slotId === 'hotMeal')
          break
        case 'ban_streak_danger':
          match = hour >= 20 && noLogToday && (streak.current || 0) > 2
          break
        case 'ban_protein_low':
          match = hour >= 15 && protPct < 0.5 && logsToday > 0
          break
        case 'ban_great_day':
        case 'ban_great_day_gain':
          match = dayPct >= 0.95 && dayPct <= 1.1
          break
        case 'ban_bilan_ready':
          match = dow === 0
          break
        default:
          break
      }

      if (match) {
        let msg = pickMessage(rule)
        // Template replacement
        msg = msg.replace('{streak}', String(streak.current || 0))
        candidates.push({ ...rule, message: msg })
      }
    }

    // Pick highest priority
    candidates.sort((a, b) => b.priority - a.priority)
    setActiveBanner(candidates[0] || null)
  }, [rules, logs, dayNut, dayTargets, streak, objective])

  // Bilan readiness
  const bilanReady = useMemo(() => {
    const dow = new Date().getDay()
    if (dow !== 0 && dow !== 6) return false // Saturday or Sunday
    // Check if bilan already done this week
    const thisWeekStart = getWeekStart(new Date())
    return !bilans.some(b => b.weekStart >= thisWeekStart)
  }, [bilans])

  return {
    // Active feedback items
    snackbar: activeSnackbar,
    banner: activeBanner,
    popup: activePopup,
    bilanReady,

    // Actions
    showSnackbar,
    dismissBanner,
    dismissPopup,

    // For triggering post-action popups (called by parent)
    triggerPostLog: (log) => {
      // Check for educational popups
      if (logs.length === 0 && !isSeen('edu_first_log')) {
        setActivePopup({
          id: 'edu_first_log', icon: '🎉',
          title: 'Premier ajout !',
          body: "Bien joue pour ce premier pas. Chaque ajout compte dans ta progression. L'equilibre se fait sur la semaine, pas sur un seul repas.",
          cta: 'Compris',
        })
        return
      }
      // First HP
      if (log.isOutOfPlan && !logs.some(l => l.isOutOfPlan) && !isSeen('edu_first_hp')) {
        setActivePopup({
          id: 'edu_first_hp', icon: '🙌',
          title: 'Tu peux le faire',
          body: objective.hpEducation || "Logger ce qui est hors plan, c'est garder un suivi honnete.",
          cta: 'Compris',
        })
        return
      }
    },

    triggerStreakChange: (newStreak) => {
      const milestones = [3, 7, 30]
      for (const m of milestones) {
        if (newStreak === m && !isSeen(`edu_streak_${m}`)) {
          const texts = {
            3: { title: '3 jours de suite !', body: "Tu as logge 3 jours consecutifs. C'est le debut d'une habitude.", cta: 'On continue', icon: '✨' },
            7: { title: 'Une semaine complete !', body: "7 jours de suite. Tu es en train de construire une vraie habitude.", cta: 'Merci', icon: '🔥' },
            30: { title: 'Un mois !', body: "30 jours. C'est officiellement une habitude. Continue, les resultats suivent.", cta: 'Impressionnant', icon: '🏆' },
          }
          setActivePopup({ id: `edu_streak_${m}`, ...texts[m] })
          break
        }
      }
    },

    triggerBilanSaved: (score, prevScore) => {
      // First bilan
      if (!isSeen('edu_first_bilan') && bilans.length === 0) {
        setActivePopup({
          id: 'edu_first_bilan', icon: '📊',
          title: 'Ton premier bilan',
          body: "Chaque dimanche, tu peux evaluer ta semaine. Le score n'est pas une note -- c'est un repere pour voir ta progression dans le temps.",
          cta: 'Voir mon bilan',
        })
        return
      }
      // Score drop
      if (prevScore != null && prevScore - score > 15 && !isSeen(`edu_score_drop_${Date.now()}`)) {
        setActivePopup({
          id: `edu_score_drop_${Date.now()}`, icon: '💪',
          title: 'Semaine difficile ?',
          body: "Ton score a baisse cette semaine, et c'est OK. Une semaine difficile ne definit pas ta progression. Reviens a l'essentiel.",
          cta: "C'est reparti",
        })
      }
    },
  }
}

// Helper
function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}
```

### Integration dans `EleviaApp`

```jsx
// Dans EleviaApp, apres les hooks existants :
const feedback = useFeedbackEngine({
  logs,
  dayNut: /* calculated in PlanTab, need to lift up */,
  dayTargets: planData?.DAY_TARGETS,
  weekConsumed,
  weekTargets: planData?.WEEK_TARGETS,
  planTargets: planData?.PLAN_TARGETS,
  streak: streak, // from useStreaks
  bilans: planData?.BILANS,
  objective: obj,
  session,
})

// Passer feedback en prop aux tabs
<PlanTab
  logs={logs}
  onAddLog={(log) => {
    addLog(log)
    feedback.triggerPostLog(log)
    // Smart snackbar au lieu du basic
    const snack = getPostLogSnackbar(log, { logs, dayNut, dayTargets: planData?.DAY_TARGETS, obj, streak, weekConsumed })
    feedback.showSnackbar(snack.msg, snack.type)
  }}
  weekConsumed={weekConsumed}
  feedback={feedback}
/>

// Dans PlanTab, afficher la banniere :
{feedback.banner && (
  <FeedbackBanner rule={feedback.banner} onDismiss={feedback.dismissBanner} />
)}

// Afficher le popup educatif :
{feedback.popup && (
  <EducationalPopup popup={feedback.popup} onDismiss={() => feedback.dismissPopup(feedback.popup.id)} />
)}

// Snackbar ameliore :
{feedback.snackbar && (
  <Snackbar message={feedback.snackbar.message} type={feedback.snackbar.tone} />
)}
```

### Checklist du ton

Chaque message doit respecter ces principes :

| Principe | Exemple bon | Exemple mauvais |
|---|---|---|
| **Tutoiement** | "Tu as atteint ta cible" | "Vous avez atteint votre cible" |
| **Positif d'abord** | "Bonne semaine, quelques ajustements possibles" | "Tu n'as pas respecte ton plan" |
| **Pas infantilisant** | "Jour 7 de suite" | "Wow super champion !!! 🎊🎊🎊" |
| **Pas culpabilisant** | "Semaine a ajuster. Chaque semaine est une nouvelle chance." | "Tu as echoue cette semaine." |
| **Actionnable** | "Ajoute une source de proteines au prochain repas" | "Mange mieux" |
| **Premium** | Sobre, peu d'emojis (1 max par message) | Confettis, animations excessives |
| **"Le patient" pas "le client"** | "Tes mesures sont la pour toi" | "Merci de votre fidelite" |
| **Pas d'education forcee** | "En savoir plus →" (optionnel) | Pop-up bloquant a chaque log |

---

## Synthese

### Ce qu'on construit

```
feedback_rules (Supabase)     useFeedbackEngine (React)      UI Components
─────────────────────────     ─────────────────────────      ──────────────
20+ regles avec textes   →    Evalue conditions + state  →   Snackbar
variantes par objectif        Gere priorites + cooldowns     FeedbackBanner
modifiables par Audric        Queue de feedbacks             EducationalPopup
activ/desactiv sans deploy    Triggers post-action           BilanModal
                                                             DietitianBanner
```

### Estimation effort

| Composant | Effort | Dependances |
|---|---|---|
| Table `feedback_rules` + seed | 0.5 jour | - |
| Table `dietitian_messages` + RLS | 0.5 jour | - |
| `useFeedbackEngine` hook | 2 jours | feedback_rules |
| Composants UI (Snackbar, Banner, Popup) | 1 jour | useFeedbackEngine |
| BilanModal complet (3 etapes) | 1.5 jours | useWeeklyBilans, useFeedbackEngine |
| `useDietitianMessages` + DietitianBanner | 1 jour | dietitian_messages |
| Integration dans EleviaApp + lift state | 1 jour | Tous les hooks |
| **Total** | **~7.5 jours** | |

### Ordre d'implementation

1. **DB** : Creer `feedback_rules` + `dietitian_messages` + seeds
2. **Snackbars** : Remplacer le snackbar minimal actuel (quick win visible)
3. **useFeedbackEngine** : Hook complet avec evaluation + cooldowns
4. **Bannieres** : Rappels contextuels dans PlanTab
5. **Pop-ups educatifs** : One-shots aux moments cles
6. **BilanModal** : Formulaire complet connecte a useWeeklyBilans
7. **Messages diet** : Hook + realtime + banniere
