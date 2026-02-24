import { useState, useMemo, useCallback } from "react";

/* ─────────────────────────── BRAND TOKENS ─────────────────────────── */
const B = {
  navy: "#0E1E2E",
  gold: "#C6A05B",
  goldSoft: "rgba(198,160,91,.12)",
  goldBorder: "rgba(198,160,91,.22)",
  goldBorderStrong: "rgba(198,160,91,.34)",
  goldLine: "rgba(198,160,91,.55)",
  ivory: "#F7F7F7",
  white: "#FFFFFF",
  text: "#1A1A1A",
  textMuted: "#6B7280",
  textFaint: "rgba(15,30,46,.42)",
  hairline: "rgba(15,30,46,.10)",
  border: "#E5E7EB",
  warmBorder: "#F5EEE1",
  orange: "#E8863A",
  orangeLight: "rgba(232,134,58,.12)",
  green: "#34C759",
  greenSoft: "rgba(52,199,89,.12)",
  red: "#FF3B30",
  redSoft: "rgba(255,59,48,.08)",
};

const R = { sm: 12, md: 16, lg: 20, pill: 999 };
const SHADOW = "0 4px 24px rgba(0,0,0,.06)";

/* ─────────────────────────── MOCK DATA ─────────────────────────── */
const SLOTS = [
  { id: "breakfast", label: "Petit-déjeuner", icon: "☀️", time: "7h30" },
  { id: "snack1", label: "Collation matin", icon: "🍎", time: "10h" },
  { id: "coldMeal", label: "Déjeuner froid", icon: "🥗", time: "12h30" },
  { id: "snack2", label: "Collation après-midi", icon: "🍫", time: "16h" },
  { id: "hotMeal", label: "Dîner chaud", icon: "🍽️", time: "19h30" },
];

const EQUIVALENCES = [
  { eqId: "pain", label: "Pain", type: "carbs", mode: "R", target: 14, consumed: 10, kcalPer: 90, importance: "normal", icon: "🍞" },
  { eqId: "fruits_natures", label: "Fruits natures", type: "fruits", mode: "R", target: 14, consumed: 8, kcalPer: 89, importance: "key", icon: "🍎" },
  { eqId: "legumes_cuits", label: "Légumes cuits", type: "veg", mode: "F", target: 14, consumed: 14, kcalPer: 29, importance: "key", icon: "🥦" },
  { eqId: "legumes_crus", label: "Légumes crus", type: "veg", mode: "F", target: 14, consumed: 11, kcalPer: 22, importance: "key", icon: "🥕" },
  { eqId: "viandes_faibles_kcal", label: "Viandes maigres", type: "protein", mode: "F", target: 7, consumed: 6, kcalPer: 110, importance: "key", icon: "🥩" },
  { eqId: "poissons_maigres", label: "Poissons maigres", type: "protein", mode: "F", target: 3, consumed: 2, kcalPer: 95, importance: "key", icon: "🐟" },
  { eqId: "feculents_chauds", label: "Féculents chauds", type: "carbs", mode: "R", target: 14, consumed: 12, kcalPer: 130, importance: "normal", icon: "🍚" },
  { eqId: "oleagineux", label: "Oléagineux", type: "fat", mode: "R", target: 7, consumed: 5, kcalPer: 90, importance: "normal", icon: "🥜" },
  { eqId: "pl_0_riche_p", label: "Produits laitiers 0%", type: "dairy", mode: "R", target: 7, consumed: 7, kcalPer: 55, importance: "normal", icon: "🥛" },
  { eqId: "assaisonnement", label: "Assaisonnement", type: "fat", mode: "F", target: 14, consumed: 13, kcalPer: 45, importance: "flex", icon: "🫒" },
];

const LOGS = [
  { id: "1", slotId: "breakfast", eqId: "pain", eqLabel: "Pain gris", qty: 1, kcal: 90, p: 3.1, l: 1, g: 16.7, time: "7h42", hp: false },
  { id: "2", slotId: "breakfast", eqId: "fruits_natures", eqLabel: "Banane", qty: 1, kcal: 89, p: 1.9, l: 0.1, g: 18, time: "7h42", hp: false },
  { id: "3", slotId: "breakfast", eqId: "pl_0_riche_p", eqLabel: "Yaourt grec 0%", qty: 1, kcal: 55, p: 10, l: 0.2, g: 3.5, time: "7h43", hp: false },
  { id: "4", slotId: "snack1", eqId: "fruits_natures", eqLabel: "Pomme", qty: 1, kcal: 72, p: 0.4, l: 0.2, g: 15, time: "10h15", hp: false },
  { id: "5", slotId: "coldMeal", eqId: "pain", eqLabel: "Pain complet", qty: 1, kcal: 95, p: 3.5, l: 1.2, g: 17, time: "12h35", hp: false },
  { id: "6", slotId: "coldMeal", eqId: "viandes_faibles_kcal", eqLabel: "Blanc de dinde", qty: 1, kcal: 110, p: 21.5, l: 2.5, g: 0.1, time: "12h35", hp: false },
  { id: "7", slotId: "coldMeal", eqId: "legumes_crus", eqLabel: "Salade & tomates", qty: 1, kcal: 22, p: 1.2, l: 0.1, g: 3.8, time: "12h36", hp: false },
  { id: "8", slotId: "snack2", eqId: "oleagineux", eqLabel: "Amandes", qty: 1, kcal: 90, p: 3, l: 7, g: 2, time: "16h10", hp: false },
  { id: "9", slotId: "hotMeal", eqId: "extras", eqLabel: "Verre de vin rouge", qty: 1, kcal: 85, p: 0, l: 0, g: 0.8, time: "20h15", hp: true },
];

