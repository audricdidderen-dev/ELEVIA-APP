# Audit 04 — Data Analytics & Visualisation

> Date : 27 fev. 2026
> Scope : elevia-prototype.jsx (HistoryTab, ProfileTab, BilanDetail), hooks (useFoodLogs, useMeasurements, useWeeklyBilans), transformPlanData.js, objectiveConfig.js
> Objectif : Exploiter les donnees existantes pour augmenter la valeur percue, la motivation et l'adherence patient

---

## Table des matieres

1. [Diagnostic de l'existant](#1-diagnostic-de-lexistant)
2. [Fondements scientifiques](#2-fondements-scientifiques)
3. [Visualisations proposees](#3-visualisations-proposees)
4. [Insights automatiques (algorithmes)](#4-insights-automatiques-algorithmes)
5. [Tables non exploitees](#5-tables-non-exploitees)
6. [Vue dieteticien (future)](#6-vue-dieteticien-future)
7. [Hooks et composants concrets](#7-hooks-et-composants-concrets)
8. [Priorisation](#8-priorisation)

---

## 1. Diagnostic de l'existant

### 1.1 Donnees collectees vs donnees affichees

| Source | Donnees collectees | Affichage actuel | Verdict |
|--------|-------------------|------------------|---------|
| `food_logs` | log_date, slot_id, eq_id, item_id, qty | 8 derniers logs (liste brute) | **Tres pauvre** — aucune agregation, aucun graphique |
| `measurements` | weight_kg, waist_cm, body_fat_pct, hip_cm, muscle_mass_kg | 1 graphique AreaChart (poids/taille/BF/IMC/ratio) + tableau | **Correct** mais pas d'insight |
| `weekly_bilans` | adherence_score, energy_level, hunger_level, sleep_quality, stress_level, notes | Liste de scores + BilanDetail basique | **4 champs ignores** (energy, hunger, sleep, stress) |
| `user_streaks` | streak_type, current_streak, longest_streak | **RIEN** | Table non connectee |
| `user_milestones` | milestone_type, milestone_value, achieved_at | **RIEN** | Table non connectee |
| `plan_progression` | phases pour GAIN | **RIEN** | Table non connectee |

### 1.2 Faiblesses critiques

1. **HistoryTab** (`elevia-prototype.jsx:792-828`) : juste une liste de bilans cliquables + 8 derniers food_logs inverses. Aucun graphique, aucune tendance, aucune correlation.

2. **BilanDetail** (`elevia-prototype.jsx:762-790`) : affiche score + resume textuel statique genere depuis `objectiveConfig.js`. Zero donnee reelle de la semaine (pas de macros, pas de repartition par slot, pas de correlation adherence/poids).

3. **ProfileTab > measures** (`elevia-prototype.jsx:847-1028`) : graphiques recharts existants (AreaChart + BarChart scores + LineChart macros). Probleme : le **LineChart macros est code en dur** (lignes 961-964) avec des donnees fictives, pas connecte aux food_logs reels.

4. **Aucun insight automatique** : pas d'analyse de patterns, pas de correlation, pas de prediction, pas d'alerte proactive.

5. **Aucune exploitation temporelle** : les food_logs contiennent log_date mais aucune analyse jour de la semaine, weekend vs semaine, tendance dans le temps.

6. **weekly_bilans sous-exploite** : energy_level, hunger_level, sleep_quality, stress_level sont collectes dans `useWeeklyBilans.js:19-30` (insert vers Supabase) mais jamais lus ni affiches.

### 1.3 Architecture technique actuelle

```
usePlanData.js
  └─ fetchAll() → Promise.all([...12 requetes...])
  └─ transformPlanData() → MEASUREMENTS, BILANS, CATALOGUE, etc.

useFoodLogs.js
  └─ Fetches today's logs + this week's logs
  └─ weekConsumed = { eqId: count } (aggrege pour barres de progression)

useWeeklyBilans.js
  └─ Sync from planData + createBilan()

useMeasurements.js
  └─ Sync from planData + addMeasurement()
```

**Probleme structurel** : les food_logs historiques (au-dela de la semaine en cours) ne sont PAS fetches. Seul le `weekConsumed` est calcule. Pas d'historique multi-semaines cote client.

---

## 2. Fondements scientifiques

### 2.1 Self-Monitoring Theory

La theorie du self-monitoring (auto-surveillance) est le pilier de l'adherence en nutrition digitale :

- **Etude PMC 2022** : L'adherence au self-monitoring mobile est le meilleur predicteur de perte de poids. Les "consistent engagers" perdent significativement plus que les "disengagers". ([PMC9159560](https://pmc.ncbi.nlm.nih.gov/articles/PMC9159560/))

- **JMIR 2025** : Le feedback personnalise + support intensif ameliore significativement l'adherence au self-monitoring. Le modelage ACT-R montre un potentiel pour l'analyse dynamique des comportements. ([JMIR e65431](https://www.jmir.org/2025/1/e65431))

- **PMC 2022** : Tracker au moins 2 repas/jour est le meilleur marqueur d'adherence dans les interventions mobile. ([PMC6856872](https://pmc.ncbi.nlm.nih.gov/articles/PMC6856872/))

### 2.2 Feedback Loops et Engagement

- **Cleveland Clinic** : +18% d'adherence au self-monitoring grace aux feedback loops de comprehension.
- **73%** des utilisateurs de plateformes fitness fournissent un meilleur feedback apres avoir vu des resumes visuels.
- Les strategies motivationnelles cles : feedback, health literacy, rappels, goal-setting, interaction sociale, gamification. ([Nature 2025](https://www.nature.com/articles/s44401-025-00017-4))

### 2.3 Data Visualization Mobile Health

- **65%** des utilisateurs traitent les visuels plus vite que le texte (Nielsen Norman Group).
- Les bar charts et line charts sont les plus populaires, mais les utilisateurs preferent **texte + graphique combines**.
- Design minimaliste : chaque graphique doit servir un objectif lie a un goal wellness specifique.
- Color-coded trends > raw numbers pour reduire la charge cognitive.
- Accessibilite : contraste WCAG 2.1, 8% des hommes sont daltoniens. ([Moldstud](https://moldstud.com/articles/p-the-intersection-of-data-visualization-and-ux-design-in-health-apps-enhancing-user-engagement-and-insights))

### 2.4 Predictive Analytics en Nutrition

- La regression lineaire simple donne une erreur moyenne de +/-3.4 kg — suffisant pour une estimation motivationnelle.
- Les modeles LSTM/4L-NN predisent les changements de poids a +/-1.09% sur 4 semaines.
- Pour une app patient, une **regression lineaire simple** sur les mesures reelles suffit pour "a ce rythme, tu atteindras ton objectif dans X semaines". ([Nature s41746-024-01299-y](https://www.nature.com/articles/s41746-024-01299-y))

---

## 3. Visualisations proposees

### 3.1 Heatmap Adherence (Calendrier)

**Objectif** : Voir d'un coup d'oeil les jours ou le patient a logge vs pas logge.

**Donnee source** : `food_logs.log_date` (count par jour)

**Logique** :
- Vert fonce : >= 80% des eq loggees
- Vert clair : >= 50%
- Jaune : >= 1 log mais < 50%
- Gris : aucun log

```jsx
// === AdherenceHeatmap.jsx ===
// Calendrier 7 colonnes (Lu-Di) x N semaines
// Pas de lib externe — pur CSS grid + couleurs dynamiques

function AdherenceHeatmap({ foodLogsByDate, planTargetCount, weeksToShow = 8 }) {
  const today = new Date();
  const days = [];

  // Generate last N weeks of days
  for (let i = weeksToShow * 7 - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const count = foodLogsByDate[key] || 0;
    const ratio = planTargetCount > 0 ? count / planTargetCount : 0;

    let color = '#E5E7EB'; // gris — pas de log
    if (ratio >= 0.8) color = '#22C55E';      // vert fonce
    else if (ratio >= 0.5) color = '#86EFAC';  // vert clair
    else if (count > 0) color = '#FCD34D';     // jaune

    days.push({ date: key, count, ratio, color, dayOfWeek: d.getDay() });
  }

  // Pad the first week to start on Monday
  const firstDay = days[0]?.dayOfWeek || 1;
  const padCount = firstDay === 0 ? 6 : firstDay - 1;
  const padded = [...Array(padCount).fill(null), ...days];

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', marginBottom: 8 }}>
        Calendrier d'adherence
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map(d => (
          <span key={d} style={{ fontSize: 9, fontWeight: 700, color: '#6B7280', width: 28, textAlign: 'center' }}>{d}</span>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {padded.map((day, i) => (
          <div
            key={i}
            title={day ? `${day.date}: ${day.count} logs` : ''}
            style={{
              width: 28, height: 28, borderRadius: 6,
              background: day ? day.color : 'transparent',
              opacity: day ? 1 : 0,
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'center' }}>
        {[
          { color: '#E5E7EB', label: 'Aucun' },
          { color: '#FCD34D', label: '<50%' },
          { color: '#86EFAC', label: '50-80%' },
          { color: '#22C55E', label: '>80%' },
        ].map(l => (
          <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: '#6B7280' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
```

**Impact** : Renforce le "don't break the chain" — la gamification la plus simple et la plus efficace selon la recherche.

---

### 3.2 Radar/Spider Macros Hebdomadaire

**Objectif** : Voir en un coup d'oeil l'equilibre macro de la semaine vs cible.

**Donnee source** : `food_logs` (somme kcal/P/L/G de la semaine) vs `WEEK_TARGETS`

```jsx
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';

function MacroRadar({ weekActual, weekTargets, accentColor = '#C6A05B' }) {
  // weekActual = { kcal, p, l, g }
  // weekTargets = { kcal, p, l, g }
  const data = [
    {
      axis: 'Calories',
      actual: Math.round((weekActual.kcal / weekTargets.kcal) * 100),
      target: 100,
    },
    {
      axis: 'Proteines',
      actual: Math.round((weekActual.p / weekTargets.p) * 100),
      target: 100,
    },
    {
      axis: 'Lipides',
      actual: Math.round((weekActual.l / weekTargets.l) * 100),
      target: 100,
    },
    {
      axis: 'Glucides',
      actual: Math.round((weekActual.g / weekTargets.g) * 100),
      target: 100,
    },
  ];

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', marginBottom: 4 }}>
        Equilibre macros — semaine
      </div>
      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>
        % de ta cible hebdomadaire
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="rgba(15,30,46,.08)" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fontSize: 11, fontWeight: 700, fill: '#1A1A1A' }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 140]}
            tick={{ fontSize: 9, fill: '#6B7280' }}
            tickCount={4}
          />
          <Radar
            name="Cible"
            dataKey="target"
            stroke="rgba(15,30,46,.15)"
            fill="rgba(15,30,46,.04)"
            strokeDasharray="4 4"
          />
          <Radar
            name="Reel"
            dataKey="actual"
            stroke={accentColor}
            fill={accentColor}
            fillOpacity={0.2}
            strokeWidth={2}
            dot={{ r: 4, fill: accentColor, stroke: '#fff', strokeWidth: 2 }}
          />
          <Tooltip
            contentStyle={{
              background: '#0E1E2E', border: 'none', borderRadius: 12,
              fontSize: 12, color: '#fff', fontWeight: 600,
            }}
            formatter={(value) => `${value}%`}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**Insight genere** : "Tes proteines sont a 78% cette semaine — ajoute 1 source de VVPO par repas pour atteindre ta cible."

---

### 3.3 Stacked Bar — Repartition Calories par Slot

**Objectif** : Voir ou vont les calories dans la journee.

**Donnee source** : `food_logs` groupes par `slot_id`, somme `kcal`

```jsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function CaloriesBySlot({ weeklySlotData }) {
  // weeklySlotData = [
  //   { day: 'Lu', breakfast: 420, snack1: 150, coldMeal: 680, snack2: 200, hotMeal: 750 },
  //   { day: 'Ma', breakfast: 380, ... },
  //   ...
  // ]

  const slotColors = {
    breakfast: '#C6A05B',
    snack1: '#86EFAC',
    coldMeal: '#3B82F6',
    snack2: '#F59E0B',
    hotMeal: '#EF4444',
    preWorkout: '#8B5CF6',
    postWorkout: '#14B8A6',
  };

  const slotLabels = {
    breakfast: 'P.-dej.',
    snack1: 'Coll. 1',
    coldMeal: 'Dejeuner',
    snack2: 'Coll. 2',
    hotMeal: 'Diner',
    preWorkout: 'Pre-WO',
    postWorkout: 'Post-WO',
  };

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', marginBottom: 8 }}>
        Repartition calorique par repas
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={weeklySlotData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,30,46,.06)" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: '#0E1E2E', border: 'none', borderRadius: 12,
              fontSize: 11, color: '#fff', fontWeight: 600,
            }}
          />
          {Object.entries(slotColors).map(([slot, color]) => (
            <Bar
              key={slot}
              dataKey={slot}
              stackId="a"
              fill={color}
              name={slotLabels[slot]}
              radius={slot === 'hotMeal' ? [4, 4, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

### 3.4 Tendance Poids avec Prediction

**Objectif** : Repondre a "Quand vais-je atteindre mon objectif ?"

**Donnee source** : `measurements.weight_kg` + regression lineaire simple

```jsx
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

function WeightTrendWithPrediction({ measurements, targetWeight, accentColor = '#C6A05B' }) {
  // measurements = [{ date: '2026-01-12', weightKg: 92.1 }, ...]
  // Tri chronologique
  const sorted = [...measurements].sort((a, b) => a.date.localeCompare(b.date));

  // Regression lineaire simple : y = mx + b
  const n = sorted.length;
  if (n < 2) return null;

  const xs = sorted.map((_, i) => i);
  const ys = sorted.map(m => m.weightKg);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sumX2 = xs.reduce((a, x) => a + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Prediction : combien de semaines pour atteindre targetWeight ?
  let weeksToGoal = null;
  if (targetWeight && slope !== 0) {
    const currentWeight = ys[ys.length - 1];
    const weightDiff = targetWeight - currentWeight;
    // slope est par mesure (environ 1/semaine), donc :
    const measuresPerWeek = n > 1
      ? n / ((new Date(sorted[n - 1].date) - new Date(sorted[0].date)) / (7 * 86400000))
      : 1;
    const slopePerWeek = slope * measuresPerWeek;
    if ((slope < 0 && targetWeight < currentWeight) || (slope > 0 && targetWeight > currentWeight)) {
      weeksToGoal = Math.ceil(Math.abs(weightDiff / slopePerWeek));
    }
  }

  // Build chart data : real + trend + projection
  const chartData = sorted.map((m, i) => ({
    date: m.date.slice(5),
    weight: m.weightKg,
    trend: Math.round((intercept + slope * i) * 10) / 10,
  }));

  // Add 4 projection points
  const projectionWeeks = Math.min(weeksToGoal || 8, 12);
  for (let w = 1; w <= projectionWeeks; w++) {
    const futureDate = new Date(sorted[n - 1].date);
    futureDate.setDate(futureDate.getDate() + w * 7);
    chartData.push({
      date: futureDate.toISOString().slice(5, 10),
      weight: null,
      trend: null,
      projection: Math.round((intercept + slope * (n - 1 + w)) * 10) / 10,
    });
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="flex-between" style={{ marginBottom: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A' }}>
          Tendance poids
        </span>
        {weeksToGoal && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#34C759' }}>
            Objectif dans ~{weeksToGoal} sem.
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradWeight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={accentColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={accentColor} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,30,46,.06)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
          <YAxis domain={['dataMin-2', 'dataMax+1']} tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
          {targetWeight && (
            <ReferenceLine
              y={targetWeight}
              stroke="#34C759"
              strokeDasharray="4 4"
              label={{ value: `Objectif: ${targetWeight}kg`, position: 'right', fontSize: 9, fill: '#34C759' }}
            />
          )}
          <Tooltip
            contentStyle={{
              background: '#0E1E2E', border: 'none', borderRadius: 12,
              fontSize: 12, color: '#fff', fontWeight: 600,
            }}
          />
          <Area
            type="monotone" dataKey="weight" stroke={accentColor}
            strokeWidth={2.5} fill="url(#gradWeight)"
            dot={{ r: 4, fill: accentColor, strokeWidth: 2, stroke: '#fff' }}
            connectNulls={false}
          />
          <Area
            type="monotone" dataKey="trend" stroke="rgba(15,30,46,.2)"
            strokeWidth={1.5} strokeDasharray="4 4"
            fill="none" dot={false}
            connectNulls
          />
          <Area
            type="monotone" dataKey="projection" stroke="#34C759"
            strokeWidth={1.5} strokeDasharray="6 3"
            fill="rgba(52,199,89,.08)" dot={false}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 6 }}>
        <span style={{ fontSize: 10, color: accentColor, fontWeight: 700 }}>--- Reel</span>
        <span style={{ fontSize: 10, color: 'rgba(15,30,46,.3)', fontWeight: 700 }}>--- Tendance</span>
        <span style={{ fontSize: 10, color: '#34C759', fontWeight: 700 }}>--- Projection</span>
      </div>
    </div>
  );
}
```

---

### 3.5 Correlation Adherence / Perte de Poids (Scatter Plot)

**Objectif** : Demontrer visuellement que l'adherence paye.

**Donnee source** : `weekly_bilans.adherence_score` + delta poids entre mesures

```jsx
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

function AdherenceWeightCorrelation({ bilans, measurements, accentColor }) {
  // Associer chaque bilan a la variation de poids de la semaine
  const data = bilans.map(b => {
    const weekMeasures = measurements.filter(m =>
      m.date >= b.weekStart && m.date <= b.weekEnd
    );
    if (weekMeasures.length < 1) return null;
    // Delta poids : derniere mesure de la semaine - premiere
    const prevMeasures = measurements.filter(m => m.date < b.weekStart);
    const prevWeight = prevMeasures.length > 0
      ? prevMeasures[prevMeasures.length - 1].weightKg
      : weekMeasures[0].weightKg;
    const endWeight = weekMeasures[weekMeasures.length - 1].weightKg;
    return {
      adherence: b.score,
      delta: Math.round((endWeight - prevWeight) * 10) / 10,
    };
  }).filter(Boolean);

  if (data.length < 3) return null;

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', marginBottom: 4 }}>
        Adherence vs Evolution poids
      </div>
      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>
        Chaque point = 1 semaine
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,30,46,.06)" />
          <XAxis
            dataKey="adherence" name="Adherence"
            domain={[0, 100]} unit="%"
            tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false}
            label={{ value: 'Score adherence', position: 'bottom', fontSize: 10, fill: '#6B7280' }}
          />
          <YAxis
            dataKey="delta" name="Delta poids"
            unit="kg"
            tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false}
            label={{ value: 'Delta kg', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#6B7280' }}
          />
          <ReferenceLine y={0} stroke="rgba(15,30,46,.12)" />
          <Tooltip
            contentStyle={{
              background: '#0E1E2E', border: 'none', borderRadius: 12,
              fontSize: 12, color: '#fff', fontWeight: 600,
            }}
            formatter={(value, name) => [
              name === 'Adherence' ? `${value}%` : `${value > 0 ? '+' : ''}${value} kg`,
              name === 'Adherence' ? 'Score' : 'Poids',
            ]}
          />
          <Scatter data={data} fill={accentColor} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

### 3.6 Composition Corporelle Multi-Series

**Objectif** : Suivre poids + BF% + tour de taille sur le meme graphique avec axes doubles.

**Donnee source** : `measurements`

```jsx
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function BodyComposition({ measurements, heightCm }) {
  const data = [...measurements].reverse().map(m => ({
    date: m.date.slice(5),
    weight: m.weightKg,
    bf: m.bodyFatPct,
    waist: m.waistCm,
    leanMass: Math.round(m.weightKg * (1 - m.bodyFatPct / 100) * 10) / 10,
    fatMass: Math.round(m.weightKg * (m.bodyFatPct / 100) * 10) / 10,
  }));

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', marginBottom: 4 }}>
        Composition corporelle
      </div>
      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>
        Masse maigre vs masse grasse
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 10, right: 5, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,30,46,.06)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: '#0E1E2E', border: 'none', borderRadius: 12,
              fontSize: 11, color: '#fff', fontWeight: 600,
            }}
          />
          <Bar yAxisId="left" dataKey="leanMass" fill="rgba(59,130,246,.3)" name="Masse maigre (kg)" radius={[4, 4, 0, 0]} />
          <Bar yAxisId="left" dataKey="fatMass" fill="rgba(232,134,58,.3)" name="Masse grasse (kg)" radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="bf" stroke="#E8863A" strokeWidth={2} dot={{ r: 3 }} name="% MG" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

### 3.7 Bilans Enrichis — Spider Wellbeing

**Objectif** : Exploiter les 4 champs ignores de weekly_bilans.

**Donnee source** : `weekly_bilans.energy_level`, `hunger_level`, `sleep_quality`, `stress_level`

```jsx
function WellbeingRadar({ bilan }) {
  // bilan = { energy_level: 4, hunger_level: 2, sleep_quality: 4, stress_level: 3, adherence_score: 82 }
  // Echelle 1-5 normalisee a 0-100
  const data = [
    { axis: 'Energie', value: (bilan.energy_level || 3) * 20 },
    { axis: 'Satiete', value: (5 - (bilan.hunger_level || 3)) * 20 }, // inverse: moins de faim = mieux
    { axis: 'Sommeil', value: (bilan.sleep_quality || 3) * 20 },
    { axis: 'Zen', value: (5 - (bilan.stress_level || 3)) * 20 },    // inverse: moins de stress = mieux
    { axis: 'Adherence', value: bilan.adherence_score || 0 },
  ];

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', marginBottom: 8 }}>
        Bien-etre de la semaine
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
          <PolarGrid stroke="rgba(15,30,46,.08)" />
          <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fontWeight: 700, fill: '#1A1A1A' }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
          <Radar
            dataKey="value"
            stroke="#3B82F6"
            fill="#3B82F6"
            fillOpacity={0.15}
            strokeWidth={2}
            dot={{ r: 4, fill: '#3B82F6', stroke: '#fff', strokeWidth: 2 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

### 3.8 Timeline Progression (pour objectifs GAIN)

**Objectif** : Montrer la progression par phases pour les plans de prise.

**Donnee source** : `plan_progression` (actuellement non exploitee)

```jsx
function PhaseTimeline({ phases, currentPhase }) {
  // phases = [
  //   { phase: 1, label: 'Adaptation', weeks: 4, targetKcal: 2800 },
  //   { phase: 2, label: 'Progression', weeks: 6, targetKcal: 3100 },
  //   { phase: 3, label: 'Consolidation', weeks: 4, targetKcal: 3000 },
  // ]

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', marginBottom: 12 }}>
        Phases de progression
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
        {phases.map((phase, i) => {
          const isActive = phase.phase === currentPhase;
          const isPast = phase.phase < currentPhase;
          const color = isPast ? '#34C759' : isActive ? '#3B7BF6' : '#E5E7EB';

          return (
            <div key={i} style={{ flex: phase.weeks, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Bar */}
              <div style={{
                width: '100%', height: 8, borderRadius: 4,
                background: isPast ? '#34C759' : isActive
                  ? `linear-gradient(90deg, #3B7BF6 60%, #E5E7EB 60%)`
                  : '#E5E7EB',
                marginBottom: 8,
              }} />
              {/* Label */}
              <div style={{
                fontSize: 11, fontWeight: isActive ? 800 : 600,
                color: isActive ? '#3B7BF6' : isPast ? '#34C759' : '#6B7280',
              }}>
                {phase.label}
              </div>
              <div style={{ fontSize: 9, color: '#6B7280' }}>
                {phase.weeks} sem. | {phase.targetKcal} kcal
              </div>
              {isActive && (
                <div style={{
                  fontSize: 9, fontWeight: 700, color: '#3B7BF6',
                  background: 'rgba(59,123,246,.1)', padding: '2px 8px',
                  borderRadius: 99, marginTop: 4,
                }}>
                  En cours
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## 4. Insights automatiques (algorithmes)

### 4.1 Hook : useInsights

Ce hook centralise tous les calculs d'insights a partir des donnees existantes.

```jsx
// === src/hooks/useInsights.js ===

import { useMemo } from 'react';

/**
 * Generates automatic insights from food logs, measurements, and bilans.
 * Returns an array of insight objects sorted by priority.
 */
export function useInsights({ foodLogs, measurements, bilans, weekTargets, planTargets, slots }) {
  return useMemo(() => {
    const insights = [];

    if (!foodLogs || !measurements || !bilans) return insights;

    // ──────────────────────────────────────
    // 1. PREDICTION : "A ce rythme..."
    // ──────────────────────────────────────
    if (measurements.length >= 3) {
      const sorted = [...measurements].sort((a, b) => a.date.localeCompare(b.date));
      const n = sorted.length;
      const xs = sorted.map((_, i) => i);
      const ys = sorted.map(m => m.weightKg);
      const sumX = xs.reduce((a, b) => a + b, 0);
      const sumY = ys.reduce((a, b) => a + b, 0);
      const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
      const sumX2 = xs.reduce((a, x) => a + x * x, 0);
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

      // Pente par semaine
      const daySpan = (new Date(sorted[n - 1].date) - new Date(sorted[0].date)) / 86400000;
      const slopePerWeek = daySpan > 0 ? slope * (n - 1) / daySpan * 7 : 0;

      if (Math.abs(slopePerWeek) > 0.05) {
        const direction = slopePerWeek < 0 ? 'perte' : 'prise';
        const perWeek = Math.abs(slopePerWeek).toFixed(2);
        insights.push({
          type: 'prediction',
          priority: 1,
          icon: '📈',
          title: `Rythme actuel : ${perWeek} kg/${direction === 'perte' ? 'perte' : 'prise'} par semaine`,
          body: `Depuis le debut, tu ${direction === 'perte' ? 'perds' : 'prends'} en moyenne ${perWeek} kg par semaine.`,
        });
      }
    }

    // ──────────────────────────────────────
    // 2. CORRELATION : Adherence vs Resultats
    // ──────────────────────────────────────
    if (bilans.length >= 3 && measurements.length >= 3) {
      const highAdherence = bilans.filter(b => b.score >= 75);
      const lowAdherence = bilans.filter(b => b.score < 75);

      // Calculer delta poids moyen pour chaque groupe
      const getAvgDelta = (bilanGroup) => {
        const deltas = bilanGroup.map(b => {
          const before = measurements.filter(m => m.date < b.weekStart);
          const during = measurements.filter(m => m.date >= b.weekStart && m.date <= b.weekEnd);
          if (before.length === 0 || during.length === 0) return null;
          return during[during.length - 1].weightKg - before[before.length - 1].weightKg;
        }).filter(d => d !== null);
        return deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : null;
      };

      const highDelta = getAvgDelta(highAdherence);
      const lowDelta = getAvgDelta(lowAdherence);

      if (highDelta !== null && lowDelta !== null && highDelta !== lowDelta) {
        const diff = Math.abs(highDelta - lowDelta).toFixed(2);
        insights.push({
          type: 'correlation',
          priority: 2,
          icon: '🔗',
          title: `L'adherence fait la difference`,
          body: `Tes semaines >75% d'adherence donnent ${diff} kg de mieux en moyenne que celles <75%.`,
        });
      }
    }

    // ──────────────────────────────────────
    // 3. PATTERN : Weekend vs Semaine
    // ──────────────────────────────────────
    if (foodLogs.length >= 14) {
      const logsByDayOfWeek = {};
      for (const log of foodLogs) {
        const dow = new Date(log.log_date || log.date).getDay(); // 0=dim
        if (!logsByDayOfWeek[dow]) logsByDayOfWeek[dow] = [];
        logsByDayOfWeek[dow].push(log);
      }

      const weekdayLogs = [1, 2, 3, 4, 5].flatMap(d => logsByDayOfWeek[d] || []);
      const weekendLogs = [0, 6].flatMap(d => logsByDayOfWeek[d] || []);

      // Compter jours uniques
      const weekdayDays = new Set([1, 2, 3, 4, 5].flatMap(d =>
        (logsByDayOfWeek[d] || []).map(l => l.log_date || l.date)
      )).size;
      const weekendDays = new Set([0, 6].flatMap(d =>
        (logsByDayOfWeek[d] || []).map(l => l.log_date || l.date)
      )).size;

      const avgWeekday = weekdayDays > 0 ? weekdayLogs.length / weekdayDays : 0;
      const avgWeekend = weekendDays > 0 ? weekendLogs.length / weekendDays : 0;

      if (avgWeekday > 0 && avgWeekend > 0) {
        const ratio = avgWeekend / avgWeekday;
        if (ratio < 0.6) {
          insights.push({
            type: 'pattern',
            priority: 3,
            icon: '📊',
            title: 'Logging en baisse le weekend',
            body: `Tu logges ${Math.round(avgWeekend * 10) / 10} items/jour le weekend vs ${Math.round(avgWeekday * 10) / 10} en semaine. Pense a maintenir le suivi.`,
          });
        } else if (ratio > 1.4) {
          insights.push({
            type: 'pattern',
            priority: 3,
            icon: '📊',
            title: 'Plus actif le weekend',
            body: `Tu logges davantage le weekend — bien joue pour la constance !`,
          });
        }
      }
    }

    // ──────────────────────────────────────
    // 4. ALERTE PROACTIVE : Pas de log
    // ──────────────────────────────────────
    if (foodLogs.length > 0) {
      const lastLogDate = foodLogs
        .map(l => l.log_date || l.date)
        .sort()
        .pop();

      if (lastLogDate) {
        const daysSinceLast = Math.floor(
          (new Date() - new Date(lastLogDate)) / 86400000
        );
        if (daysSinceLast >= 2) {
          insights.push({
            type: 'alert',
            priority: 0,
            icon: '⚡',
            title: `Pas de log depuis ${daysSinceLast} jour${daysSinceLast > 1 ? 's' : ''}`,
            body: `Reprends ton suivi — meme un log partiel vaut mieux que rien.`,
          });
        }
      }
    }

    // ──────────────────────────────────────
    // 5. MACRO FOCUS : Quelle macro est la plus en retard ?
    // ──────────────────────────────────────
    if (weekTargets && foodLogs.length > 0) {
      // Calculer consommation semaine en cours
      const now = new Date();
      const day = now.getDay();
      const diffToMon = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMon);
      const mondayStr = monday.toISOString().slice(0, 10);

      const weekLogs = foodLogs.filter(l => (l.log_date || l.date) >= mondayStr);
      const weekActual = { kcal: 0, p: 0, l: 0, g: 0 };
      for (const log of weekLogs) {
        weekActual.kcal += log.kcal || 0;
        weekActual.p += log.p || 0;
        weekActual.l += log.l || 0;
        weekActual.g += log.g || 0;
      }

      // Proportion de la semaine ecoulee
      const daysElapsed = Math.max(1, Math.floor((now - monday) / 86400000) + 1);
      const expectedRatio = daysElapsed / 7;

      const macros = [
        { key: 'p', label: 'proteines', target: weekTargets.p },
        { key: 'l', label: 'lipides', target: weekTargets.l },
        { key: 'g', label: 'glucides', target: weekTargets.g },
      ];

      const behindMacros = macros
        .map(m => ({
          ...m,
          actual: weekActual[m.key],
          expected: m.target * expectedRatio,
          deficit: Math.round(m.target * expectedRatio - weekActual[m.key]),
        }))
        .filter(m => m.actual < m.expected * 0.85); // plus de 15% en retard

      if (behindMacros.length > 0) {
        const worst = behindMacros.sort((a, b) =>
          (a.actual / a.expected) - (b.actual / b.expected)
        )[0];
        const pct = Math.round((worst.actual / worst.expected) * 100);
        insights.push({
          type: 'recommendation',
          priority: 2,
          icon: '🎯',
          title: `Focus ${worst.label} cette semaine`,
          body: `Tu es a ${pct}% de ta cible ${worst.label} pour cette semaine (-${worst.deficit}g). Ajoute des sources de ${worst.label} a tes prochains repas.`,
        });
      }
    }

    // ──────────────────────────────────────
    // 6. STREAK : Jours consecutifs de logging
    // ──────────────────────────────────────
    if (foodLogs.length > 0) {
      const logDates = [...new Set(foodLogs.map(l => l.log_date || l.date))].sort().reverse();
      let streak = 0;
      const today = new Date().toISOString().slice(0, 10);
      let checkDate = today;

      for (let i = 0; i < 365; i++) {
        if (logDates.includes(checkDate)) {
          streak++;
          const d = new Date(checkDate);
          d.setDate(d.getDate() - 1);
          checkDate = d.toISOString().slice(0, 10);
        } else {
          break;
        }
      }

      if (streak >= 3) {
        insights.push({
          type: 'streak',
          priority: 4,
          icon: '🔥',
          title: `${streak} jours consecutifs de logging`,
          body: streak >= 7
            ? `Excellente regularite ! Ta constance est ta meilleure alliee.`
            : `Continue — la regularite bat la perfection.`,
        });
      }
    }

    // ──────────────────────────────────────
    // 7. TENDANCE BILANS
    // ──────────────────────────────────────
    if (bilans.length >= 3) {
      const last3 = bilans.slice(0, 3);
      const trend = last3[0].score - last3[2].score;
      if (trend > 10) {
        insights.push({
          type: 'trend',
          priority: 3,
          icon: '📈',
          title: 'Score en hausse',
          body: `+${trend} points sur les 3 derniers bilans. Ta progression est visible.`,
        });
      } else if (trend < -10) {
        insights.push({
          type: 'trend',
          priority: 2,
          icon: '📉',
          title: 'Score en baisse',
          body: `${trend} points sur les 3 derniers bilans. Identifie ce qui a change et ajuste.`,
        });
      }
    }

    // Tri par priorite (0 = le plus urgent)
    return insights.sort((a, b) => a.priority - b.priority);
  }, [foodLogs, measurements, bilans, weekTargets, planTargets, slots]);
}
```

### 4.2 Composant InsightCard

```jsx
function InsightCard({ insight, accentColor }) {
  const bgMap = {
    alert: 'rgba(255,59,48,.06)',
    prediction: 'rgba(52,199,89,.06)',
    correlation: 'rgba(59,130,246,.06)',
    pattern: 'rgba(198,160,91,.06)',
    recommendation: 'rgba(139,92,246,.06)',
    streak: 'rgba(232,134,58,.06)',
    trend: 'rgba(198,160,91,.06)',
  };
  const borderMap = {
    alert: 'rgba(255,59,48,.15)',
    prediction: 'rgba(52,199,89,.15)',
    correlation: 'rgba(59,130,246,.15)',
    pattern: 'rgba(198,160,91,.15)',
    recommendation: 'rgba(139,92,246,.15)',
    streak: 'rgba(232,134,58,.15)',
    trend: 'rgba(198,160,91,.15)',
  };

  return (
    <div style={{
      background: bgMap[insight.type] || 'rgba(15,30,46,.04)',
      border: `1px solid ${borderMap[insight.type] || 'rgba(15,30,46,.08)'}`,
      borderRadius: 14,
      padding: '12px 14px',
      marginBottom: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 16 }}>{insight.icon}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#1A1A1A' }}>
          {insight.title}
        </span>
      </div>
      <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5, paddingLeft: 24 }}>
        {insight.body}
      </div>
    </div>
  );
}
```

---

## 5. Tables non exploitees

### 5.1 user_streaks

**Etat** : Table existante dans Supabase, jamais lue ni ecrite.

**Proposition** : Calculer les streaks cote client (voir `useInsights` section 6) et ecrire dans `user_streaks` pour persistence + notifications push.

```sql
-- Mise a jour automatique via trigger ou edge function
CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcul du streak logging
  WITH consecutive_days AS (
    SELECT DISTINCT log_date
    FROM food_logs
    WHERE user_id = NEW.user_id
    ORDER BY log_date DESC
  )
  -- ... calcul du streak courant
  UPDATE user_streaks
  SET current_streak = calculated_streak,
      longest_streak = GREATEST(longest_streak, calculated_streak),
      updated_at = now()
  WHERE user_id = NEW.user_id
    AND streak_type = 'logging';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 5.2 user_milestones

**Etat** : Table existante, jamais exploitee.

**Propositions de milestones** :
- `first_log` : Premier aliment logge
- `first_week_complete` : Premiere semaine avec score > 70
- `streak_7` / `streak_14` / `streak_30` : Streaks de logging
- `weight_milestone_1` / `_2` / `_5` : Premiers 1/2/5 kg perdus (ou pris pour GAIN)
- `adherence_90` : Premiere semaine > 90%
- `all_slots_logged` : Premiere journee ou tous les slots sont remplis

```jsx
function MilestoneBadge({ milestone }) {
  const icons = {
    first_log: '🌱',
    first_week_complete: '⭐',
    streak_7: '🔥',
    streak_14: '💪',
    streak_30: '🏆',
    weight_milestone_1: '📉',
    weight_milestone_2: '📉',
    weight_milestone_5: '🎉',
    adherence_90: '💎',
    all_slots_logged: '✅',
  };
  const labels = {
    first_log: 'Premier log',
    first_week_complete: 'Premiere semaine',
    streak_7: '7 jours de suite',
    streak_14: '14 jours de suite',
    streak_30: '30 jours de suite',
    weight_milestone_1: '-1 kg',
    weight_milestone_2: '-2 kg',
    weight_milestone_5: '-5 kg',
    adherence_90: 'Score 90+',
    all_slots_logged: 'Journee complete',
  };

  const achieved = !!milestone.achieved_at;

  return (
    <div style={{
      width: 64, textAlign: 'center',
      opacity: achieved ? 1 : 0.3,
      filter: achieved ? 'none' : 'grayscale(1)',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 24, margin: '0 auto 4px',
        background: achieved ? 'rgba(198,160,91,.12)' : 'rgba(15,30,46,.04)',
        border: achieved ? '2px solid rgba(198,160,91,.3)' : '2px solid rgba(15,30,46,.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20,
      }}>
        {icons[milestone.milestone_type] || '🏅'}
      </div>
      <div style={{ fontSize: 9, fontWeight: 700, color: '#1A1A1A' }}>
        {labels[milestone.milestone_type] || milestone.milestone_type}
      </div>
      {achieved && (
        <div style={{ fontSize: 8, color: '#6B7280' }}>
          {new Date(milestone.achieved_at).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' })}
        </div>
      )}
    </div>
  );
}
```

### 5.3 plan_progression (GAIN)

**Etat** : Table existante pour les phases de prise, jamais lue cote app.

**Action** : Ajouter a `usePlanData.js` un fetch de `plan_progression` et afficher le composant `PhaseTimeline` (section 3.8) uniquement pour les objectifs GAIN_*.

---

## 6. Vue dieteticien (future)

### 6.1 Dashboard Multi-Patients

```
┌──────────────────────────────────────────────────────────┐
│  ELEVIA — Tableau de bord dieteticien                    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─ Patients a risque ──────────────────────────────┐   │
│  │ 🔴 Martin D. — Pas de log depuis 4 jours        │   │
│  │ 🟠 Sophie L. — Score en baisse (82→58→45)       │   │
│  │ 🟡 Jean R.   — Proteines < 70% depuis 3 sem.    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─ Statistiques globales ──────────────────────────┐   │
│  │  Patients actifs : 24  │  Score moyen : 72%      │   │
│  │  Taux logging 7j : 83% │  Retention 30j : 91%   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─ Tous les patients ──────────────────────────────┐   │
│  │ Nom        │ Objectif │ Sem. │ Score │ Delta kg  │   │
│  │ Martin D.  │ PW       │  S8  │  78%  │ -3.2 kg   │   │
│  │ Sophie L.  │ MAINT    │  S12 │  45%  │ +1.1 kg   │   │
│  │ Jean R.    │ GAIN_L   │  S6  │  82%  │ +2.4 kg   │   │
│  │ ...        │ ...      │ ...  │  ...  │ ...       │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 6.2 Alertes Patients

**Declencheurs automatiques** (Edge Functions Supabase) :

| Alerte | Condition | Priorite |
|--------|-----------|----------|
| Inactivite | 0 logs depuis 3+ jours | Haute |
| Score en chute | 3 bilans consecutifs en baisse de >10 pts | Haute |
| Macro desequilibree | Proteines < 70% cible pendant 2+ semaines | Moyenne |
| Objectif stagne | Poids stable (+/-0.3kg) depuis 3+ semaines (PW) | Moyenne |
| Milestone atteint | Patient atteint un milestone significatif | Basse (celebrer) |

### 6.3 Statistiques Aggregees

- Adherence moyenne par objectif (PW vs GAIN)
- Correlation globale adherence/resultats sur tous les patients
- Taux de retention (% patients actifs a 30/60/90 jours)
- Meilleurs/pires jours de la semaine (logging collectif)
- EQ les plus/moins consommees par objectif

---

## 7. Hooks et composants concrets

### 7.1 Hook : useFoodLogHistory (NOUVEAU)

Le probleme principal : les food_logs historiques ne sont pas fetches. Ce hook resout ce manque.

```jsx
// === src/hooks/useFoodLogHistory.js ===

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Fetches historical food logs for analytics.
 * NOT for daily tracking (that's useFoodLogs).
 * Returns aggregated data by date, slot, and eq.
 */
export function useFoodLogHistory(userId, planId, weeksBack = 12) {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !planId) return;
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - weeksBack * 7);
      const startStr = startDate.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from('food_logs')
        .select('log_date, slot_id, eq_id, item_id, qty')
        .eq('user_id', userId)
        .gte('log_date', startStr)
        .order('log_date');

      if (cancelled || error) return;

      // Aggregate by date
      const byDate = {};
      const bySlotByDate = {};
      const byEq = {};

      for (const row of (data || [])) {
        const d = row.log_date;
        const qty = Number(row.qty || 1);

        // By date
        if (!byDate[d]) byDate[d] = { count: 0, kcal: 0 };
        byDate[d].count += qty;

        // By slot by date (for stacked bar)
        const slotKey = `${d}::${row.slot_id}`;
        if (!bySlotByDate[slotKey]) bySlotByDate[slotKey] = { date: d, slot: row.slot_id, count: 0 };
        bySlotByDate[slotKey].count += qty;

        // By eq (global frequency)
        if (!byEq[row.eq_id]) byEq[row.eq_id] = 0;
        byEq[row.eq_id] += qty;
      }

      setHistory({
        raw: data || [],
        byDate,
        bySlotByDate: Object.values(bySlotByDate),
        byEq,
        totalLogs: (data || []).length,
        totalDays: Object.keys(byDate).length,
      });
      setLoading(false);
    }

    fetch();
    return () => { cancelled = true };
  }, [userId, planId, weeksBack]);

  return { history, loading };
}
```

### 7.2 Hook : useWeeklyMacros (NOUVEAU)

Calcule les macros reelles par semaine a partir des food_logs + catalogue.

```jsx
// === src/hooks/useWeeklyMacros.js ===

import { useMemo } from 'react';

/**
 * Computes weekly macro aggregates from food log history + catalogue.
 * Replaces the hardcoded data in ProfileTab's macro trend chart.
 */
export function useWeeklyMacros(foodLogHistory, catalogue, weekTargets, weeksToShow = 8) {
  return useMemo(() => {
    if (!foodLogHistory?.raw || !catalogue) return [];

    // Build a lookup: eqId -> nutrientsPerPortion
    const eqLookup = {};
    for (const eq of catalogue) {
      eqLookup[eq.eqId] = eq.nutrientsPerPortion;
    }

    // Group logs by week (Monday-Sunday)
    const weekBuckets = {};
    for (const log of foodLogHistory.raw) {
      const d = new Date(log.log_date);
      const day = d.getDay();
      const diffToMon = day === 0 ? -6 : 1 - day;
      const monday = new Date(d);
      monday.setDate(d.getDate() + diffToMon);
      const weekKey = monday.toISOString().slice(0, 10);

      if (!weekBuckets[weekKey]) weekBuckets[weekKey] = { kcal: 0, p: 0, l: 0, g: 0 };

      const nutrients = eqLookup[log.eq_id];
      const qty = Number(log.qty || 1);
      if (nutrients) {
        weekBuckets[weekKey].kcal += nutrients.kcal * qty;
        weekBuckets[weekKey].p += nutrients.p * qty;
        weekBuckets[weekKey].l += nutrients.l * qty;
        weekBuckets[weekKey].g += nutrients.g * qty;
      }
    }

    // Convert to array, normalize as % of target, sort, take last N
    return Object.entries(weekBuckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-weeksToShow)
      .map(([weekStart, actual], i) => {
        const weekNum = `S${i + 1}`;
        return {
          w: weekNum,
          weekStart,
          kcal: weekTargets.kcal > 0 ? Math.round((actual.kcal / weekTargets.kcal) * 100) : 0,
          p: weekTargets.p > 0 ? Math.round((actual.p / weekTargets.p) * 100) : 0,
          l: weekTargets.l > 0 ? Math.round((actual.l / weekTargets.l) * 100) : 0,
          g: weekTargets.g > 0 ? Math.round((actual.g / weekTargets.g) * 100) : 0,
          rawKcal: Math.round(actual.kcal),
          rawP: Math.round(actual.p),
          rawL: Math.round(actual.l),
          rawG: Math.round(actual.g),
        };
      });
  }, [foodLogHistory, catalogue, weekTargets, weeksToShow]);
}
```

### 7.3 Composant HistoryTab enrichi (PROPOSITION)

```jsx
function EnrichedHistoryTab({ logs, foodLogHistory, measurements, bilans, weekTargets, planTargets, catalogue }) {
  const obj = useObjective();
  const insights = useInsights({ foodLogs: foodLogHistory?.raw, measurements, bilans, weekTargets, planTargets });
  const [viewBilan, setViewBilan] = useState(null);
  const [activeSection, setActiveSection] = useState('insights'); // insights | charts | bilans

  if (viewBilan) return <EnrichedBilanDetail bilan={viewBilan} onBack={() => setViewBilan(null)} />;

  const tabs = [
    { id: 'insights', label: 'Insights' },
    { id: 'charts', label: 'Graphiques' },
    { id: 'bilans', label: 'Bilans' },
  ];

  return (
    <div className="page">
      <div className="page-title">Historique</div>
      <div className="page-meta">Analyse de tes donnees</div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveSection(t.id)}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 99, fontSize: 12, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', border: 'none',
              background: activeSection === t.id ? '#0E1E2E' : 'rgba(15,30,46,.06)',
              color: activeSection === t.id ? obj.accent : '#6B7280',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeSection === 'insights' && (
        <>
          {insights.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 24 }}>
              <div style={{ fontSize: 13, color: '#6B7280' }}>
                Continue a logger tes repas pour debloquer tes premiers insights.
              </div>
            </div>
          ) : (
            insights.map((insight, i) => (
              <InsightCard key={i} insight={insight} accentColor={obj.accent} />
            ))
          )}

          {/* Adherence Heatmap */}
          <AdherenceHeatmap
            foodLogsByDate={foodLogHistory?.byDate || {}}
            planTargetCount={Object.keys(planTargets || {}).length}
          />
        </>
      )}

      {activeSection === 'charts' && (
        <>
          <MacroRadar weekActual={/* computed */} weekTargets={weekTargets} accentColor={obj.accent} />
          <CaloriesBySlot weeklySlotData={/* computed from foodLogHistory */} />
          <AdherenceWeightCorrelation bilans={bilans} measurements={measurements} accentColor={obj.accent} />
        </>
      )}

      {activeSection === 'bilans' && (
        <>
          {/* Existing bilan list */}
          <div className="card">
            {bilans.map((b, i) => (
              <div key={i} className="bilan-row" onClick={() => setViewBilan(b)} style={{ cursor: 'pointer' }}>
                {/* ... existing bilan row rendering ... */}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

---

## 8. Priorisation

### Phase 1 — Quick Wins (1-2 jours)

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 1 | **Remplacer donnees macro fictives** par `useWeeklyMacros` (lignes 961-964 de `elevia-prototype.jsx`) | Haut — les graphiques existants deviennent reels | Faible |
| 2 | **Afficher energy/hunger/sleep/stress** dans BilanDetail (WellbeingRadar) | Moyen — exploite des donnees deja collectees | Faible |
| 3 | **Ajouter InsightCard** avec 2-3 insights basiques (streak, alerte inactivite) | Haut — valeur percue immediate | Faible |

### Phase 2 — Valeur Analytique (3-5 jours)

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 4 | **useFoodLogHistory** : fetcher l'historique complet des food_logs | Prerequis pour tout le reste | Moyen |
| 5 | **AdherenceHeatmap** dans HistoryTab | Haut — "don't break the chain" | Moyen |
| 6 | **MacroRadar** dans HistoryTab ou BilanDetail | Moyen — equilibre visuel | Moyen |
| 7 | **WeightTrendWithPrediction** dans ProfileTab > measures | Haut — repond a LA question patient | Moyen |

### Phase 3 — Analytics Avancees (1-2 semaines)

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 8 | **Correlation adherence/poids** (scatter plot) | Moyen — preuve visuelle que l'effort paye | Moyen |
| 9 | **CaloriesBySlot** (stacked bar) | Moyen — pattern alimentaire | Moyen |
| 10 | **BodyComposition** (composed chart) | Moyen — pour les patients qui mesurent BF% | Moyen |
| 11 | **useInsights complet** avec tous les 7 types d'insights | Haut — differentiation premium | Eleve |
| 12 | **Milestones + Badges** (user_milestones) | Moyen — gamification | Eleve |

### Phase 4 — Vue Dieteticien (futur)

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 13 | Dashboard multi-patients | Tres haut pour Audric | Eleve |
| 14 | Alertes patients automatiques | Tres haut — proactivite | Eleve |
| 15 | PhaseTimeline pour GAIN | Moyen — specifique a un objectif | Moyen |

---

## Resume des recommandations cles

1. **Le probleme numero 1** est que les food_logs historiques ne sont PAS fetches. Sans `useFoodLogHistory`, aucune visualisation temporelle n'est possible.

2. **Les donnees deja collectees mais ignorees** (energy_level, hunger_level, sleep_quality, stress_level dans weekly_bilans) doivent etre affichees — c'est du travail perdu de les collecter sans les montrer.

3. **Le graphique macro est faux** (donnees fictives codees en dur aux lignes 961-964). C'est la correction la plus urgente car l'utilisateur pourrait croire que ces donnees sont reelles.

4. **Les insights automatiques** sont le plus gros levier de differentiation. Une app qui "te parle" et analyse tes donnees pour toi est percue comme premium. Le hook `useInsights` propose est un point de depart solide.

5. **La prediction de poids** repond a la question la plus frequente des patients : "Quand vais-je atteindre mon objectif ?". Une regression lineaire simple suffit pour donner une estimation motivante.

6. **Les tables user_streaks, user_milestones, plan_progression** existent mais ne sont pas connectees. Les connecter ajoute de la gamification sans redesign.

7. **Recharts supporte deja** RadarChart, ScatterChart, ComposedChart — pas de nouvelle dependance necessaire.

---

## Annexe : Imports recharts necessaires

Pour implementer toutes les visualisations proposees, l'import recharts dans `elevia-prototype.jsx` devra etre etendu :

```jsx
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
  // Nouveaux pour cet audit :
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter,
  ComposedChart,
} from 'recharts';
```

Aucune nouvelle dependance npm n'est requise — tout est deja dans `recharts@2.15.3`.
