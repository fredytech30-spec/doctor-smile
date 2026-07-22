// ════════════════════════════════════════════════════════════════
//  ds-onboarding.js — Doctor Smile™  v1
//  Onboarding guidé interactif — premier login
//
//  Architecture :
//    Phase 0  — Écran d'accueil cinématique (splash plein écran)
//    Phase 1  — Tour guidé 8 étapes avec highlight + tooltip
//    Firestore — users/{uid}.onboardingDone = true quand terminé
//
//  Déclenchement :
//    window.DS_ONBOARDING.checkAndStart(uid)
//    Appelé dans dashboard.js après requireAuth()
//
//  Dépendances : Firebase db (import), window.S.profile, window.DS
// ════════════════════════════════════════════════════════════════

import { db } from './firebase-config.js';
import { doc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ── CSS injecté une seule fois ──────────────────────────────────
function _injectCSS() {
  if (document.getElementById('_onb_css')) return;
  const s = document.createElement('style');
  s.id = '_onb_css';
  s.textContent = `

/* ── Splash plein écran ──────────────────────────────────────── */
#_onb_splash {
  position: fixed; inset: 0; z-index: 19000;
  background: #02040B;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  overflow: hidden;
}
#_onb_splash .sp-bg {
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(ellipse 60% 50% at 20% 30%, rgba(139,127,240,.07) 0%, transparent 70%),
    radial-gradient(ellipse 45% 40% at 80% 70%, rgba(255,215,0,.06) 0%, transparent 65%);
  animation: _onbBgPulse 5s ease-in-out infinite alternate;
}
@keyframes _onbBgPulse {
  from { opacity:.7; } to { opacity:1; }
}
#_onb_splash .sp-grid {
  position: absolute; inset: 0; pointer-events: none;
  background-image:
    linear-gradient(rgba(139,127,240,.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(139,127,240,.04) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 0%, transparent 70%);
}
#_onb_splash .sp-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  animation: _onbFloat linear infinite;
}
@keyframes _onbFloat {
  0%   { transform: translate(0,0) scale(1); }
  33%  { transform: translate(30px,-20px) scale(1.05); }
  66%  { transform: translate(-15px,25px) scale(.97); }
  100% { transform: translate(0,0) scale(1); }
}
#_onb_splash .sp-logo {
  position: relative; z-index: 2;
  width: 80px; height: 80px; border-radius: 22px;
  background: linear-gradient(135deg, #FFD700, #8B7FF0);
  display: flex; align-items: center; justify-content: center;
  font-size: 36px;
  box-shadow: 0 0 0 0 rgba(255,215,0,.4);
  animation: _onbLogoPulse 2.4s ease-in-out infinite;
  margin-bottom: 28px;
}
@keyframes _onbLogoPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255,215,0,.35), 0 0 40px rgba(255,215,0,.12); }
  50%       { box-shadow: 0 0 0 18px rgba(255,215,0,0), 0 0 60px rgba(255,215,0,.2); }
}
#_onb_splash .sp-title {
  font-family: 'Syne', sans-serif; font-size: clamp(32px,4vw,52px);
  font-weight: 900; color: #fff; letter-spacing: -.03em;
  text-align: center; line-height: 1.1; margin-bottom: 12px;
  position: relative; z-index: 2;
}
#_onb_splash .sp-title span {
  background: linear-gradient(135deg, #FFD700, #8B7FF0);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
#_onb_splash .sp-sub {
  font-family: 'Instrument Sans', sans-serif; font-size: 15px;
  color: rgba(255,255,255,.45); text-align: center;
  max-width: 420px; line-height: 1.65; margin-bottom: 48px;
  position: relative; z-index: 2;
  animation: _onbFadeUp .7s .3s both;
}
@keyframes _onbFadeUp {
  from { opacity:0; transform:translateY(14px); }
  to   { opacity:1; transform:translateY(0); }
}
#_onb_splash .sp-chips {
  display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;
  margin-bottom: 48px; position: relative; z-index: 2;
  animation: _onbFadeUp .7s .5s both;
}
#_onb_splash .sp-chip {
  padding: 6px 14px; border-radius: 100px;
  background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1);
  font-family: 'Syne', sans-serif; font-size: 9px; font-weight: 800;
  letter-spacing: .1em; text-transform: uppercase; color: rgba(255,255,255,.5);
  display: flex; align-items: center; gap: 6px;
}
#_onb_splash .sp-chip i { font-size: 10px; color: #8B7FF0; }
#_onb_splash .sp-cta {
  position: relative; z-index: 2;
  animation: _onbFadeUp .7s .7s both;
}
#_onb_splash .sp-btn-start {
  padding: 15px 40px; border-radius: 14px;
  background: linear-gradient(135deg, #FFD700, #FFC107);
  border: none; cursor: pointer;
  font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 900;
  letter-spacing: .08em; text-transform: uppercase; color: #02040B;
  box-shadow: 0 0 0 0 rgba(255,215,0,.4);
  transition: transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .2s;
  display: flex; align-items: center; gap: 10px;
}
#_onb_splash .sp-btn-start:hover {
  transform: translateY(-3px) scale(1.03);
  box-shadow: 0 8px 30px rgba(255,215,0,.35);
}
#_onb_splash .sp-skip {
  margin-top: 16px; font-family: 'Syne', sans-serif;
  font-size: 9px; color: rgba(255,255,255,.22); cursor: pointer;
  letter-spacing: .08em; text-transform: uppercase;
  transition: color .18s; text-align: center;
}
#_onb_splash .sp-skip:hover { color: rgba(255,255,255,.5); }
#_onb_splash .sp-progress {
  position: absolute; bottom: 0; left: 0; right: 0;
  height: 2px; background: rgba(255,255,255,.05);
  overflow: hidden;
}
#_onb_splash .sp-progress-bar {
  height: 100%; width: 0;
  background: linear-gradient(90deg, #FFD700, #8B7FF0);
  transition: width 4s linear;
}
#_onb_splash .sp-stats {
  display: flex; gap: 32px; margin-bottom: 44px;
  position: relative; z-index: 2;
  animation: _onbFadeUp .7s .6s both;
}
#_onb_splash .sp-stat {
  text-align: center;
}
#_onb_splash .sp-stat-val {
  font-family: 'Syne', sans-serif; font-size: 28px; font-weight: 900;
  background: linear-gradient(135deg, #FFD700, #8B7FF0);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text; line-height: 1;
}
#_onb_splash .sp-stat-lbl {
  font-size: 8.5px; color: rgba(255,255,255,.3); letter-spacing: .1em;
  text-transform: uppercase; margin-top: 4px;
}

/* ── Tour guidé ──────────────────────────────────────────────── */
#_onb_overlay {
  position: fixed; inset: 0; z-index: 18000;
  pointer-events: none;
}
#_onb_cutout {
  position: fixed; inset: 0; z-index: 18001;
  pointer-events: none;
  background: rgba(2,4,11,.82);
  backdrop-filter: blur(2px);
  transition: clip-path .45s cubic-bezier(.4,0,.2,1);
}
#_onb_hl_ring {
  position: fixed; z-index: 18002; pointer-events: none;
  border: 2px solid #8B7FF0;
  border-radius: 14px;
  box-shadow: 0 0 0 4000px rgba(2,4,11,.75), 0 0 32px rgba(139,127,240,.45);
  transition: all .42s cubic-bezier(.4,0,.2,1);
  animation: _onbRingPulse 2s ease-in-out infinite;
}
@keyframes _onbRingPulse {
  0%, 100% { box-shadow: 0 0 0 4000px rgba(2,4,11,.75), 0 0 24px rgba(139,127,240,.35); }
  50%       { box-shadow: 0 0 0 4000px rgba(2,4,11,.75), 0 0 40px rgba(139,127,240,.65); }
}
#_onb_hl_ring.gold {
  border-color: #FFD700;
  animation: _onbRingPulseGold 2s ease-in-out infinite;
}
@keyframes _onbRingPulseGold {
  0%, 100% { box-shadow: 0 0 0 4000px rgba(2,4,11,.75), 0 0 24px rgba(255,215,0,.3); }
  50%       { box-shadow: 0 0 0 4000px rgba(2,4,11,.75), 0 0 40px rgba(255,215,0,.55); }
}
#_onb_bubble {
  position: fixed; z-index: 18003;
  width: min(340px, 90vw);
  background: rgba(6,10,20,.98);
  border: 1px solid rgba(139,127,240,.2);
  border-radius: 18px; padding: 24px 22px 18px;
  box-shadow: 0 32px 80px rgba(0,0,0,.75), 0 0 60px rgba(139,127,240,.07);
  animation: _onbBubbleIn .35s cubic-bezier(.34,1.56,.64,1);
  transition: top .42s cubic-bezier(.4,0,.2,1), left .42s cubic-bezier(.4,0,.2,1);
}
@keyframes _onbBubbleIn {
  from { opacity:0; transform: scale(.88) translateY(12px); }
  to   { opacity:1; transform: scale(1) translateY(0); }
}
#_onb_bubble .onb-step-icon {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; margin-bottom: 14px; flex-shrink: 0;
}
#_onb_bubble .onb-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px; border-radius: 100px;
  font-family: 'Syne', sans-serif; font-size: 8px; font-weight: 800;
  letter-spacing: .12em; text-transform: uppercase;
  margin-bottom: 10px;
}
#_onb_bubble .onb-title {
  font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 900;
  color: #fff; margin-bottom: 8px; line-height: 1.25;
}
#_onb_bubble .onb-body {
  font-family: 'Instrument Sans', sans-serif;
  font-size: 11px; color: rgba(255,255,255,.55); line-height: 1.7;
  margin-bottom: 18px;
}
#_onb_bubble .onb-tip {
  padding: 10px 12px; border-radius: 9px; margin-bottom: 16px;
  background: rgba(139,127,240,.06); border: 1px solid rgba(139,127,240,.14);
  font-size: 10px; color: rgba(139,127,240,.8); line-height: 1.55;
  display: flex; align-items: flex-start; gap: 8px;
}
#_onb_bubble .onb-tip i { font-size: 10px; flex-shrink: 0; margin-top: 1px; }
#_onb_bubble .onb-progress {
  display: flex; gap: 4px; margin-bottom: 16px; align-items: center;
}
#_onb_bubble .onb-dot {
  height: 4px; border-radius: 2px;
  background: rgba(255,255,255,.12);
  transition: all .35s cubic-bezier(.34,1.56,.64,1);
  cursor: pointer;
}
#_onb_bubble .onb-dot.done { background: rgba(16,185,129,.55); }
#_onb_bubble .onb-dot.active { background: #8B7FF0; }
#_onb_bubble .onb-dot.active { width: 24px !important; }
#_onb_bubble .onb-nav {
  display: flex; align-items: center; justify-content: space-between;
}
#_onb_bubble .onb-counter {
  font-family: 'JetBrains Mono', monospace; font-size: 9px;
  color: rgba(255,255,255,.2); letter-spacing: .06em;
}
#_onb_bubble .onb-btns {
  display: flex; gap: 7px;
}
.onb-btn-prev {
  padding: 8px 14px; border-radius: 9px;
  background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1);
  font-family: 'Syne', sans-serif; font-size: 9px; font-weight: 800;
  letter-spacing: .07em; color: rgba(255,255,255,.45); cursor: pointer;
  transition: all .18s;
}
.onb-btn-prev:hover { background: rgba(255,255,255,.1); color: #fff; }
.onb-btn-skip {
  padding: 8px 12px; border-radius: 9px; border: none;
  background: transparent;
  font-family: 'Syne', sans-serif; font-size: 9px; font-weight: 700;
  color: rgba(255,255,255,.2); cursor: pointer; transition: color .18s;
}
.onb-btn-skip:hover { color: rgba(255,255,255,.5); }
.onb-btn-next {
  padding: 8px 18px; border-radius: 9px; border: none; cursor: pointer;
  font-family: 'Syne', sans-serif; font-size: 9px; font-weight: 900;
  letter-spacing: .09em; text-transform: uppercase;
  background: linear-gradient(135deg, #8B7FF0, #6C5CE7);
  color: #fff;
  box-shadow: 0 0 16px rgba(139,127,240,.28);
  transition: all .2s cubic-bezier(.34,1.56,.64,1);
  display: flex; align-items: center; gap: 6px;
}
.onb-btn-next:hover { transform: translateY(-2px); box-shadow: 0 4px 22px rgba(139,127,240,.4); }
.onb-btn-next.final {
  background: linear-gradient(135deg, #FFD700, #FFC107);
  color: #02040B;
  box-shadow: 0 0 16px rgba(255,215,0,.28);
}
.onb-btn-next.final:hover { box-shadow: 0 4px 22px rgba(255,215,0,.45); }

/* ── Arrow pointer ───────────────────────────────────────────── */
#_onb_arrow {
  position: fixed; z-index: 18003;
  width: 0; height: 0;
  pointer-events: none;
  transition: all .42s cubic-bezier(.4,0,.2,1);
}

/* ── Mini badge flottant ─────────────────────────────────────── */
#_onb_badge {
  position: fixed; z-index: 18004;
  padding: 5px 12px; border-radius: 100px;
  background: rgba(139,127,240,.1); border: 1px solid rgba(139,127,240,.25);
  font-family: 'Syne', sans-serif; font-size: 9px; font-weight: 800;
  color: #8B7FF0; letter-spacing: .1em; text-transform: uppercase;
  pointer-events: none;
  display: flex; align-items: center; gap: 5px;
  animation: _onbBadgeBounce 1.2s ease-in-out infinite;
}
@keyframes _onbBadgeBounce {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-5px); }
}

/* ── Confetti final ──────────────────────────────────────────── */
.onb-confetti {
  position: fixed; top: -10px;
  width: 8px; height: 8px; border-radius: 2px;
  z-index: 19500; pointer-events: none;
  animation: _onbConfettiFall linear forwards;
}
@keyframes _onbConfettiFall {
  0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
  80%  { opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}

/* ── Transition splash → tour ────────────────────────────────── */
#_onb_splash.sp-exit {
  animation: _onbSplashExit .6s cubic-bezier(.4,0,.2,1) forwards;
}
@keyframes _onbSplashExit {
  from { opacity:1; transform:scale(1); }
  to   { opacity:0; transform:scale(1.04); pointer-events:none; }
}
`;
  document.head.appendChild(s);
}

// ── Définition des 8 étapes ─────────────────────────────────────
const STEPS = [
  {
    id:     'upload',
    target: '#upload-zone',
    nav:    null,
    icon:   '📊',
    iconBg: 'rgba(139,127,240,.1)',
    pill:   { label: 'ÉTAPE 1 · DÉMARRAGE', col: '#8B7FF0', bg: 'rgba(139,127,240,.1)' },
    title:  'Importez votre Balance Générale',
    body:   'Glissez-déposez votre Balance Générale (OHADA/SYSCOHADA) en Excel, CSV ou PDF. Doctor Smile extrait automatiquement vos comptes et réalise l’analyse financière.',
    tip:    '💡 Votre Balance Générale est le document essentiel : elle contient tous les comptes nécessaires pour évaluer la santé de votre entreprise.',
    pos:    'right',
    accentCol: '#8B7FF0',
    ringClass: '',
  },
  {
    id:     'score',
    target: '#score-sec',
    nav:    'dashboard',
    icon:   '🎯',
    iconBg: 'rgba(255,215,0,.12)',
    pill:   { label: 'ÉTAPE 2 · SCORE', col: '#FFD700', bg: 'rgba(255,215,0,.1)' },
    title:  'Le Doctor Score™ — votre santé financière',
    body:   'Un score de 0 à 100, calculé par notre moteur SYSCOHADA. Vert = zone saine, Rouge = zone critique. Comme un bilan de santé pour votre entreprise.',
    tip:    '🎯 Le score synthétise liquidité, rentabilité, solvabilité, activité et structure en un seul chiffre compréhensible même sans être analyste.',
    pos:    'bottom',
    accentCol: '#FFD700',
    ringClass: 'gold',
  },
  {
    id:     'ratios',
    target: '#ratios-sec',
    nav:    'dashboard',
    icon:   '📊',
    iconBg: 'rgba(16,185,129,.1)',
    pill:   { label: 'ÉTAPE 3 · RATIOS', col: '#10b981', bg: 'rgba(16,185,129,.08)' },
    title:  'Ratios financiers clés expliqués',
    body:   'Chaque ratio est présenté avec sa valeur, son benchmark sectoriel et son statut (bon, vigilance, critique). Cliquez sur un ratio pour obtenir une explication IA.',
    tip:    '📖 Même sans formation en finance, chaque indicateur est accompagné d\'une interprétation en langage naturel via notre assistant.',
    pos:    'top',
    accentCol: '#10b981',
    ringClass: '',
  },
  {
    id:     'chat',
    target: '[data-view="chat"]',
    nav:    null,
    iconBg: 'rgba(139,127,240,.12)',
    pill:   { label: 'ÉTAPE 4 · IA', col: '#8B7FF0', bg: 'rgba(139,127,240,.1)' },
    title:  'Votre analyste IA — disponible 24h/24',
    body:   'Posez n\'importe quelle question sur votre analyse en français naturel. "Pourquoi mon score est-il faible ?" · "Comment améliorer ma trésorerie ?" · "Quels risques me guettent ?"',
    tip:    '💬 L\'IA connaît toute votre analyse. Elle répond avec le contexte exact de votre entreprise, pas des généralités.',
    pos:    'right',
    accentCol: '#8B7FF0',
    ringClass: '',
  },
  {
    id:     'call',
    target: '#tts-call',
    nav:    'chat',
    icon:   '📞',
    iconBg: 'rgba(16,185,129,.1)',
    pill:   { label: 'ÉTAPE 5 · APPEL', col: '#10b981', bg: 'rgba(16,185,129,.08)' },
    title:  'Appel vocal IA — parlez directement',
    body:   'Activez le mode appel et parlez à voix haute. Doctor Smile vous répond oralement en temps réel. Idéal en déplacement ou pour les non-digitaux.',
    tip:    '🎙️ La voix IA utilise ElevenLabs (Charlotte, FR). Dites "Explique-moi les recommandations" et écoutez la réponse.',
    pos:    'bottom',
    accentCol: '#10b981',
    ringClass: '',
  },
  {
    id:     'viz',
    target: '[data-view="visualisations"]',
    nav:    null,
    icon:   '📈',
    iconBg: 'rgba(249,115,22,.1)',
    pill:   { label: 'ÉTAPE 6 · VISUELS', col: '#f97316', bg: 'rgba(249,115,22,.08)' },
    title:  'Visualisations 3D analytiques',
    body:   'Graphes Three.js interactifs : compteur de santé, matrice de risque, Altman Z décomposé, tornado de sensibilité. Tous agrémentés d\'un bouton "Expliquer" IA.',
    tip:    '🌐 La vue Positionnement concurrentiel vous montre où vous vous situez parmi vos pairs sectoriels sur un scatter plot animé.',
    pos:    'right',
    accentCol: '#f97316',
    ringClass: '',
  },
  {
    id:     'reco',
    target: '#reco-list',
    nav:    'dashboard',
    icon:   '💡',
    iconBg: 'rgba(255,215,0,.1)',
    pill:   { label: 'ÉTAPE 7 · ACTIONS', col: '#FFD700', bg: 'rgba(255,215,0,.08)' },
    title:  'Recommandations IA — actions concrètes',
    body:   'Pas de jargon : des étapes numérotées, priorisées par urgence. Chaque recommandation est cliquable pour demander une explication ou la marquer comme faite.',
    tip:    '✅ Filtrez par priorité (haute, moyenne, basse) et suivez votre progression. Les recommandations sont personnalisées à votre secteur et votre zone de risque.',
    pos:    'top',
    accentCol: '#FFD700',
    ringClass: 'gold',
  },
  {
    id:     'final',
    target: null,
    nav:    null,
    icon:   '🚀',
    iconBg: 'linear-gradient(135deg,rgba(255,215,0,.2),rgba(139,127,240,.15))',
    pill:   { label: 'PRÊT À DÉMARRER', col: '#FFD700', bg: 'rgba(255,215,0,.12)' },
    title:  'Vous êtes prêt pour votre première analyse !',
    body:   'Doctor Smile est votre copilote financier. Importez dès maintenant un fichier pour obtenir votre Doctor Score™ et vos recommandations personnalisées.',
    tip:    '🎁 Accès gratuit aux fonctionnalités essentielles. Passez Premium pour débloquer le simulateur What-If et les rapports PDF avancés.',
    pos:    'center',
    accentCol: '#FFD700',
    ringClass: 'gold',
  },
];

// ── État interne ────────────────────────────────────────────────
let _step = 0;
let _uid  = null;
let _running = false;

// ── Helpers DOM ─────────────────────────────────────────────────
const _el  = id => document.getElementById(id);
const _qs  = sel => document.querySelector(sel);
const _rem = id => _el(id)?.remove();

// ── Nettoyer tous les éléments du tour ──────────────────────────
function _cleanup() {
  ['_onb_overlay','_onb_cutout','_onb_hl_ring','_onb_bubble',
   '_onb_arrow','_onb_badge'].forEach(_rem);
  document.querySelectorAll('.onb-confetti').forEach(e => e.remove());
}

// ── Naviguer vers une vue si nécessaire ─────────────────────────
function _navTo(view) {
  if (!view) return;
  if (window.DS_VIEWS?.navTo) { window.DS_VIEWS.navTo(view); return; }
  if (window.DS?.navTo)       { window.DS.navTo(view); }
}

// ── Calculer la position de la bulle ────────────────────────────
function _bubblePos(rect, pos, bW, bH) {
  const M = 18; // marge px
  const vw = window.innerWidth, vh = window.innerHeight;
  let t, l;
  if (!rect || pos === 'center') {
    return { top: `${(vh - bH) / 2}px`, left: `${(vw - bW) / 2}px` };
  }
  switch (pos) {
    case 'right':
      l = rect.right + M;
      t = rect.top + (rect.height - bH) / 2;
      if (l + bW > vw - M) { l = rect.left - bW - M; } // flip gauche
      break;
    case 'left':
      l = rect.left - bW - M;
      t = rect.top + (rect.height - bH) / 2;
      if (l < M) { l = rect.right + M; }
      break;
    case 'bottom':
      t = rect.bottom + M;
      l = rect.left + (rect.width - bW) / 2;
      if (t + bH > vh - M) { t = rect.top - bH - M; }
      break;
    case 'top':
      t = rect.top - bH - M;
      l = rect.left + (rect.width - bW) / 2;
      if (t < M) { t = rect.bottom + M; }
      break;
    default:
      l = (vw - bW) / 2; t = (vh - bH) / 2;
  }
  // Clamp dans le viewport
  l = Math.max(M, Math.min(l, vw - bW - M));
  t = Math.max(M, Math.min(t, vh - bH - M));
  return { top: `${t}px`, left: `${l}px` };
}

// ── Rendre une étape ────────────────────────────────────────────
function _renderStep() {
  _cleanup();
  if (_step >= STEPS.length) { _complete(); return; }

  const step = STEPS[_step];

  // Naviguer si besoin
  if (step.nav) {
    _navTo(step.nav);
    // Délai pour laisser le DOM se mettre à jour
    setTimeout(() => _renderStepDOM(step), 350);
  } else {
    _renderStepDOM(step);
  }
}

function _renderStepDOM(step) {
  const target = step.target ? _qs(step.target) : null;
  const rect   = target ? target.getBoundingClientRect() : null;

  // Si la cible n'est pas visible (section cachée), on peut la rendre quand même
  // Pour score-sec et reco-list qui sont display:none avant analyse
  const isHidden = rect && (rect.width === 0 || rect.height === 0);

  // ── Overlay fond ────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = '_onb_overlay'; overlay.style.cssText = 'position:fixed;inset:0;z-index:18000;pointer-events:none;';
  document.body.appendChild(overlay);

  // ── Highlight ring ───────────────────────────────────────────
  if (rect && !isHidden) {
    const hl = document.createElement('div');
    hl.id = '_onb_hl_ring';
    if (step.ringClass) hl.classList.add(step.ringClass);
    const PAD = 8;
    hl.style.cssText = `
      top: ${rect.top - PAD}px; left: ${rect.left - PAD}px;
      width: ${rect.width + PAD*2}px; height: ${rect.height + PAD*2}px;
      border-radius: 14px;
    `;
    document.body.appendChild(hl);

    // Badge flottant au-dessus de la cible
    const badge = document.createElement('div');
    badge.id = '_onb_badge';
    badge.style.cssText = `
      top: ${Math.max(8, rect.top - PAD - 36)}px;
      left: ${rect.left + PAD}px;
      border-color: ${step.accentCol}44;
      color: ${step.accentCol};
      background: ${step.accentCol}18;
    `;
    badge.innerHTML = `<i class="fa-solid fa-hand-pointer"></i> ${step.pill.label.split('·')[0].trim()}`;
    document.body.appendChild(badge);
  }

  // ── Bulle ─────────────────────────────────────────────────────
  const bubble = document.createElement('div');
  bubble.id = '_onb_bubble';

  const progress = STEPS.map((_, i) => {
    const cls = i < _step ? 'done' : i === _step ? 'active' : '';
    return `<div class="onb-dot ${cls}" style="width:${i === _step ? 24 : 8}px;"
      title="Étape ${i+1}" onclick="window._DS_ONB_goto(${i})"></div>`;
  }).join('');

  const isFinal = _step === STEPS.length - 1;
  const hasPrev = _step > 0;

  bubble.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
      <div class="onb-step-icon" style="background:${step.iconBg};">${step.icon}</div>
      <div>
        <div class="onb-pill" style="color:${step.pill.col};background:${step.pill.bg};">
          ${step.pill.label}
        </div>
      </div>
    </div>
    <div class="onb-title">${step.title}</div>
    <div class="onb-body">${step.body}</div>
    ${step.tip ? `<div class="onb-tip"><i class="fa-solid fa-circle-info"></i>${step.tip}</div>` : ''}
    <div class="onb-progress">${progress}</div>
    <div class="onb-nav">
      <span class="onb-counter">${_step + 1} / ${STEPS.length}</span>
      <div class="onb-btns">
        ${hasPrev ? `<button class="onb-btn-prev" id="_onb_prev">← Préc.</button>` : ''}
        <button class="onb-btn-skip" id="_onb_skip">Passer</button>
        <button class="onb-btn-next${isFinal ? ' final' : ''}" id="_onb_next">
          ${isFinal
            ? `<i class="fa-solid fa-rocket"></i> Commencer !`
            : `Suivant <i class="fa-solid fa-arrow-right"></i>`}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(bubble);

  // ── Positionner la bulle ──────────────────────────────────────
  const bRect = { width: 340, height: 360 }; // approximation avant layout
  const pos = _bubblePos(rect && !isHidden ? rect : null, step.pos, bRect.width, bRect.height);
  bubble.style.top  = pos.top;
  bubble.style.left = pos.left;

  // Reposition après layout réel
  requestAnimationFrame(() => {
    const real = bubble.getBoundingClientRect();
    const pos2 = _bubblePos(rect && !isHidden ? rect : null, step.pos, real.width, real.height);
    bubble.style.top  = pos2.top;
    bubble.style.left = pos2.left;
  });

  // ── Événements boutons ────────────────────────────────────────
  _el('_onb_next')?.addEventListener('click', () => { _step++; _renderStep(); });
  _el('_onb_prev')?.addEventListener('click', () => { _step--; _renderStep(); });
  _el('_onb_skip')?.addEventListener('click', skip);

  // Clic sur l'overlay (hors bulle) pour avancer
  overlay.style.pointerEvents = 'auto';
  overlay.addEventListener('click', (e) => {
    if (!bubble.contains(e.target)) { _step++; _renderStep(); }
  });
}

// ── Goto (dots de progression) ──────────────────────────────────
window._DS_ONB_goto = function(i) {
  _step = i; _renderStep();
};

// ── Complétion + confetti ────────────────────────────────────────
function _complete() {
  _cleanup();
  _running = false;
  _markDone();
  _launchConfetti();
  // Toast succès
  setTimeout(() => {
    if (window.DS_VIEWS?.showToast) {
      window.DS_VIEWS.showToast('🎉 Prise en main terminée — bienvenue dans Doctor Smile !', 'ok');
    }
  }, 400);
}

function _launchConfetti() {
  const colors = ['#FFD700','#8B7FF0','#10b981','#8B7FF0','#f97316','#fff'];
  for (let i = 0; i < 80; i++) {
    const el = document.createElement('div');
    el.className = 'onb-confetti';
    el.style.cssText = `
      left: ${Math.random() * 100}vw;
      width: ${4 + Math.random() * 6}px;
      height: ${4 + Math.random() * 6}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      animation-duration: ${1.5 + Math.random() * 2.5}s;
      animation-delay: ${Math.random() * 0.8}s;
      border-radius: ${Math.random() > .5 ? '50%' : '2px'};
    `;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

async function _markDone() {
  if (!_uid) return;
  try {
    await updateDoc(doc(db, 'users', _uid), { onboardingDone: true });
  } catch(e) { console.warn('[Onboarding] markDone error:', e); }
}

// ── Skip global ─────────────────────────────────────────────────
function skip() {
  _cleanup();
  _running = false;
  _step = STEPS.length;
  _markDone();
}

// ════════════════════════════════════════════════════════════════
//  PHASE 0 — Écran splash cinématique
// ════════════════════════════════════════════════════════════════
function _showSplash(prenom, onStart) {
  const name = prenom ? prenom.split(' ')[0] : null;

  const splash = document.createElement('div');
  splash.id = '_onb_splash';
  splash.innerHTML = `
    <div class="sp-bg"></div>
    <div class="sp-grid"></div>

    <!-- Orbes de fond -->
    <div class="sp-orb" style="width:420px;height:420px;background:rgba(139,127,240,.04);top:-80px;left:-100px;animation-duration:18s;"></div>
    <div class="sp-orb" style="width:340px;height:340px;background:rgba(255,215,0,.04);bottom:-60px;right:-80px;animation-duration:14s;animation-delay:-5s;"></div>
    <div class="sp-orb" style="width:220px;height:220px;background:rgba(139,127,240,.03);top:40%;left:60%;animation-duration:22s;animation-delay:-8s;"></div>

    <!-- Logo -->
    <div class="sp-logo">💊</div>

    <!-- Titre -->
    <div class="sp-title" style="animation:_onbFadeUp .7s .1s both;">
      ${name ? `Bienvenue,<br><span>${name}</span> 👋` : `Bienvenue sur<br><span>Doctor Smile™</span>`}
    </div>

    <!-- Sous-titre -->
    <div class="sp-sub">
      Votre assistant financier pour PME camerounaises. Importez votre Balance Générale OHADA/SYSCOHADA et obtenez un diagnostic en 3 minutes.
    </div>

    <!-- Stats sociales -->
    <div class="sp-stats">
      <div class="sp-stat">
        <div class="sp-stat-val">2 min</div>
        <div class="sp-stat-lbl">analyse complète</div>
      </div>
      <div class="sp-stat">
        <div class="sp-stat-val">0→100</div>
        <div class="sp-stat-lbl">Doctor Score™</div>
      </div>
      <div class="sp-stat">
        <div class="sp-stat-val">IA 24/7</div>
        <div class="sp-stat-lbl">analyste disponible</div>
      </div>
    </div>

    <!-- Chips fonctionnalités -->
    <div class="sp-chips">
      <div class="sp-chip"><i class="fa-solid fa-file-excel"></i>Balance Générale</div>
      <div class="sp-chip"><i class="fa-solid fa-scale-balanced"></i>OHADA/SYSCOHADA</div>
      <div class="sp-chip"><i class="fa-solid fa-brain"></i>Analyse IA</div>
      <div class="sp-chip"><i class="fa-solid fa-lightbulb"></i>Recommandations</div>
    </div>

    <!-- CTA -->
    <div class="sp-cta">
      <button class="sp-btn-start" id="_onb_sp_start">
        <i class="fa-solid fa-play"></i>
        Commencer la visite guidée
      </button>
      <div class="sp-skip" id="_onb_sp_skip">Passer le tutoriel →</div>
    </div>

    <!-- Barre de progression auto (4s) -->
    <div class="sp-progress">
      <div class="sp-progress-bar" id="_onb_sp_prog"></div>
    </div>
  `;

  document.body.appendChild(splash);

  // Barre auto
  requestAnimationFrame(() => {
    const bar = _el('_onb_sp_prog');
    if (bar) bar.style.width = '100%';
  });

  // Auto-start après 6s (si l'utilisateur ne clique pas)
  const autoTimer = setTimeout(() => _startTour(splash, onStart), 6000);

  _el('_onb_sp_start')?.addEventListener('click', () => {
    clearTimeout(autoTimer);
    _startTour(splash, onStart);
  });

  _el('_onb_sp_skip')?.addEventListener('click', () => {
    clearTimeout(autoTimer);
    splash.classList.add('sp-exit');
    setTimeout(() => { splash.remove(); skip(); }, 600);
  });
}

function _startTour(splash, onStart) {
  splash.classList.add('sp-exit');
  setTimeout(() => {
    splash.remove();
    if (onStart) onStart();
  }, 600);
}

// ════════════════════════════════════════════════════════════════
//  API PUBLIQUE
// ════════════════════════════════════════════════════════════════
function start(uid) {
  if (_running) return;
  _uid     = uid;
  _step    = 0;
  _running = true;

  const prenom = window.S?.profile?.prenom || window.S?.user?.displayName?.split(' ')[0] || null;

  _injectCSS();
  _showSplash(prenom, () => {
    _renderStep();
  });
}

async function checkAndStart(uid) {
  if (!uid) return;
  // Attendre que le profil soit dispo
  let attempts = 0;
  while (!window.S?.profile && attempts < 20) {
    await new Promise(r => setTimeout(r, 200));
    attempts++;
  }
  const profile = window.S?.profile;
  if (!profile) return;
  if (profile.onboardingDone) return;

  // Délai pour que le dashboard finisse de se charger
  setTimeout(() => start(uid), 2000);
}

// Rejouer le tour manuellement (bouton dans paramètres)
function replay() {
  if (window.S?.uid) {
    _step = 0; _running = false; start(window.S.uid);
  }
}

export const DS_ONBOARDING = { start, skip, checkAndStart, replay };
window.DS_ONBOARDING = DS_ONBOARDING;

console.log('%c[DS Onboarding] ✅ Chargé', 'color:#8B7FF0;font-weight:bold');