const ADVICES_FOCUS = [
  { id: "1", title: "Manger assez de protéines", axis: "priority", status: "À renforcer", read: false, alert: true },
  { id: "2", title: "Réduire l'alcool", axis: "priority", status: "En progrès", read: true, alert: false },
  { id: "3", title: "Hydratation insuffisante", axis: "priority", status: "À renforcer", read: true, alert: false },
  { id: "4", title: "Limiter le sucre dans le café", axis: "secondary", status: "Nouveau", read: false, alert: false },
  { id: "5", title: "Mode lunch : sandwich", axis: "secondary", status: "Solide", read: true, alert: false },
  { id: "6", title: "Essayer les crudités au déjeuner", axis: "secondary", status: "En progrès", read: false, alert: false },
];

const MICRO_TIPS = [
  "Les fibres ralentissent l'absorption du sucre. Commence ton repas par les légumes.",
  "Un verre d'eau avant chaque repas aide à mieux écouter ta faim.",
  "Dormir moins de 7h augmente la faim et les envies sucrées le lendemain.",
];

const BILANS = [
  { week: "S8", dates: "17–23 fév", score: 78, label: "Solide" },
  { week: "S7", dates: "10–16 fév", score: 72, label: "Solide" },
  { week: "S6", dates: "3–9 fév", score: 65, label: "Correct" },
  { week: "S5", dates: "27 jan–2 fév", score: 82, label: "Très solide" },
  { week: "S4", dates: "20–26 jan", score: 58, label: "Correct" },
];

const WEEK_TARGETS = { kcal: 14000, p: 840, l: 420, g: 1400 };
const DAY_TARGETS = { kcal: 2000, p: 120, l: 60, g: 200 };

/* ─────────────────────────── STYLES ─────────────────────────── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

* { margin: 0; padding: 0; box-sizing: border-box; }

body { font-family: 'Inter', -apple-system, sans-serif; background: ${B.navy}; }

.phone {
  width: 393px; height: 852px; margin: 0 auto;
  background: ${B.ivory}; overflow: hidden;
  display: flex; flex-direction: column;
  border-radius: 40px; border: 6px solid #1a1a1a;
  position: relative;
  box-shadow: 0 20px 80px rgba(0,0,0,.4);
}

.notch {
  position: absolute; top: 0; left: 50%; transform: translateX(-50%);
  width: 126px; height: 34px; background: #1a1a1a;
  border-radius: 0 0 20px 20px; z-index: 100;
}

.status-bar {
  height: 54px; background: ${B.navy}; padding: 0 24px;
  display: flex; align-items: flex-end; justify-content: space-between;
  padding-bottom: 6px; flex-shrink: 0;
}
.status-time { color: #fff; font-size: 15px; font-weight: 700; }
.status-icons { color: #fff; font-size: 12px; font-weight: 600; display: flex; gap: 6px; align-items: center; }

.header {
  background: ${B.navy}; padding: 8px 20px 14px;
  border-bottom: 1px solid ${B.goldLine};
  display: flex; align-items: center; justify-content: flex-end;
  flex-shrink: 0;
}
.header-logo {
  font-size: 20px; font-weight: 800; letter-spacing: 2px;
  color: ${B.gold}; font-style: italic;
}

.content {
  flex: 1; overflow-y: auto; overflow-x: hidden;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}
.content::-webkit-scrollbar { display: none; }

.tab-bar {
  flex-shrink: 0; background: ${B.navy};
  border-top: 1px solid ${B.goldLine};
  display: flex; height: 82px; padding-top: 8px;
}
.tab-item {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  gap: 5px; padding-top: 6px; cursor: pointer; transition: all .15s;
  background: none; border: none; font-family: inherit;
}
.tab-icon { font-size: 22px; line-height: 1; }
.tab-label { font-size: 11px; font-weight: 700; }
.tab-item.active .tab-label { color: ${B.gold}; }
.tab-item:not(.active) .tab-label { color: rgba(255,255,255,.55); }
.tab-item:not(.active) .tab-icon { opacity: .55; }

/* Page padding */
.page { padding: 16px 18px 24px; }
.page-title { font-size: 30px; font-weight: 800; letter-spacing: -.3px; color: ${B.text}; }
.page-meta { font-size: 12px; font-weight: 700; color: ${B.textMuted}; margin-top: 2px; }

