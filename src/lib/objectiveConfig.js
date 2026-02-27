/**
 * Objective-specific UX configuration.
 * Each nutritional objective gets its own accent colour, vocabulary,
 * progress-direction logic and catalogue filter field.
 */

const OBJECTIVE_CONFIG = {
  /* ── Perte de poids ── */
  PW: {
    code: 'PW',
    accent: '#C6A05B',          // gold
    accentSoft: 'rgba(198,160,91,.12)',
    accentBorder: 'rgba(198,160,91,.22)',
    accentBorderStrong: 'rgba(198,160,91,.34)',
    accentLine: 'rgba(198,160,91,.55)',

    kcalFraming: 'Budget',       // "ne pas dépasser"
    kcalVerb: 'dépensé',
    progressDir: 'down',         // sous cible = bien
    // Ring kcal jour : orange si >115%
    ringOrangeThreshold: 1.15,
    ringOrangeDir: 'above',
    // PBar : >120% = orange (trop), ≥100% = vert, <100% = accent
    pbarOrangeAbove: 120,
    pbarGreenAbove: 100,

    dayHint: "Repère indicatif — l'équilibre se fait sur la semaine.",
    hpEducation: "Logger ce qui est hors plan, c'est garder un suivi honnête. L'objectif reste de revenir au cadre.",
    welcomeSubtitle: 'Nutrition personnalisée',

    scoreLabels: [
      { min: 85, label: 'Très solide' },
      { min: 70, label: 'Solide' },
      { min: 55, label: 'Correct' },
      { min: 0,  label: 'À ajuster' },
    ],

    bilanSummary: {
      85: "Excellente semaine ! Tu as suivi ton plan avec constance. Continue sur cette lancée.",
      70: "Bonne semaine dans l'ensemble. Quelques ajustements possibles mais la dynamique est positive.",
      55: "Semaine correcte avec des points à consolider. Identifie les moments de difficulté pour mieux anticiper.",
      0:  "Semaine à ajuster. Pas d'inquiétude — chaque semaine est une nouvelle occasion de progresser.",
    },

    weekAlertTitle: 'Fruits en retard cette semaine',
    weekAlertMsg: 'Il te reste surtout les fruits à placer. Ajoute 1–2 options simples par jour.',

    eqFilterField: 'obj_pw',

    // KPI direction on profile
    kpiDir: 'down',       // weight going down = good
    kpiColor: '#34C759',  // green for PW delta
    kpiArrow: '↓',
    kpiSign: '-',
  },

  /* ── Maintien ── */
  MAINT: {
    code: 'MAINT',
    accent: '#C6A05B',
    accentSoft: 'rgba(198,160,91,.12)',
    accentBorder: 'rgba(198,160,91,.22)',
    accentBorderStrong: 'rgba(198,160,91,.34)',
    accentLine: 'rgba(198,160,91,.55)',

    kcalFraming: 'Cible',
    kcalVerb: 'consommé',
    progressDir: 'neutral',
    ringOrangeThreshold: 1.15,
    ringOrangeDir: 'above',
    pbarOrangeAbove: 120,
    pbarGreenAbove: 100,

    dayHint: "Ton corps a besoin de régularité. Vise ta cible chaque jour.",
    hpEducation: "Logger ce qui est hors plan, c'est garder un suivi honnête. L'objectif reste de stabiliser.",
    welcomeSubtitle: 'Nutrition personnalisée',

    scoreLabels: [
      { min: 85, label: 'Très solide' },
      { min: 70, label: 'Solide' },
      { min: 55, label: 'Correct' },
      { min: 0,  label: 'À ajuster' },
    ],

    bilanSummary: {
      85: "Excellente semaine ! Tu maintiens parfaitement ton équilibre.",
      70: "Bonne semaine. Ton poids reste stable, continue comme ça.",
      55: "Semaine correcte. Quelques ajustements pour rester dans la zone.",
      0:  "Semaine à recentrer. Pas d'inquiétude, l'objectif est la constance.",
    },

    weekAlertTitle: 'Régularité — tes repas cette semaine',
    weekAlertMsg: 'Vise la constance pour stabiliser ton poids. Vérifie que chaque repas est complet.',

    eqFilterField: 'obj_pw',

    kpiDir: 'neutral',
    kpiColor: '#C6A05B',
    kpiArrow: '→',
    kpiSign: '',
  },

  /* ── Prise de muscle sèche ── */
  GAIN_LEAN: {
    code: 'GAIN_LEAN',
    accent: '#3B7BF6',          // blue
    accentSoft: 'rgba(59,123,246,.12)',
    accentBorder: 'rgba(59,123,246,.22)',
    accentBorderStrong: 'rgba(59,123,246,.34)',
    accentLine: 'rgba(59,123,246,.55)',

    kcalFraming: 'Objectif',     // "atteindre"
    kcalVerb: 'atteint',
    progressDir: 'up',           // sous cible = pas assez
    // Ring kcal jour : orange si <85%
    ringOrangeThreshold: 0.85,
    ringOrangeDir: 'below',
    // PBar : <80% = orange (pas assez), ≥100% = vert, entre = accent
    pbarOrangeAbove: null,
    pbarGreenAbove: 100,
    pbarOrangeBelow: 80,

    dayHint: 'Les muscles se construisent aussi à table. Atteins ta cible.',
    hpEducation: "Logger ce qui est hors plan, c'est garder un suivi honnête. Atteindre ta cible calorique reste la priorité.",
    welcomeSubtitle: 'Performance nutritionnelle',

    scoreLabels: [
      { min: 85, label: 'Solide' },
      { min: 70, label: 'En route' },
      { min: 55, label: 'À renforcer' },
      { min: 0,  label: 'Insuffisant' },
    ],

    bilanSummary: {
      85: "Semaine solide ! Tu atteins tes objectifs nutritionnels avec constance.",
      70: "Tu es en route. Continue à viser ta cible calorique chaque jour.",
      55: "Semaine à renforcer. Tes protéines et tes calories méritent plus d'attention.",
      0:  "Objectif non atteint cette semaine. Assure-toi de manger suffisamment pour progresser.",
    },

    weekAlertTitle: 'Protéines — objectif non atteint',
    weekAlertMsg: "Tu es sous ta cible protéines. Ajoute 1-2 sources par jour pour soutenir ta prise de muscle.",

    eqFilterField: 'obj_mass',

    kpiDir: 'up',
    kpiColor: '#3B7BF6',
    kpiArrow: '↑',
    kpiSign: '+',
  },

  /* ── Prise de poids confort ── */
  GAIN_COMFORT: {
    code: 'GAIN_COMFORT',
    accent: '#3B7BF6',
    accentSoft: 'rgba(59,123,246,.12)',
    accentBorder: 'rgba(59,123,246,.22)',
    accentBorderStrong: 'rgba(59,123,246,.34)',
    accentLine: 'rgba(59,123,246,.55)',

    kcalFraming: 'Objectif',
    kcalVerb: 'atteint',
    progressDir: 'up',
    ringOrangeThreshold: 0.85,
    ringOrangeDir: 'below',
    pbarOrangeAbove: null,
    pbarGreenAbove: 100,
    pbarOrangeBelow: 80,

    dayHint: 'Manger suffisamment est ton objectif. Chaque repas compte.',
    hpEducation: "Logger ce qui est hors plan, c'est garder un suivi honnête. Atteindre ta cible calorique reste la priorité.",
    welcomeSubtitle: 'Nutrition personnalisée',

    scoreLabels: [
      { min: 85, label: 'Solide' },
      { min: 70, label: 'En route' },
      { min: 55, label: 'À renforcer' },
      { min: 0,  label: 'Insuffisant' },
    ],

    bilanSummary: {
      85: "Semaine solide ! Tu atteins tes cibles avec régularité.",
      70: "Tu es en bonne voie. Continue à manger suffisamment.",
      55: "Semaine à renforcer. Essaie de ne pas sauter de repas.",
      0:  "Objectif non atteint. Manger suffisamment est essentiel pour ta santé.",
    },

    weekAlertTitle: 'Calories — objectif non atteint',
    weekAlertMsg: "Tu es sous ta cible calorique. Assure-toi de compléter chaque repas.",

    eqFilterField: 'obj_mass',

    kpiDir: 'up',
    kpiColor: '#3B7BF6',
    kpiArrow: '↑',
    kpiSign: '+',
  },

  /* ── Prise guidée ── */
  GAIN_GUIDE: {
    code: 'GAIN_GUIDE',
    accent: '#3B7BF6',
    accentSoft: 'rgba(59,123,246,.12)',
    accentBorder: 'rgba(59,123,246,.22)',
    accentBorderStrong: 'rgba(59,123,246,.34)',
    accentLine: 'rgba(59,123,246,.55)',

    kcalFraming: 'Objectif',
    kcalVerb: 'atteint',
    progressDir: 'up',
    ringOrangeThreshold: 0.85,
    ringOrangeDir: 'below',
    pbarOrangeAbove: null,
    pbarGreenAbove: 100,
    pbarOrangeBelow: 80,

    dayHint: 'Chaque repas te rapproche de ton objectif.',
    hpEducation: "Logger ce qui est hors plan, c'est garder un suivi honnête. Atteindre ta cible calorique reste la priorité.",
    welcomeSubtitle: 'Nutrition guidée',

    scoreLabels: [
      { min: 85, label: 'Solide' },
      { min: 70, label: 'En route' },
      { min: 55, label: 'À renforcer' },
      { min: 0,  label: 'Insuffisant' },
    ],

    bilanSummary: {
      85: "Semaine solide ! Tes efforts paient.",
      70: "Tu es en route. Continue à suivre ton plan.",
      55: "Semaine à renforcer. Concentre-toi sur la régularité.",
      0:  "Objectif non atteint. Chaque semaine est une opportunité.",
    },

    weekAlertTitle: 'Calories — objectif non atteint',
    weekAlertMsg: "Tu es sous ta cible. Essaie de compléter chaque repas.",

    eqFilterField: 'obj_mass',

    kpiDir: 'up',
    kpiColor: '#3B7BF6',
    kpiArrow: '↑',
    kpiSign: '+',
  },
}

/**
 * Get the config for an objective code, defaulting to PW.
 */
export function getObjectiveConfig(code) {
  return OBJECTIVE_CONFIG[code] || OBJECTIVE_CONFIG.PW
}

/**
 * Get score label from config
 */
export function getScoreLabel(config, score) {
  for (const { min, label } of config.scoreLabels) {
    if (score >= min) return label
  }
  return config.scoreLabels[config.scoreLabels.length - 1].label
}

/**
 * Get bilan summary text from config
 */
export function getBilanSummary(config, score) {
  const thresholds = Object.keys(config.bilanSummary)
    .map(Number)
    .sort((a, b) => b - a)
  for (const t of thresholds) {
    if (score >= t) return config.bilanSummary[t]
  }
  return config.bilanSummary[0]
}

export default OBJECTIVE_CONFIG