/* Segmented control */
.seg { display: flex; gap: 0; background: ${B.border}; border-radius: 10px; padding: 3px; margin: 14px 0 6px; }
.seg-btn {
  flex: 1; padding: 8px 0; border-radius: 8px; text-align: center;
  font-size: 13px; font-weight: 700; cursor: pointer;
  border: none; font-family: inherit; transition: all .2s;
  color: ${B.textMuted}; background: transparent;
}
.seg-btn.active { background: ${B.white}; color: ${B.text}; box-shadow: 0 1px 4px rgba(0,0,0,.08); }

/* Cards */
.card {
  background: ${B.white}; border: 1px solid ${B.goldBorder};
  border-radius: ${R.lg}px; padding: 14px; margin-bottom: 12px;
  box-shadow: ${SHADOW}; transition: transform .1s;
}
.card:active { transform: scale(.995); }
.card-title { font-size: 15px; font-weight: 800; color: ${B.text}; }
.card-sub { font-size: 12px; color: ${B.textMuted}; margin-top: 3px; line-height: 1.4; }
.card-link { font-size: 13px; font-weight: 800; color: ${B.gold}; margin-top: 8px; cursor: pointer; }

/* Progress bar */
.pbar-wrap { margin-top: 8px; }
.pbar-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px; }
.pbar-label { font-size: 12px; font-weight: 700; color: ${B.text}; }
.pbar-value { font-size: 12px; font-weight: 700; color: ${B.textMuted}; }
.pbar-track { height: 8px; background: rgba(15,30,46,.06); border-radius: 99px; overflow: hidden; }
.pbar-fill { height: 100%; border-radius: 99px; transition: width .6s cubic-bezier(.4,0,.2,1); }
.pbar-fill.gold { background: linear-gradient(90deg, ${B.gold}, #D4B06A); }
.pbar-fill.orange { background: ${B.orange}; }
.pbar-fill.green { background: ${B.green}; }
.pbar-fill.red { background: ${B.red}; }

/* Macros row */
.macros { display: flex; gap: 8px; margin-top: 10px; }
.macro-pill {
  flex: 1; background: rgba(15,30,46,.03); border-radius: 10px;
  padding: 8px 6px; text-align: center;
}
.macro-letter { font-size: 11px; font-weight: 800; color: ${B.textMuted}; }
.macro-val { font-size: 14px; font-weight: 800; color: ${B.text}; margin-top: 2px; }
.macro-target { font-size: 10px; color: ${B.textFaint}; margin-top: 1px; }

/* Meal slot */
.slot {
  background: ${B.white}; border: 1px solid ${B.hairline};
  border-radius: ${R.lg}px; padding: 12px 14px; margin-bottom: 10px;
}
.slot-header { display: flex; justify-content: space-between; align-items: center; }
.slot-left { display: flex; align-items: center; gap: 8px; }
.slot-icon { font-size: 20px; }
.slot-name { font-size: 14px; font-weight: 700; color: ${B.text}; }
.slot-time { font-size: 11px; color: ${B.textFaint}; }
.slot-add {
  width: 32px; height: 32px; border-radius: 99px;
  background: ${B.goldSoft}; border: 1px solid ${B.goldBorder};
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; color: ${B.gold}; font-weight: 700;
  cursor: pointer; transition: all .15s;
}
.slot-add:hover { background: ${B.goldBorderStrong}; }
.slot-logs { margin-top: 8px; }
.log-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 6px 0; border-top: 1px solid ${B.hairline};
}
.log-name { font-size: 13px; font-weight: 600; color: ${B.text}; }
.log-detail { font-size: 11px; color: ${B.textMuted}; }
.log-kcal { font-size: 12px; font-weight: 700; color: ${B.textMuted}; }
.chip-hp {
  display: inline-block; font-size: 9px; font-weight: 800;
  background: ${B.orangeLight}; color: ${B.orange};
  padding: 2px 7px; border-radius: 99px; margin-left: 6px;
}

/* Week eq cards */
.eq-card {
  background: ${B.white}; border: 1px solid ${B.goldBorder};
  border-radius: ${R.lg}px; padding: 12px 14px; margin-bottom: 10px;
  display: flex; align-items: center; gap: 12px;
  box-shadow: ${SHADOW}; cursor: pointer; transition: transform .1s;
}
.eq-card:active { transform: scale(.995); }
.eq-icon { font-size: 28px; width: 40px; text-align: center; }
.eq-body { flex: 1; }
.eq-name { font-size: 14px; font-weight: 700; color: ${B.text}; }
.eq-progress-text { font-size: 12px; color: ${B.textMuted}; margin-top: 2px; }
.eq-bar { height: 6px; background: rgba(15,30,46,.06); border-radius: 99px; margin-top: 6px; overflow: hidden; }
.eq-bar-fill { height: 100%; border-radius: 99px; transition: width .6s cubic-bezier(.4,0,.2,1); }
.eq-check { font-size: 18px; color: ${B.green}; }
.eq-add-btn {
  width: 30px; height: 30px; border-radius: 99px;
  background: ${B.goldSoft}; border: 1px solid ${B.goldBorder};
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; color: ${B.gold}; cursor: pointer;
}

/* Advice */
.advice-item {
  background: ${B.white}; border: 1px solid ${B.goldBorder};
  border-radius: ${R.lg}px; padding: 14px; margin-bottom: 10px;
  cursor: pointer; box-shadow: ${SHADOW}; transition: transform .1s;
}
.advice-item:active { transform: scale(.995); }
.advice-row { display: flex; justify-content: space-between; align-items: flex-start; }
.advice-title { font-size: 14px; font-weight: 700; color: ${B.text}; flex: 1; }
.advice-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
.badge {
  display: inline-block; font-size: 10px; font-weight: 700;
  padding: 3px 8px; border-radius: 99px;
}
.badge-priority { background: rgba(255,59,48,.1); color: #E5342D; }
.badge-secondary { background: rgba(59,130,246,.1); color: #3B82F6; }
.badge-status { background: rgba(15,30,46,.06); color: ${B.textMuted}; }
.badge-alert { background: ${B.goldSoft}; color: ${B.gold}; }
.badge-unread { background: ${B.gold}; color: ${B.white}; }
.badge-read { background: ${B.greenSoft}; color: ${B.green}; }

/* Tip banner */
.tip-banner {
  background: linear-gradient(135deg, rgba(198,160,91,.08), rgba(198,160,91,.04));
  border: 1px solid ${B.goldBorder}; border-radius: ${R.lg}px;
  padding: 14px; margin-bottom: 14px; position: relative;
}
.tip-icon { font-size: 16px; }
.tip-text { font-size: 13px; color: ${B.text}; line-height: 1.5; margin-top: 4px; }
.tip-close {
  position: absolute; top: 10px; right: 12px;
  font-size: 14px; color: ${B.textMuted}; cursor: pointer;
  background: none; border: none;
}

/* Section label */
.section-label {
  font-size: 13px; font-weight: 800; color: ${B.textMuted};
  text-transform: uppercase; letter-spacing: .5px;
  margin: 16px 0 10px; padding-bottom: 4px;
  border-bottom: 1px solid ${B.hairline};
}

/* Bilan card */
.bilan-row {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 0; border-bottom: 1px solid ${B.hairline};
}
.bilan-score {
  width: 48px; height: 48px; border-radius: 99px;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 800;
}
.bilan-info { flex: 1; }
.bilan-week { font-size: 14px; font-weight: 700; color: ${B.text}; }
.bilan-dates { font-size: 12px; color: ${B.textMuted}; }
.bilan-label { font-size: 12px; font-weight: 700; }

/* Profile */
.profile-card {
  background: linear-gradient(135deg, ${B.navy} 0%, #1A2E40 100%);
  border-radius: ${R.lg}px; padding: 18px; color: #fff; margin-bottom: 14px;
}
.profile-name { font-size: 20px; font-weight: 800; color: #fff; }
.profile-meta { font-size: 13px; color: rgba(255,255,255,.7); margin-top: 4px; }
.profile-gold { color: ${B.gold}; }

.kpi-row { display: flex; gap: 8px; margin-top: 12px; }
.kpi-box {
  flex: 1; background: rgba(255,255,255,.1); border-radius: 12px;
  padding: 10px; text-align: center;
}
.kpi-label { font-size: 10px; font-weight: 700; color: rgba(255,255,255,.6); text-transform: uppercase; }
.kpi-val { font-size: 18px; font-weight: 800; color: #fff; margin-top: 4px; }
.kpi-delta { font-size: 11px; color: ${B.gold}; margin-top: 2px; }

.menu-item {
  display: flex; align-items: center; gap: 12px;
  padding: 14px; background: ${B.white}; border-radius: ${R.md}px;
  margin-bottom: 8px; cursor: pointer; border: 1px solid ${B.hairline};
  transition: all .15s;
}
.menu-item:hover { border-color: ${B.goldBorder}; }
.menu-icon { font-size: 20px; width: 32px; text-align: center; }
.menu-label { font-size: 14px; font-weight: 600; color: ${B.text}; flex: 1; }
.menu-arrow { font-size: 14px; color: ${B.textMuted}; }

/* Alerts */
.alert-card {
  border-radius: ${R.lg}px; padding: 14px; margin-bottom: 10px;
  display: flex; gap: 10px; align-items: flex-start;
}
.alert-soft { background: ${B.goldSoft}; border: 1px solid ${B.goldBorder}; }
.alert-warn { background: ${B.orangeLight}; border: 1px solid rgba(232,134,58,.25); }
.alert-icon { font-size: 20px; margin-top: 1px; }
.alert-body { flex: 1; }
.alert-title { font-size: 13px; font-weight: 700; color: ${B.text}; }
.alert-msg { font-size: 12px; color: ${B.textMuted}; margin-top: 3px; line-height: 1.4; }
.alert-link { font-size: 12px; font-weight: 700; color: ${B.gold}; margin-top: 6px; cursor: pointer; }

/* Empty state */
.empty { text-align: center; padding: 40px 20px; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-title { font-size: 16px; font-weight: 700; color: ${B.text}; }
.empty-sub { font-size: 13px; color: ${B.textMuted}; margin-top: 6px; line-height: 1.5; }
.empty-cta {
  margin-top: 16px; display: inline-block; padding: 10px 24px;
  background: ${B.gold}; color: #fff; font-weight: 700; font-size: 14px;
  border-radius: 99px; cursor: pointer;
}

/* Daily recap hint */
.day-hint {
  font-size: 11px; color: ${B.textFaint}; text-align: center;
  font-style: italic; margin: 4px 0 10px;
}

/* Search */
.search {
  width: 100%; padding: 10px 14px; border-radius: 12px;
  border: 1px solid ${B.hairline}; background: rgba(15,30,46,.03);
  font-size: 14px; color: ${B.text}; font-family: inherit;
  margin-bottom: 12px; outline: none; transition: border .2s;
}
.search:focus { border-color: ${B.goldBorderStrong}; }
.search::placeholder { color: ${B.textFaint}; }

/* Small utility */
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.mt8 { margin-top: 8px; }
.mt12 { margin-top: 12px; }
.mb12 { margin-bottom: 12px; }
.text-gold { color: ${B.gold}; }
.fw800 { font-weight: 800; }
`;

/* ─────────────────────────── HELPER COMPONENTS ─────────────────────────── */
function ProgressBar({ value, max, color = "gold", height = 8 }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 150) : 0;
  const barColor = pct > 120 ? "orange" : pct >= 100 ? "green" : color;
  return (
    <div className="pbar-track" style={{ height }}>
      <div className={`pbar-fill ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

function MacroPill({ letter, value, target }) {
  return (
    <div className="macro-pill">
      <div className="macro-letter">{letter}</div>
      <div className="macro-val">{Math.round(value)}</div>
      <div className="macro-target">/ {Math.round(target)}</div>
    </div>
  );
}

/* ─────────────────────────── TAB: PLAN ─────────────────────────── */
function PlanTab() {
  const [view, setView] = useState("day");
  const todayLogs = LOGS;
  const dayNut = useMemo(() => {
    const n = { kcal: 0, p: 0, l: 0, g: 0 };
    todayLogs.forEach(l => { n.kcal += l.kcal; n.p += l.p; n.l += l.l; n.g += l.g; });
    return n;
  }, []);

  return (
    <div className="page">
      <div className="flex-between">
        <div className="page-title">Plan</div>
        <div className="page-meta">Semaine 8 · Jour 52</div>
      </div>

      <div className="seg">
        <button className={`seg-btn ${view === "day" ? "active" : ""}`} onClick={() => setView("day")}>Jour</button>
        <button className={`seg-btn ${view === "week" ? "active" : ""}`} onClick={() => setView("week")}>Semaine</button>
      </div>

      {view === "day" ? (
        <>
          {/* Bilan du jour */}
          <div className="card">
            <div className="flex-between">
              <span className="card-title">Bilan du jour</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: B.text }}>{Math.round(dayNut.kcal)}<span style={{ fontSize: 13, color: B.textMuted }}> / {DAY_TARGETS.kcal} kcal</span></span>
            </div>
            <ProgressBar value={dayNut.kcal} max={DAY_TARGETS.kcal} />
            <div className="macros">
              <MacroPill letter="P" value={dayNut.p} target={DAY_TARGETS.p} />
              <MacroPill letter="L" value={dayNut.l} target={DAY_TARGETS.l} />
              <MacroPill letter="G" value={dayNut.g} target={DAY_TARGETS.g} />
            </div>
            <div className="day-hint">Repère indicatif — l'équilibre se fait surtout sur la semaine.</div>
          </div>

          {/* Slots */}
          {SLOTS.map(slot => {
            const slotLogs = todayLogs.filter(l => l.slotId === slot.id);
            const slotKcal = slotLogs.reduce((s, l) => s + l.kcal, 0);
            return (
              <div className="slot" key={slot.id}>
                <div className="slot-header">
                  <div className="slot-left">
                    <span className="slot-icon">{slot.icon}</span>
                    <div>
                      <div className="slot-name">{slot.label}</div>
                      <div className="slot-time">{slot.time}{slotLogs.length > 0 && ` · ${Math.round(slotKcal)} kcal`}</div>
                    </div>
                  </div>
                  <button className="slot-add">+</button>
                </div>
                {slotLogs.length > 0 && (
                  <div className="slot-logs">
                    {slotLogs.map(l => (
                      <div className="log-item" key={l.id}>
                        <div>
                          <span className="log-name">{l.eqLabel}</span>
                          {l.hp && <span className="chip-hp">Hors plan</span>}
                          <div className="log-detail">{l.qty} portion · P{l.p} L{l.l} G{l.g}</div>
                        </div>
                        <span className="log-kcal">{l.kcal} kcal</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </>
      ) : (
        <WeekView />
      )}
    </div>
  );
}

function WeekView() {
  const [search, setSearch] = useState("");
  const weekNut = { kcal: 9520, p: 595, l: 285, g: 920 };

  const filtered = EQUIVALENCES.filter(eq =>
    eq.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Alerts */}
      <div className="alert-card alert-soft">
        <span className="alert-icon">⚡</span>
        <div className="alert-body">
          <div className="alert-title">Fruits en retard cette semaine</div>
          <div className="alert-msg">Il te reste surtout les fruits à placer. Ajoute 1–2 options simples par jour.</div>
          <div className="alert-link">En savoir plus →</div>
        </div>
      </div>

      {/* Bilan hebdo */}
      <div className="card">
        <div className="flex-between">
          <span className="card-title">Bilan semaine</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: B.textMuted }}>4 jours restants</span>
        </div>
        <div className="flex-between mt8">
          <span style={{ fontSize: 22, fontWeight: 800, color: B.text }}>{weekNut.kcal.toLocaleString()}</span>
          <span style={{ fontSize: 13, color: B.textMuted }}>/ {WEEK_TARGETS.kcal.toLocaleString()} kcal</span>
        </div>
        <ProgressBar value={weekNut.kcal} max={WEEK_TARGETS.kcal} />
        <div className="macros">
          <MacroPill letter="P" value={weekNut.p} target={WEEK_TARGETS.p} />
          <MacroPill letter="L" value={weekNut.l} target={WEEK_TARGETS.l} />
          <MacroPill letter="G" value={weekNut.g} target={WEEK_TARGETS.g} />
        </div>
      </div>

      <input className="search" placeholder="Rechercher une équivalence…" value={search} onChange={e => setSearch(e.target.value)} />

      {filtered.map(eq => {
        const pct = eq.target > 0 ? (eq.consumed / eq.target) * 100 : 0;
        const done = pct >= 100;
        const over = pct > 130;
        const barColor = done ? (over ? B.orange : B.green) : B.gold;
        return (
          <div className="eq-card" key={eq.eqId}>
            <div className="eq-icon">{eq.icon}</div>
            <div className="eq-body">
              <div className="eq-name">{eq.label}</div>
              <div className="eq-progress-text">
                {eq.consumed} / {eq.target} cette semaine
                {done && !over && " ✓"}
                {over && " — au-dessus"}
              </div>
              <div className="eq-bar">
                <div className="eq-bar-fill" style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
              </div>
            </div>
            {done ? (
              <span className="eq-check">✓</span>
            ) : (
              <button className="eq-add-btn">+</button>
            )}
          </div>
        );
      })}
    </>
  );
}

/* ─────────────────────────── TAB: CONSEILS ─────────────────────────── */
function AdviceTab() {
  const [view, setView] = useState("focus");
  const [tipVisible, setTipVisible] = useState(true);

  const prioritaires = ADVICES_FOCUS.filter(a => a.axis === "priority");
  const secondaires = ADVICES_FOCUS.filter(a => a.axis === "secondary");

  return (
    <div className="page">
      <div className="page-title">Conseils</div>
      <div className="page-meta">Semaine 8</div>

      <div className="seg">
        <button className={`seg-btn ${view === "focus" ? "active" : ""}`} onClick={() => setView("focus")}>Focus</button>
        <button className={`seg-btn ${view === "biblio" ? "active" : ""}`} onClick={() => setView("biblio")}>Bibliothèque</button>
      </div>

      {tipVisible && (
        <div className="tip-banner">
          <button className="tip-close" onClick={() => setTipVisible(false)}>✕</button>
          <span className="tip-icon">💡</span>
          <div className="tip-text">{MICRO_TIPS[0]}</div>
        </div>
      )}

      {view === "focus" ? (
        <>
          <div className="section-label">Axes prioritaires</div>
          {prioritaires.map(a => <AdviceItem key={a.id} advice={a} />)}
          <div className="section-label">Axes secondaires</div>
          {secondaires.map(a => <AdviceItem key={a.id} advice={a} />)}

          <div className="card" style={{ textAlign: "center", marginTop: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: B.text }}>Évaluer ma semaine →</div>
            <div style={{ fontSize: 12, color: B.textMuted, marginTop: 4 }}>Disponible dimanche</div>
          </div>
        </>
      ) : (
        <>
          <input className="search" placeholder="Rechercher un conseil…" />
          <div className="section-label">À renforcer</div>
          {ADVICES_FOCUS.filter(a => a.status === "À renforcer").map(a => <AdviceItem key={a.id} advice={a} />)}
          <div className="section-label">En progrès</div>
          {ADVICES_FOCUS.filter(a => a.status === "En progrès").map(a => <AdviceItem key={a.id} advice={a} />)}
          <div className="section-label">Solide</div>
          {ADVICES_FOCUS.filter(a => a.status === "Solide").map(a => <AdviceItem key={a.id} advice={a} />)}
          <div className="section-label">Nouveau</div>
          {ADVICES_FOCUS.filter(a => a.status === "Nouveau").map(a => <AdviceItem key={a.id} advice={a} />)}

          <div className="section-label">💡 Astuces Élevia</div>
          {MICRO_TIPS.map((tip, i) => (
            <div key={i} className="tip-banner" style={{ marginBottom: 8 }}>
              <span className="tip-icon">💡</span>
              <div className="tip-text">{tip}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function AdviceItem({ advice }) {
  return (
    <div className="advice-item">
      <div className="advice-row">
        <div className="advice-title">
          {advice.axis === "priority" ? "🔴" : "🔵"} {advice.title}
        </div>
      </div>
      <div className="advice-badges">
        <span className={`badge ${advice.axis === "priority" ? "badge-priority" : "badge-secondary"}`}>
          {advice.axis === "priority" ? "Prioritaire" : "Secondaire"}
        </span>
        <span className="badge badge-status">{advice.status}</span>
        {advice.alert && <span className="badge badge-alert">⚡ Alerte active</span>}
        {!advice.read ? <span className="badge badge-unread">Non lu</span> : <span className="badge badge-read">Lu ✓</span>}
      </div>
    </div>
  );
}

/* ─────────────────────────── TAB: HISTORIQUE ─────────────────────────── */
function HistoryTab() {
  return (
    <div className="page">
      <div className="page-title">Historique</div>
      <div className="page-meta">Bilans & ajouts récents</div>

      {/* Bilan semaine précédente */}
      <div className="card mt12">
        <div className="flex-between">
          <span className="card-title">Bilan S7 (10–16 fév)</span>
          <div style={{
            width: 48, height: 48, borderRadius: 99,
            background: B.goldSoft, border: `2px solid ${B.gold}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 16, color: B.gold,
          }}>72</div>
        </div>
        <div style={{ fontSize: 13, color: B.text, marginTop: 8, lineHeight: 1.5 }}>
          <strong>Solide ✅</strong> — Bonne constance sur légumes et protéines.
        </div>
        <div style={{ fontSize: 12, color: B.textMuted, marginTop: 4 }}>
          À ajuster : Fruits en retard, lipides un peu hauts.
        </div>
        <div className="card-link">Voir le rapport complet →</div>
      </div>

      {/* Historique bilans */}
      <div className="section-label">Historique des bilans</div>
      <div className="card">
        {BILANS.map((b, i) => {
          const scoreColor = b.score >= 85 ? B.green : b.score >= 70 ? B.gold : b.score >= 55 ? B.textMuted : B.orange;
          return (
            <div className="bilan-row" key={i} style={i === BILANS.length - 1 ? { borderBottom: "none" } : {}}>
              <div className="bilan-score" style={{ background: `${scoreColor}18`, color: scoreColor }}>{b.score}</div>
              <div className="bilan-info">
                <div className="bilan-week">{b.week} · {b.dates}</div>
                <div className="bilan-label" style={{ color: scoreColor }}>{b.label}</div>
              </div>
              <span style={{ fontSize: 14, color: B.textMuted }}>›</span>
            </div>
          );
        })}
      </div>

      {/* Ajouts récents */}
      <div className="section-label">Ajouts récents</div>
      <div className="flex-between mb12">
        <button style={{
          flex: 1, marginRight: 6, padding: "10px 0", borderRadius: R.md,
          border: `1px solid ${B.goldBorder}`, background: B.white,
          fontSize: 12, fontWeight: 800, color: B.text, cursor: "pointer", fontFamily: "inherit",
        }}>Annuler dernier</button>
        <button style={{
          flex: 1, marginLeft: 6, padding: "10px 0", borderRadius: R.md,
          border: `1px solid ${B.goldBorder}`, background: B.goldSoft,
          fontSize: 12, fontWeight: 800, color: B.text, cursor: "pointer", fontFamily: "inherit",
        }}>Tout effacer</button>
      </div>

      {LOGS.slice().reverse().map(l => (
        <div className="card" key={l.id} style={{ padding: 12 }}>
          <div className="flex-between">
            <span style={{ fontSize: 13, fontWeight: 700, color: B.text }}>
              {l.eqLabel}{l.hp && <span className="chip-hp">Hors plan</span>}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: B.textMuted }}>{l.kcal} kcal</span>
          </div>
          <div style={{ fontSize: 11, color: B.textMuted, marginTop: 3 }}>
            {SLOTS.find(s => s.id === l.slotId)?.label} · {l.qty} portion · {l.time}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────── TAB: PROFIL ─────────────────────────── */
function ProfileTab() {
  return (
    <div className="page">
      <div className="profile-card">
        <div className="profile-name">👤 Marie Dupont</div>
        <div className="profile-meta">
          Programme : <span className="profile-gold">Perte de poids</span> · Taille : 168 cm
        </div>
        <div className="profile-meta">Depuis : 12 jan. 2026 · Semaine 8</div>
        <div className="kpi-row">
          <div className="kpi-box">
            <div className="kpi-label">Poids</div>
            <div className="kpi-val">68.2</div>
            <div className="kpi-delta">-2.8 kg</div>
          </div>
          <div className="kpi-box">
            <div className="kpi-label">Tour de taille</div>
            <div className="kpi-val">79.5</div>
            <div className="kpi-delta">-3.5 cm</div>
          </div>
          <div className="kpi-box">
            <div className="kpi-label">% MG</div>
            <div className="kpi-val">26.1</div>
            <div className="kpi-delta">-1.2%</div>
          </div>
        </div>
      </div>

      <div className="menu-item">
        <span className="menu-icon">📋</span>
        <span className="menu-label">Pourquoi ce plan est le tien</span>
        <span className="menu-arrow">›</span>
      </div>

      <div className="section-label">Outils</div>

      <div className="menu-item">
        <span className="menu-icon">📊</span>
        <span className="menu-label">Suivi mesures & graphiques</span>
        <span className="menu-arrow">›</span>
      </div>
      <div className="menu-item">
        <span className="menu-icon">🍽️</span>
        <span className="menu-label">Recettes du mois</span>
        <span className="menu-arrow">›</span>
      </div>
      <div className="menu-item">
        <span className="menu-icon">💬</span>
        <span className="menu-label">Contacter ton diététicien</span>
        <span className="menu-arrow">›</span>
      </div>

      <div className="section-label">Apprendre</div>

      <div className="menu-item">
        <span className="menu-icon">🎬</span>
        <span className="menu-label">Guides vidéo</span>
        <span className="menu-arrow">›</span>
      </div>
      <div className="menu-item">
        <span className="menu-icon">📏</span>
        <span className="menu-label">Guides de mesure</span>
        <span className="menu-arrow">›</span>
      </div>

      <div className="section-label">Réglages</div>

      <div className="menu-item">
        <span className="menu-icon">📥</span>
        <span className="menu-label">Importer / mettre à jour mon plan</span>
        <span className="menu-arrow">›</span>
      </div>
      <div className="menu-item">
        <span className="menu-icon">⚙️</span>
        <span className="menu-label">Paramètres</span>
        <span className="menu-arrow">›</span>
      </div>

      <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: B.textFaint }}>
        Élevia v1.1.0 (build 42)
      </div>
    </div>
  );
}

/* ─────────────────────────── MAIN APP ─────────────────────────── */
export default function EleviaApp() {
  const [tab, setTab] = useState("plan");

  const tabs = [
    { id: "plan", label: "Plan", icon: "📅" },
    { id: "advice", label: "Conseils", icon: "💡" },
    { id: "history", label: "Historique", icon: "📊" },
    { id: "profile", label: "Profil", icon: "👤" },
  ];

  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px", background: `linear-gradient(180deg, #0A1620 0%, ${B.navy} 50%, #0A1620 100%)` }}>
        <div className="phone">
          <div className="notch" />

          {/* Status bar */}
          <div className="status-bar">
            <span className="status-time">9:41</span>
            <div className="status-icons">
              <span>●●●●○</span>
              <span>WiFi</span>
              <span>🔋</span>
            </div>
          </div>

          {/* Header */}
          <div className="header">
            <div className="header-logo">ÉLEVIA</div>
          </div>

          {/* Content */}
          <div className="content">
            {tab === "plan" && <PlanTab />}
            {tab === "advice" && <AdviceTab />}
            {tab === "history" && <HistoryTab />}
            {tab === "profile" && <ProfileTab />}
          </div>

          {/* Tab bar */}
          <div className="tab-bar">
            {tabs.map(t => (
              <button
                key={t.id}
                className={`tab-item ${tab === t.id ? "active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                <span className="tab-icon">{t.icon}</span>
                <span className="tab-label">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
