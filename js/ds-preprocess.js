// ════════════════════════════════════════════════════════════════
//  ds-preprocess.js — Doctor Smile · Power Query IA v1
//  ─────────────────────────────────────────────────────────────
//  Remplace le modal basique par un éditeur de données complet :
//
//  ① ÉDITEUR POWER BI
//     • Ajout / suppression lignes ET colonnes
//     • Renommage colonnes (double-clic)
//     • Filtre par colonne (dropdown)
//     • Sélection multiple lignes → bulk delete
//     • Freeze header + scroll horizontal
//     • Recherche globale dans les données
//     • Pagination (50 lignes/page)
//     • Undo / Redo (10 niveaux)
//
//  ② ANALYSE IA GROQ (llama-3.3-70b)
//     Avant d'afficher le tableau, le LLM analyse en JSON :
//     • Détection pays / secteur / devise / exercice
//     • Mapping colonnes → clés OHADA internes
//     • Valeurs suspectes avec explication
//     • Champs critiques manquants
//     • Score de qualité 0-100
//
//  ③ DIALOGUE DE VALIDATION
//     Pour chaque incertitude : card interactive avec
//     proposition IA + bouton Valider / Corriger / Ignorer
//
//  ④ APERÇU DIFF BEFORE/AFTER
//     Comparaison visuelle original vs corrigé
//     Highlight rouge/vert des changements
//
//  INTÉGRATION : ajouter après ds-upload.js dans dashboard.html
//  <script type="module" src="./js/ds-preprocess.js"></script>
//  Aucune modification des fichiers existants.
// ════════════════════════════════════════════════════════════════

const _API  = window.API_BASE || 'http://127.0.0.1:8000';
const _esc  = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const _toast = (m,t='ok',d=3500) => window.showToast?.(m,t,d);

// ════════════════════════════════════════════════════════════════
//  CSS — Power Query UI
// ════════════════════════════════════════════════════════════════
(function _css(){
  if(document.getElementById('_ppq_css')) return;
  const s=document.createElement('style'); s.id='_ppq_css';
  s.textContent=`

/* ── Modal full-screen ─────────────────────────────────────── */
#ppq-overlay{
  position:fixed;inset:0;z-index:8500;
  background:rgba(2,4,11,.96);backdrop-filter:blur(22px);
  display:none;flex-direction:column;
  animation:ppqIn .3s ease;
}
@keyframes ppqIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
#ppq-overlay.open{display:flex;}

/* ── Topbar ────────────────────────────────────────────────── */
#ppq-topbar{
  display:flex;align-items:center;gap:12px;flex-wrap:wrap;
  padding:10px 18px;background:rgba(4,6,14,.98);
  border-bottom:1px solid rgba(125,211,252,.1);flex-shrink:0;
}
#ppq-title{
  font-family:'Syne',sans-serif;font-size:13px;font-weight:900;
  color:#fff;display:flex;align-items:center;gap:8px;
}
#ppq-file-badge{
  font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;
  color:rgba(125,211,252,.7);background:rgba(125,211,252,.08);
  border:1px solid rgba(125,211,252,.18);border-radius:6px;
  padding:2px 9px;
}
#ppq-stats-bar{
  display:flex;gap:10px;margin-left:auto;
  font-family:'JetBrains Mono',monospace;font-size:8.5px;color:rgba(255,255,255,.3);
}
.ppq-stat{display:flex;align-items:center;gap:4px;}
.ppq-stat-dot{width:5px;height:5px;border-radius:50%;}

/* ── Toolbar ────────────────────────────────────────────────── */
#ppq-toolbar{
  display:flex;align-items:center;gap:6px;flex-wrap:wrap;
  padding:7px 18px;background:rgba(5,8,16,.96);
  border-bottom:1px solid rgba(255,255,255,.05);flex-shrink:0;
}
.ppq-btn{
  display:inline-flex;align-items:center;gap:5px;
  padding:5px 11px;border-radius:7px;font-family:'Syne',sans-serif;
  font-size:8px;font-weight:800;letter-spacing:.06em;cursor:pointer;
  background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);
  color:rgba(255,255,255,.55);transition:all .15s;white-space:nowrap;
}
.ppq-btn:hover{background:rgba(125,211,252,.1);border-color:rgba(125,211,252,.28);color:#7DD3FC;}
.ppq-btn.danger:hover{background:rgba(239,68,68,.1);border-color:rgba(239,68,68,.28);color:#ef4444;}
.ppq-btn.primary{background:rgba(125,211,252,.12);border-color:rgba(125,211,252,.3);color:#7DD3FC;}
.ppq-btn.gold{background:rgba(255,215,0,.1);border-color:rgba(255,215,0,.25);color:#FFD700;}
.ppq-btn.disabled{opacity:.35;pointer-events:none;}
.ppq-sep{width:1px;height:20px;background:rgba(255,255,255,.08);margin:0 2px;}
#ppq-search{
  margin-left:auto;padding:5px 11px;border-radius:7px;
  background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
  color:#fff;font-family:'Instrument Sans',sans-serif;font-size:9px;
  outline:none;min-width:160px;transition:border-color .2s;
}
#ppq-search:focus{border-color:rgba(125,211,252,.4);}
#ppq-search::placeholder{color:rgba(255,255,255,.25);}

/* ── Main body ──────────────────────────────────────────────── */
#ppq-body{display:flex;flex:1;min-height:0;overflow:hidden;}

/* ── Sidebar IA ─────────────────────────────────────────────── */
#ppq-sidebar{
  width:290px;flex-shrink:0;background:rgba(4,6,14,.98);
  border-right:1px solid rgba(125,211,252,.08);
  display:flex;flex-direction:column;overflow:hidden;
  transition:width .3s ease;
}
#ppq-sidebar.collapsed{width:0;}
#ppq-sidebar-inner{flex:1;overflow-y:auto;padding:14px;}
#ppq-sidebar-inner::-webkit-scrollbar{width:3px;}
#ppq-sidebar-inner::-webkit-scrollbar-thumb{background:rgba(125,211,252,.2);border-radius:2px;}

/* ── IA Score qualité ────────────────────────────────────────── */
#ppq-dqs-ring{
  display:flex;align-items:center;justify-content:center;
  margin-bottom:16px;
}
.ppq-ring-wrap{position:relative;width:80px;height:80px;}
.ppq-ring-wrap svg{transform:rotate(-90deg);width:80px;height:80px;}
.ppq-ring-bg{fill:none;stroke:rgba(255,255,255,.06);stroke-width:8;}
.ppq-ring-fill{fill:none;stroke-width:8;stroke-linecap:round;stroke-dasharray:226;transition:stroke-dashoffset .8s ease;}
.ppq-ring-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.ppq-ring-val{font-family:'Syne',sans-serif;font-size:22px;font-weight:900;line-height:1;}
.ppq-ring-lbl{font-size:7.5px;font-weight:700;color:rgba(255,255,255,.3);letter-spacing:.08em;text-transform:uppercase;}

/* ── Sections sidebar ────────────────────────────────────────── */
.ppq-section{margin-bottom:16px;}
.ppq-section-title{
  font-family:'Syne',sans-serif;font-size:8px;font-weight:800;
  letter-spacing:.14em;text-transform:uppercase;
  color:rgba(255,255,255,.28);margin-bottom:8px;
  display:flex;align-items:center;gap:6px;
}
.ppq-section-title i{font-size:10px;}

/* ── Validation cards ────────────────────────────────────────── */
.ppq-val-card{
  background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);
  border-radius:10px;padding:11px 12px;margin-bottom:8px;
  transition:all .2s;
}
.ppq-val-card.urgent{border-color:rgba(239,68,68,.25);background:rgba(239,68,68,.04);}
.ppq-val-card.suggestion{border-color:rgba(125,211,252,.2);background:rgba(125,211,252,.03);}
.ppq-val-card.info{border-color:rgba(16,185,129,.2);background:rgba(16,185,129,.03);}
.ppq-val-card-title{
  font-family:'Syne',sans-serif;font-size:9px;font-weight:800;
  color:#fff;margin-bottom:4px;display:flex;align-items:center;gap:6px;
}
.ppq-val-card-body{font-size:9px;color:rgba(255,255,255,.5);line-height:1.55;margin-bottom:8px;}
.ppq-val-card-body strong{color:#fff;font-weight:600;}
.ppq-val-btns{display:flex;gap:5px;flex-wrap:wrap;}
.ppq-vbtn{
  padding:4px 10px;border-radius:6px;font-family:'Syne',sans-serif;
  font-size:7.5px;font-weight:800;letter-spacing:.05em;cursor:pointer;
  transition:all .15s;
}
.ppq-vbtn-ok{background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.28);color:#10b981;}
.ppq-vbtn-ok:hover{background:rgba(16,185,129,.22);}
.ppq-vbtn-edit{background:rgba(125,211,252,.1);border:1px solid rgba(125,211,252,.25);color:#7DD3FC;}
.ppq-vbtn-edit:hover{background:rgba(125,211,252,.2);}
.ppq-vbtn-skip{background:transparent;border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.3);}
.ppq-vbtn-skip:hover{border-color:rgba(255,255,255,.25);color:rgba(255,255,255,.5);}

/* ── Mapping colonnes ────────────────────────────────────────── */
.ppq-col-map{
  display:flex;align-items:center;gap:6px;
  padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);
  font-size:9px;
}
.ppq-col-map:last-child{border-bottom:none;}
.ppq-col-orig{
  font-family:'JetBrains Mono',monospace;font-size:8px;color:rgba(255,255,255,.5);
  flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.ppq-col-arrow{color:rgba(125,211,252,.4);font-size:10px;flex-shrink:0;}
.ppq-col-target{
  font-family:'Syne',sans-serif;font-size:8px;font-weight:700;
  color:#7DD3FC;flex:1;overflow:hidden;text-overflow:ellipsis;
}
.ppq-col-status{font-size:9px;flex-shrink:0;}

/* ── Meta détectée ───────────────────────────────────────────── */
.ppq-meta-row{
  display:flex;align-items:center;justify-content:space-between;
  padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04);
  font-size:9px;
}
.ppq-meta-row:last-child{border-bottom:none;}
.ppq-meta-lbl{color:rgba(255,255,255,.35);font-weight:600;}
.ppq-meta-val{color:#fff;font-family:'Syne',sans-serif;font-weight:700;}
.ppq-meta-conf{
  font-size:7px;padding:1px 6px;border-radius:4px;
  font-family:'Syne',sans-serif;font-weight:800;letter-spacing:.06em;
}
.ppq-meta-high{background:rgba(16,185,129,.1);color:#10b981;border:1px solid rgba(16,185,129,.2);}
.ppq-meta-med{background:rgba(245,158,11,.1);color:#f59e0b;border:1px solid rgba(245,158,11,.2);}
.ppq-meta-low{background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.2);}

/* ── Spinner IA ──────────────────────────────────────────────── */
#ppq-ai-loader{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:32px 16px;gap:12px;
}
.ppq-ai-dots{display:flex;gap:6px;}
.ppq-ai-dot{
  width:7px;height:7px;border-radius:50%;
  background:rgba(125,211,252,.5);
  animation:ppqDot .9s ease-in-out infinite;
}
.ppq-ai-dot:nth-child(2){animation-delay:.15s;}
.ppq-ai-dot:nth-child(3){animation-delay:.3s;}
@keyframes ppqDot{0%,60%,100%{transform:translateY(0);opacity:.35}30%{transform:translateY(-7px);opacity:1}}
.ppq-ai-label{font-family:'Syne',sans-serif;font-size:9px;font-weight:700;color:rgba(125,211,252,.6);}

/* ── Table zone ─────────────────────────────────────────────── */
#ppq-table-wrap{
  flex:1;overflow:auto;position:relative;
}
#ppq-table-wrap::-webkit-scrollbar{width:5px;height:5px;}
#ppq-table-wrap::-webkit-scrollbar-track{background:rgba(255,255,255,.02);}
#ppq-table-wrap::-webkit-scrollbar-thumb{background:rgba(125,211,252,.2);border-radius:3px;}

#ppq-table{
  border-collapse:separate;border-spacing:0;
  font-family:'Instrument Sans',sans-serif;font-size:11px;
  width:max-content;min-width:100%;
}

/* ── Table header ────────────────────────────────────────────── */
#ppq-table thead th{
  position:sticky;top:0;z-index:10;
  background:rgba(4,6,14,.99);
  border-bottom:2px solid rgba(125,211,252,.15);
  border-right:1px solid rgba(255,255,255,.05);
  padding:0;min-width:140px;white-space:nowrap;user-select:none;
}
.ppq-th-inner{
  display:flex;align-items:center;gap:5px;
  padding:8px 10px;cursor:pointer;
  transition:background .15s;
}
.ppq-th-inner:hover{background:rgba(125,211,252,.06);}
.ppq-th-name{
  font-family:'Syne',sans-serif;font-size:9px;font-weight:800;
  letter-spacing:.06em;color:rgba(255,255,255,.75);flex:1;
  overflow:hidden;text-overflow:ellipsis;
  outline:none;
}
.ppq-th-name[contenteditable=true]:focus{
  color:#7DD3FC;border-bottom:1px solid rgba(125,211,252,.5);
}
.ppq-th-mapped{
  font-size:7px;padding:1px 5px;border-radius:4px;
  background:rgba(16,185,129,.1);color:#10b981;
  border:1px solid rgba(16,185,129,.2);flex-shrink:0;
  font-family:'Syne',sans-serif;font-weight:800;letter-spacing:.04em;
  white-space:nowrap;
}
.ppq-th-actions{
  display:none;gap:3px;padding:0 6px 0 0;
}
#ppq-table thead th:hover .ppq-th-actions{display:flex;}
.ppq-th-act{
  width:18px;height:18px;border-radius:4px;
  display:flex;align-items:center;justify-content:center;
  font-size:8px;cursor:pointer;transition:all .15s;
  background:transparent;color:rgba(255,255,255,.25);
}
.ppq-th-act:hover{background:rgba(239,68,68,.15);color:#ef4444;}

/* ── Row number col ─────────────────────────────────────────── */
th.ppq-rn,td.ppq-rn{
  position:sticky;left:0;z-index:5;
  background:rgba(4,6,14,.98);
  width:40px;min-width:40px;max-width:40px;
  text-align:center;
  border-right:1px solid rgba(125,211,252,.1);
  font-family:'JetBrains Mono',monospace;font-size:8px;color:rgba(255,255,255,.2);
}
td.ppq-rn{cursor:pointer;transition:background .15s;}
td.ppq-rn:hover{background:rgba(125,211,252,.06);}
tr.selected td.ppq-rn{background:rgba(125,211,252,.12);color:#7DD3FC;}
tr.selected td{background:rgba(125,211,252,.04)!important;}

/* ── Table cells ─────────────────────────────────────────────── */
#ppq-table tbody td{
  padding:6px 10px;
  border-bottom:1px solid rgba(255,255,255,.04);
  border-right:1px solid rgba(255,255,255,.03);
  color:rgba(255,255,255,.78);
  transition:background .1s;
  position:relative;
  min-height:32px;
}
#ppq-table tbody td:focus{
  outline:2px solid rgba(125,211,252,.5);
  outline-offset:-1px;
  background:rgba(125,211,252,.05)!important;
  z-index:2;
}
#ppq-table tbody tr:hover td{background:rgba(255,255,255,.025);}
td.ppq-missing{
  color:rgba(255,255,255,.2)!important;
  background:rgba(239,68,68,.03)!important;
  font-style:italic;
}
td.ppq-anomaly{
  background:rgba(239,68,68,.06)!important;
  border-bottom:2px solid rgba(239,68,68,.3)!important;
}
td.ppq-corrected{
  background:rgba(16,185,129,.06)!important;
  border-bottom:2px solid rgba(16,185,129,.3)!important;
}
td.ppq-modified{
  background:rgba(255,215,0,.05)!important;
  border-bottom:1px solid rgba(255,215,0,.25)!important;
}

/* ── Footer / Pagination ─────────────────────────────────────── */
#ppq-footer{
  display:flex;align-items:center;gap:10px;flex-wrap:wrap;
  padding:8px 18px;background:rgba(4,6,14,.98);
  border-top:1px solid rgba(255,255,255,.06);flex-shrink:0;
}
#ppq-pagination{display:flex;gap:4px;align-items:center;}
.ppq-page-btn{
  width:26px;height:26px;border-radius:6px;
  background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);
  color:rgba(255,255,255,.45);font-family:'Syne',sans-serif;font-size:8px;
  font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;
  transition:all .15s;
}
.ppq-page-btn:hover,.ppq-page-btn.active{
  background:rgba(125,211,252,.12);border-color:rgba(125,211,252,.3);color:#7DD3FC;
}
#ppq-row-info{
  font-family:'JetBrains Mono',monospace;font-size:8.5px;color:rgba(255,255,255,.28);
}
#ppq-launch-wrap{margin-left:auto;display:flex;gap:8px;align-items:center;}
#ppq-launch-btn{
  padding:10px 24px;border-radius:9px;font-family:'Syne',sans-serif;
  font-size:10px;font-weight:900;letter-spacing:.1em;
  background:linear-gradient(135deg,#7DD3FC,#38BDF8);border:none;
  color:#02040B;cursor:pointer;box-shadow:0 0 20px rgba(125,211,252,.3);
  transition:all .2s cubic-bezier(.34,1.56,.64,1);
}
#ppq-launch-btn:hover{transform:translateY(-2px);box-shadow:0 4px 28px rgba(125,211,252,.45);}
#ppq-diff-btn{
  padding:10px 18px;border-radius:9px;font-family:'Syne',sans-serif;
  font-size:9px;font-weight:800;letter-spacing:.08em;
  background:rgba(255,215,0,.08);border:1px solid rgba(255,215,0,.22);
  color:#FFD700;cursor:pointer;transition:all .2s;
}
#ppq-diff-btn:hover{background:rgba(255,215,0,.16);}

/* ── Diff view ───────────────────────────────────────────────── */
#ppq-diff-view{
  display:none;position:absolute;inset:0;z-index:20;
  background:rgba(2,4,11,.98);overflow:auto;padding:20px;
}
#ppq-diff-view.open{display:block;}
.ppq-diff-header{
  display:grid;grid-template-columns:1fr 1fr;gap:16px;
  margin-bottom:16px;
}
.ppq-diff-title{
  font-family:'Syne',sans-serif;font-size:11px;font-weight:800;
  padding:8px 14px;border-radius:8px;
}
.ppq-diff-before{background:rgba(239,68,68,.08);color:#ef4444;border:1px solid rgba(239,68,68,.2);}
.ppq-diff-after{background:rgba(16,185,129,.08);color:#10b981;border:1px solid rgba(16,185,129,.2);}
.ppq-diff-table{width:100%;border-collapse:collapse;font-size:10px;}
.ppq-diff-table th{
  background:rgba(255,255,255,.05);padding:6px 10px;
  font-family:'Syne',sans-serif;font-size:8px;font-weight:800;color:rgba(255,255,255,.6);
  text-align:left;border-bottom:1px solid rgba(255,255,255,.08);
}
.ppq-diff-table td{
  padding:5px 10px;border-bottom:1px solid rgba(255,255,255,.04);
  color:rgba(255,255,255,.65);
}
.ppq-diff-del{background:rgba(239,68,68,.08);color:#ef4444;text-decoration:line-through;}
.ppq-diff-add{background:rgba(16,185,129,.08);color:#10b981;}
.ppq-diff-unch{color:rgba(255,255,255,.35);}

/* ── Column filter dropdown ─────────────────────────────────── */
.ppq-filter-dd{
  position:absolute;top:100%;left:0;z-index:50;
  background:rgba(5,8,18,.99);border:1px solid rgba(125,211,252,.2);
  border-radius:10px;padding:8px;min-width:180px;
  box-shadow:0 12px 40px rgba(0,0,0,.6);
}
.ppq-filter-inp{
  width:100%;padding:5px 9px;background:rgba(255,255,255,.05);
  border:1px solid rgba(255,255,255,.1);border-radius:6px;
  color:#fff;font-size:9px;outline:none;margin-bottom:6px;box-sizing:border-box;
}
.ppq-filter-option{
  padding:4px 8px;border-radius:5px;font-size:9px;color:rgba(255,255,255,.6);
  cursor:pointer;transition:background .12s;display:flex;align-items:center;gap:5px;
}
.ppq-filter-option:hover,.ppq-filter-option.selected{
  background:rgba(125,211,252,.1);color:#7DD3FC;
}
.ppq-filter-clear{
  width:100%;margin-top:4px;padding:4px;border-radius:5px;
  background:transparent;border:1px solid rgba(255,255,255,.08);
  color:rgba(255,255,255,.3);font-size:8px;cursor:pointer;font-family:'Syne',sans-serif;
  font-weight:700;
}

/* ── Responsive ──────────────────────────────────────────────── */
@media(max-width:700px){
  #ppq-sidebar{width:0;}
  #ppq-sidebar.mobile-open{width:260px;position:absolute;z-index:15;height:100%;}
}
  `;
  document.head.appendChild(s);
})();

// ════════════════════════════════════════════════════════════════
//  MAPPINGS OHADA (clés internes → labels + catégories)
// ════════════════════════════════════════════════════════════════
const OHADA_KEYS = {
  actif_total:'Actif Total',actif_courant:'Actif Courant',actif_immobilise:'Actif Immobilisé',
  tresorerie:'Trésorerie',stocks:'Stocks',creances_clients:'Créances Clients',
  capitaux_propres:'Capitaux Propres',dettes_lt:'Dettes LT',passif_courant:'Passif Courant',
  dettes_totales:'Dettes Totales',dettes_fournisseurs:'Dettes Fournisseurs',
  resultats_reportes:'Résultats Reportés',chiffre_affaires:'Chiffre d\'Affaires',
  marge_brute:'Marge Brute',ebitda:'EBITDA',resultat_exploitation:'Résultat Exploitation',
  resultat_net:'Résultat Net',charges_financieres:'Charges Financières',impots:'Impôts',
  current_ratio:'Ratio Liquidité',quick_ratio:'Liquidité Immédiate',
  debt_equity:'Dettes/Capitaux',solvabilite:'Solvabilité',roa:'ROA%',roe:'ROE%',
  annees_activite:'Ancienneté',altman_z:'Score Altman-Z',
};
const CRITICAL_KEYS = new Set(['actif_total','capitaux_propres','chiffre_affaires','resultat_net','actif_courant','passif_courant']);

// ════════════════════════════════════════════════════════════════
//  ÉTAT INTERNE
// ════════════════════════════════════════════════════════════════
const ST = {
  data:        [],    // données courantes (tableau d'objets)
  original:    [],    // snapshot original (pour diff)
  columns:     [],    // ordre des colonnes
  colMap:      {},    // mapping col original → clé OHADA
  aiResult:    null,  // résultat JSON de l'analyse IA
  page:        0,
  pageSize:    50,
  searchQ:     '',
  filters:     {},    // { colName: Set de valeurs sélectionnées }
  selected:    new Set(), // indices de lignes sélectionnées
  history:     [],    // undo stack
  historyIdx:  -1,
  modified:    new Set(), // {row-col} modifiées
  corrections: new Map(), // clé "row-col" → valeur corrigée par IA
  filename:    '',
  dqsScore:    null,
  filterDD:    null,  // dropdown de filtre actif
};

// ════════════════════════════════════════════════════════════════
//  HISTORIQUE UNDO/REDO
// ════════════════════════════════════════════════════════════════
function _snapshot() {
  ST.history = ST.history.slice(0, ST.historyIdx + 1);
  ST.history.push({
    data:    JSON.parse(JSON.stringify(ST.data)),
    columns: [...ST.columns],
  });
  if (ST.history.length > 12) ST.history.shift();
  ST.historyIdx = ST.history.length - 1;
  _updateUndoRedo();
}
function _undo() {
  if (ST.historyIdx <= 0) return;
  ST.historyIdx--;
  const snap = ST.history[ST.historyIdx];
  ST.data = JSON.parse(JSON.stringify(snap.data));
  ST.columns = [...snap.columns];
  _render(); _toast('↩ Annulé','info');
}
function _redo() {
  if (ST.historyIdx >= ST.history.length - 1) return;
  ST.historyIdx++;
  const snap = ST.history[ST.historyIdx];
  ST.data = JSON.parse(JSON.stringify(snap.data));
  ST.columns = [...snap.columns];
  _render(); _toast('↪ Rétabli','info');
}
function _updateUndoRedo() {
  document.getElementById('ppq-undo')?.classList.toggle('disabled', ST.historyIdx <= 0);
  document.getElementById('ppq-redo')?.classList.toggle('disabled', ST.historyIdx >= ST.history.length - 1);
}

// ════════════════════════════════════════════════════════════════
//  CONSTRUCTION DU MODAL
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════
//  MODAL — Power Query IA v4 avec AGENT CHAT INTÉGRÉ
// ════════════════════════════════════════════════════════════════════════
function _buildModal() {
  if (document.getElementById('ppq-overlay')) return;

  // CSS Agent
  if (!document.getElementById('_ppq_agent_css')) {
    const s = document.createElement('style'); s.id = '_ppq_agent_css';
    s.textContent = `
/* ── AGENT CHAT PANEL ── */
#ppq-agent-panel{
  position:absolute;bottom:0;left:0;right:0;
  background:rgba(3,5,14,.98);border-top:1px solid rgba(125,211,252,.15);
  display:flex;flex-direction:column;
  transition:height .3s cubic-bezier(.16,1,.3,1);
  z-index:30;overflow:hidden;
}
#ppq-agent-panel.closed{height:44px;}
#ppq-agent-panel.open{height:340px;}
#ppq-agent-header{
  display:flex;align-items:center;gap:8px;padding:0 14px;height:44px;flex-shrink:0;
  cursor:pointer;border-bottom:1px solid rgba(255,255,255,.04);
  background:rgba(125,211,252,.03);
}
#ppq-agent-header:hover{background:rgba(125,211,252,.06);}
#ppq-agent-title{
  font-family:'Syne',sans-serif;font-size:10px;font-weight:900;
  color:#7DD3FC;letter-spacing:.04em;display:flex;align-items:center;gap:6px;
}
.ppq-agent-dot{
  width:7px;height:7px;border-radius:50%;background:#10b981;
  box-shadow:0 0 8px #10b981;animation:adot 2s ease-in-out infinite;
}
@keyframes adot{0%,100%{opacity:.5;}50%{opacity:1;}}
#ppq-agent-badge{
  font-size:7.5px;padding:1px 7px;border-radius:100px;
  background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.2);
  color:#10b981;font-family:'Syne',sans-serif;font-weight:800;
}
#ppq-agent-shortcuts{
  display:flex;gap:5px;margin-left:auto;
}
.ppq-shortcut{
  font-family:'JetBrains Mono',monospace;font-size:7.5px;
  padding:2px 7px;border-radius:4px;border:1px solid rgba(255,255,255,.1);
  color:rgba(255,255,255,.3);cursor:pointer;transition:all .15s;white-space:nowrap;
}
.ppq-shortcut:hover{background:rgba(125,211,252,.1);border-color:rgba(125,211,252,.3);color:#7DD3FC;}
#ppq-agent-msgs{
  flex:1;overflow-y:auto;padding:10px 14px;display:flex;flex-direction:column;gap:8px;
}
#ppq-agent-msgs::-webkit-scrollbar{width:3px;}
#ppq-agent-msgs::-webkit-scrollbar-thumb{background:rgba(125,211,252,.2);border-radius:2px;}
.ppq-msg{display:flex;gap:8px;align-items:flex-start;animation:msgIn .2s ease;}
@keyframes msgIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.ppq-msg.user{flex-direction:row-reverse;}
.ppq-msg-av{
  width:24px;height:24px;border-radius:50%;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;
}
.ppq-av-ai{background:linear-gradient(135deg,#7DD3FC,#38BDF8);color:#02040B;}
.ppq-av-user{background:linear-gradient(135deg,#FFD700,#FFC107);color:#02040B;}
.ppq-msg-bubble{
  padding:8px 12px;border-radius:11px;font-size:10px;line-height:1.6;
  max-width:88%;
}
.ppq-bubble-ai{background:rgba(125,211,252,.07);border:1px solid rgba(125,211,252,.12);color:rgba(255,255,255,.82);border-bottom-left-radius:3px;}
.ppq-bubble-user{background:rgba(255,215,0,.08);border:1px solid rgba(255,215,0,.14);color:rgba(255,255,255,.75);border-bottom-right-radius:3px;}
.ppq-bubble-system{background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.14);color:#10b981;font-family:'JetBrains Mono',monospace;font-size:8.5px;width:100%;box-sizing:border-box;}
.ppq-bubble-error{background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.14);color:#ef4444;}
.ppq-tool-call{
  display:flex;align-items:center;gap:6px;padding:4px 9px;border-radius:6px;
  background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);
  font-family:'JetBrains Mono',monospace;font-size:7.5px;color:rgba(255,255,255,.4);
  margin:2px 0;
}
.ppq-tool-call.ok{border-color:rgba(16,185,129,.2);color:#10b981;}
.ppq-tool-call.err{border-color:rgba(239,68,68,.2);color:#ef4444;}
.ppq-tool-icon{width:14px;height:14px;flex-shrink:0;}
.ppq-thinking{display:flex;gap:4px;align-items:center;padding:6px 10px;}
.ppq-think-dot{width:5px;height:5px;border-radius:50%;background:rgba(125,211,252,.4);animation:pdot .7s ease-in-out infinite;}
.ppq-think-dot:nth-child(2){animation-delay:.1s;}
.ppq-think-dot:nth-child(3){animation-delay:.2s;}
#ppq-agent-input-row{
  display:flex;gap:8px;padding:8px 14px;border-top:1px solid rgba(255,255,255,.05);flex-shrink:0;
}
#ppq-agent-inp{
  flex:1;padding:8px 14px;border-radius:10px;
  background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
  color:#fff;font-family:'Instrument Sans',sans-serif;font-size:10px;outline:none;
  transition:border-color .2s;
}
#ppq-agent-inp:focus{border-color:rgba(125,211,252,.4);background:rgba(125,211,252,.04);}
#ppq-agent-inp::placeholder{color:rgba(255,255,255,.22);}
#ppq-agent-send{
  padding:8px 16px;border-radius:10px;font-family:'Syne',sans-serif;font-size:8.5px;
  font-weight:800;letter-spacing:.06em;
  background:linear-gradient(135deg,rgba(125,211,252,.18),rgba(56,189,248,.12));
  border:1px solid rgba(125,211,252,.3);color:#7DD3FC;cursor:pointer;
  transition:all .18s;white-space:nowrap;
}
#ppq-agent-send:hover{background:rgba(125,211,252,.25);transform:translateY(-1px);}
#ppq-agent-send:disabled{opacity:.4;pointer-events:none;}
#ppq-agent-send.thinking{animation:btnPulse 1.2s ease-in-out infinite;}
@keyframes btnPulse{0%,100%{opacity:.5}50%{opacity:1}}
/* Highlight de cellule depuis l'agent */
td.agent-highlight{
  outline:2px solid rgba(255,215,0,.7)!important;
  background:rgba(255,215,0,.08)!important;
  animation:hlPulse 1s ease-in-out 3;
}
@keyframes hlPulse{0%,100%{outline-color:rgba(255,215,0,.3)}50%{outline-color:rgba(255,215,0,.9)}}
/* Table zone réduite quand agent ouvert */
#ppq-body{transition:height .3s;}
`;
    document.head.appendChild(s);
  }

  const el = document.createElement('div'); el.id = 'ppq-overlay';
  el.innerHTML = `
<!-- TOPBAR -->
<div id="ppq-topbar">
  <div id="ppq-title">
    <i class="fa-solid fa-wand-magic-sparkles" style="color:#7DD3FC;font-size:14px;"></i>
    Éditeur de données
    <span id="ppq-file-badge">—</span>
  </div>
  <div id="ppq-stats-bar">
    <div class="ppq-stat"><div class="ppq-stat-dot" style="background:#10b981"></div><span id="ppq-stat-rows">0 lignes</span></div>
    <div class="ppq-stat"><div class="ppq-stat-dot" style="background:#7DD3FC"></div><span id="ppq-stat-cols">0 colonnes</span></div>
    <div class="ppq-stat"><div class="ppq-stat-dot" style="background:#f59e0b"></div><span id="ppq-stat-miss">0 manquants</span></div>
  </div>
  <button class="ppq-btn" onclick="PPQ.toggleSidebar()" title="Panneau IA">
    <i class="fa-solid fa-robot"></i> IA
  </button>
  <button class="ppq-btn danger" onclick="PPQ.close()" style="margin-left:4px;">
    <i class="fa-solid fa-xmark"></i>
  </button>
</div>

<!-- TOOLBAR -->
<div id="ppq-toolbar">
  <button class="ppq-btn" onclick="PPQ.addRow()"><i class="fa-solid fa-plus"></i> Ligne</button>
  <button class="ppq-btn" onclick="PPQ.addColumn()"><i class="fa-solid fa-columns"></i> Colonne</button>
  <button class="ppq-btn danger" onclick="PPQ.deleteSelected()"><i class="fa-solid fa-trash"></i> Supprimer</button>
  <div class="ppq-sep"></div>
  <button class="ppq-btn disabled" id="ppq-undo" onclick="PPQ.undo()"><i class="fa-solid fa-rotate-left"></i></button>
  <button class="ppq-btn disabled" id="ppq-redo" onclick="PPQ.redo()"><i class="fa-solid fa-rotate-right"></i></button>
  <div class="ppq-sep"></div>
  <button class="ppq-btn gold" onclick="PPQ.runAI()" id="ppq-ai-btn">
    <i class="fa-solid fa-brain"></i> Analyser
  </button>
  <button class="ppq-btn" onclick="PPQ.applyAllSuggestions()" id="ppq-apply-btn" style="display:none;">
    <i class="fa-solid fa-check-double"></i> Appliquer tout
  </button>
  <div class="ppq-sep"></div>
  <button class="ppq-btn danger" onclick="PPQ.resetAll()"><i class="fa-solid fa-arrow-rotate-right"></i> Reset</button>
  <input id="ppq-search" type="text" placeholder="🔍 Rechercher…" oninput="PPQ.onSearch(this.value)">
</div>

<!-- BODY -->
<div id="ppq-body">
  <!-- SIDEBAR IA -->
  <div id="ppq-sidebar">
    <div id="ppq-sidebar-inner">
      <div id="ppq-ai-loader" style="display:none;">
        <div class="ppq-ai-dots"><div class="ppq-ai-dot"></div><div class="ppq-ai-dot"></div><div class="ppq-ai-dot"></div></div>
        <div class="ppq-ai-label">Llama 3.3 analyse…</div>
        <div style="font-size:8px;color:rgba(255,255,255,.2);margin-top:4px;">Détection · Mapping · Cohérence</div>
      </div>
      <div id="ppq-dqs-ring" style="display:none;">
        <div class="ppq-ring-wrap">
          <svg viewBox="0 0 80 80"><circle class="ppq-ring-bg" cx="40" cy="40" r="36"/><circle class="ppq-ring-fill" id="ppq-ring-fill" cx="40" cy="40" r="36" stroke="#10b981" stroke-dashoffset="226"/></svg>
          <div class="ppq-ring-center"><span class="ppq-ring-val" id="ppq-dqs-val">—</span><span class="ppq-ring-lbl">DQS</span></div>
        </div>
      </div>
      <div id="ppq-ai-content"></div>
    </div>
  </div>

  <!-- TABLE + DIFF + AGENT -->
  <div style="flex:1;display:flex;flex-direction:column;min-width:0;position:relative;">
    <div id="ppq-table-wrap">
      <table id="ppq-table"><thead id="ppq-thead"></thead><tbody id="ppq-tbody"></tbody></table>
    </div>
    <!-- Diff overlay -->
    <div id="ppq-diff-view">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:900;color:#fff;">⚡ Avant / Après</div>
        <button class="ppq-btn" onclick="PPQ.closeDiff()"><i class="fa-solid fa-xmark"></i> Fermer</button>
      </div>
      <div id="ppq-diff-content"></div>
    </div>

    <!-- ════ AGENT CHAT PANEL ════ -->
    <div id="ppq-agent-panel" class="closed">
      <div id="ppq-agent-header" onclick="PPQ.toggleAgent()">
        <div id="ppq-agent-title">
          <div class="ppq-agent-dot"></div>
          <i class="fa-solid fa-terminal" style="font-size:11px;"></i>
          Agent IA · Copilot Data
          <span id="ppq-agent-badge">ACTIF</span>
        </div>
        <div id="ppq-agent-shortcuts">
          <span class="ppq-shortcut" onclick="event.stopPropagation();PPQ.agentShortcut('pivot')">⟳ Pivoter</span>
          <span class="ppq-shortcut" onclick="event.stopPropagation();PPQ.agentShortcut('clean')">✦ Nettoyer</span>
          <span class="ppq-shortcut" onclick="event.stopPropagation();PPQ.agentShortcut('map')">⇌ Mapper OHADA</span>
          <span class="ppq-shortcut" onclick="event.stopPropagation();PPQ.agentShortcut('validate')">✓ Valider</span>
          <span class="ppq-shortcut" onclick="event.stopPropagation();PPQ.agentShortcut('fix')">⚡ Tout corriger</span>
        </div>
        <i class="fa-solid fa-chevron-up" id="ppq-agent-chevron" style="color:rgba(125,211,252,.4);font-size:10px;margin-left:8px;transition:transform .3s;"></i>
      </div>
      <div id="ppq-agent-msgs"></div>
      <div id="ppq-agent-input-row">
        <input id="ppq-agent-inp" type="text" placeholder="Ex: &quot;Pivote le tableau vertical&quot; · &quot;Renomme actif circulant en actif_courant&quot; · &quot;Supprime les lignes vides&quot; · &quot;Corrige toutes les anomalies&quot;…" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();PPQ.agentSend();}">
        <button id="ppq-agent-send" onclick="PPQ.agentSend()">
          <i class="fa-solid fa-paper-plane"></i> Envoyer
        </button>
      </div>
    </div>
  </div>
</div>

<!-- FOOTER -->
<div id="ppq-footer">
  <div id="ppq-pagination"></div>
  <div id="ppq-row-info">—</div>
  <div id="ppq-launch-wrap">
    <button id="ppq-diff-btn" onclick="PPQ.showDiff()"><i class="fa-solid fa-code-compare"></i> Modifications</button>
    <button id="ppq-launch-btn" onclick="PPQ.launch()"><i class="fa-solid fa-bolt"></i> Lancer l'analyse ML</button>
  </div>
</div>
`;
  document.body.appendChild(el);

  document.addEventListener('keydown', e => {
    if (!document.getElementById('ppq-overlay')?.classList.contains('open')) return;
    if ((e.ctrlKey||e.metaKey) && e.key==='z') { e.preventDefault(); _undo(); }
    if ((e.ctrlKey||e.metaKey) && (e.key==='y'||(e.shiftKey&&e.key==='Z'))) { e.preventDefault(); _redo(); }
    if (e.key==='Escape') PPQ.close();
    // Ctrl+K = focus agent
    if ((e.ctrlKey||e.metaKey) && e.key==='k') { e.preventDefault(); PPQ.openAgent(); }
  });
  document.addEventListener('click', e => {
    if (ST.filterDD && !ST.filterDD.contains(e.target)) { ST.filterDD.remove(); ST.filterDD = null; }
  });
}



// ════════════════════════════════════════════════════════════════
//  RENDU TABLE
// ════════════════════════════════════════════════════════════════
function _filteredData() {
  let d = ST.data;
  // Recherche globale
  if (ST.searchQ) {
    const q = ST.searchQ.toLowerCase();
    d = d.filter(row => Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q)));
  }
  // Filtres colonnes
  for (const [col, vals] of Object.entries(ST.filters)) {
    if (!vals || vals.size === 0) continue;
    d = d.filter(row => vals.has(String(row[col] ?? '')));
  }
  return d;
}

function _render() {
  _renderHead();
  _renderBody();
  _renderPagination();
  _updateStats();
}

function _renderHead() {
  const thead = document.getElementById('ppq-thead');
  if (!thead) return;
  thead.innerHTML = `<tr>
    <th class="ppq-rn" style="z-index:11;">
      <div style="padding:8px;display:flex;align-items:center;justify-content:center;">
        <input type="checkbox" id="ppq-sel-all" title="Tout sélectionner"
          onchange="PPQ.selectAll(this.checked)"
          style="width:13px;height:13px;cursor:pointer;accent-color:#7DD3FC;">
      </div>
    </th>
    ${ST.columns.map((col, ci) => {
      const mapped = ST.colMap[col];
      const isCrit = mapped && CRITICAL_KEYS.has(mapped);
      const filtActive = ST.filters[col]?.size > 0;
      return `<th data-col="${_esc(col)}" style="${isCrit?'border-top:2px solid rgba(255,215,0,.35)':''}">
        <div class="ppq-th-inner">
          <div class="ppq-th-name" contenteditable="false"
            ondblclick="PPQ.startRenameCol(this,'${_esc(col)}')"
            title="Double-cliquer pour renommer">${_esc(col)}</div>
          ${mapped ? `<div class="ppq-th-mapped" title="OHADA: ${_esc(OHADA_KEYS[mapped]||mapped)}">${_esc(OHADA_KEYS[mapped]||mapped)}</div>` : ''}
          <div class="ppq-th-actions">
            <div class="ppq-th-act" onclick="PPQ.toggleFilter(event,'${_esc(col)}')" 
              title="Filtrer" style="color:${filtActive?'#FFD700':''};">
              <i class="fa-solid fa-filter" style="font-size:7px;"></i>
            </div>
            <div class="ppq-th-act" onclick="PPQ.deleteColumn('${_esc(col)}')" 
              title="Supprimer la colonne">
              <i class="fa-solid fa-trash" style="font-size:7px;"></i>
            </div>
          </div>
        </div>
      </th>`;
    }).join('')}
  </tr>`;
}

function _renderBody() {
  const tbody = document.getElementById('ppq-tbody');
  if (!tbody) return;
  const filtered = _filteredData();
  const start = ST.page * ST.pageSize;
  const slice = filtered.slice(start, start + ST.pageSize);

  tbody.innerHTML = slice.map((row, relIdx) => {
    const absIdx = ST.data.indexOf(row);
    const isSel = ST.selected.has(absIdx);
    return `<tr data-idx="${absIdx}" class="${isSel?'selected':''}" onclick="PPQ.onRowClick(event,${absIdx})">
      <td class="ppq-rn">${absIdx + 1}</td>
      ${ST.columns.map(col => {
        const val = row[col];
        const isMissing = val === null || val === undefined || val === '';
        const isAnom = ST.corrections.has(`${absIdx}-${col}`) && ST.corrections.get(`${absIdx}-${col}`).type === 'anomaly';
        const isCorrected = ST.corrections.has(`${absIdx}-${col}`) && ST.corrections.get(`${absIdx}-${col}`).type === 'fixed';
        const isModified = ST.modified.has(`${absIdx}-${col}`);
        let cls = '';
        if (isAnom) cls = 'ppq-anomaly';
        else if (isCorrected) cls = 'ppq-corrected';
        else if (isMissing) cls = 'ppq-missing';
        else if (isModified) cls = 'ppq-modified';
        const display = isMissing ? '—' : _esc(String(val));
        return `<td class="${cls}" contenteditable="true" 
          data-abs="${absIdx}" data-col="${_esc(col)}"
          onblur="PPQ.onCellEdit(this)"
          onfocus="PPQ.onCellFocus(this)"
          title="${isAnom?'⚠️ Valeur suspecte — voir panel IA':isCorrected?'✅ Corrigé par IA':''}"
          >${display}</td>`;
      }).join('')}
    </tr>`;
  }).join('');
}

function _renderPagination() {
  const filtered = _filteredData();
  const total    = filtered.length;
  const pages    = Math.ceil(total / ST.pageSize);
  const pg       = document.getElementById('ppq-pagination');
  const info     = document.getElementById('ppq-row-info');
  if (!pg) return;

  const start = ST.page * ST.pageSize + 1;
  const end   = Math.min(start + ST.pageSize - 1, total);
  if (info) info.textContent = total > 0 ? `${start}–${end} sur ${total} lignes · ${ST.columns.length} colonnes` : 'Aucune donnée';

  if (pages <= 1) { pg.innerHTML = ''; return; }

  let html = `<button class="ppq-page-btn" onclick="PPQ.goPage(${ST.page-1})" ${ST.page===0?'disabled':''}>‹</button>`;
  for (let i = 0; i < pages; i++) {
    if (pages > 8 && Math.abs(i - ST.page) > 2 && i !== 0 && i !== pages-1) {
      if (i === 1 || i === pages-2) html += `<span style="color:rgba(255,255,255,.2);padding:0 4px;">…</span>`;
      continue;
    }
    html += `<button class="ppq-page-btn ${i===ST.page?'active':''}" onclick="PPQ.goPage(${i})">${i+1}</button>`;
  }
  html += `<button class="ppq-page-btn" onclick="PPQ.goPage(${ST.page+1})" ${ST.page>=pages-1?'disabled':''}>›</button>`;
  pg.innerHTML = html;
}

function _updateStats() {
  const rows = ST.data.length;
  const cols = ST.columns.length;
  let miss = 0;
  ST.data.forEach(row => ST.columns.forEach(c => {
    if (row[c] === null || row[c] === undefined || row[c] === '') miss++;
  }));
  const el = (id, val) => { const e = document.getElementById(id); if(e) e.textContent = val; };
  el('ppq-stat-rows', `${rows} ligne${rows!==1?'s':''}`);
  el('ppq-stat-cols', `${cols} colonne${cols!==1?'s':''}`);
  el('ppq-stat-miss', miss > 0 ? `${miss} manquant${miss!==1?'s':''}` : '0 manquant');
}

// ════════════════════════════════════════════════════════════════
//  ANALYSE IA — GROQ LLAMA
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════
//  AGENT ENGINE — Inspection structurelle + LLM + Chat Agent Agentique
// ════════════════════════════════════════════════════════════════════════

// ─── Constantes ────────────────────────────────────────────────────────
const _NUM = v => { const n=Number(String(v??'').replace(/[\s\u00a0,]/g,'').replace(',','.')); return isFinite(n)&&String(v??'').trim()!==''?n:null; };

const SYNO = {
  actif_total:['actif total','total actif','total assets','bilan total','total du bilan','somme actif'],
  actif_courant:['actif courant','actif circulant','current assets','actif court terme','circulant'],
  actif_immobilise:['actif immobilise','immobilisations','actifs fixes','fixed assets','actif fixe'],
  tresorerie:['tresorerie','disponibilites','cash','banques','liquidites','caisse','disponible'],
  stocks:['stocks','stock','inventaire','inventory','en cours','marchandises','matieres'],
  creances_clients:['creances clients','creances','clients','accounts receivable','debiteurs'],
  capitaux_propres:['capitaux propres','cp','fonds propres','equity','actif net','net assets','situation nette'],
  dettes_lt:['dettes lt','dettes long terme','long term debt','dlt','emprunts lt'],
  passif_courant:['passif courant','dettes ct','dettes court terme','current liabilities','dct'],
  dettes_totales:['dettes totales','total dettes','total liabilities','passif total','total debt'],
  dettes_fournisseurs:['dettes fournisseurs','fournisseurs','accounts payable','creditors'],
  resultats_reportes:['resultats reportes','report a nouveau','retained earnings','benefices cumules'],
  chiffre_affaires:['chiffre affaires','ca','ca net','revenue','sales','turnover','ventes'],
  marge_brute:['marge brute','gross profit','mb','valeur ajoutee','va','marge commerciale'],
  ebitda:['ebitda','ebe','excedent brut','gross operating','operating cashflow'],
  resultat_exploitation:['resultat exploitation','ebit','operating income','re'],
  resultat_net:['resultat net','benefice net','perte nette','net income','net profit','profit net'],
  charges_financieres:['charges financieres','frais financiers','interest expense','interets'],
  impots:['impots','taxes','is','tax','income tax','impot societes'],
  annees_activite:['annees activite','anciennete','age','age entreprise','duree activite'],
  nom:['nom','entreprise','company','societe','raison sociale','name'],
  secteur:['secteur','secteur activite','sector','industry','activite'],
  pays:['pays','country','nation'],
};

// ─── Inspection structurelle (instantanée, avant tout LLM) ─────────────
function _inspect() {
  const cols=ST.columns, rows=ST.data, n=rows.length;
  const cl=cols.map(c=>c.toLowerCase().replace(/[\s_\-.()]/g,''));

  const cIdx = cl.findIndex(c=>['champ','poste','libelle','designation','compte','description','intitule'].some(k=>c.includes(k)));
  const vIdx = cl.findIndex(c=>['valeur','montant','value','amount','solde'].some(k=>c.includes(k)));
  const isV  = cIdx>=0 && vIdx>=0;
  const ghosts = cols.filter(c=>/^(__empty|unnamed)/i.test(c));

  let fhdr=false;
  if(n>0){const fv=Object.values(rows[0]).filter(v=>v!=null&&v!=='');const sc=fv.filter(v=>_NUM(v)===null&&String(v).trim().length>2).length;fhdr=sc>=Math.ceil(cols.length*0.5)&&sc>=3;}

  const yearC=cols.filter(c=>/\b(20\d{2}|19\d{2}|n-?\d|exercice|annee|year)\b/i.test(c));

  // Stats colonnes
  const cstats={};
  cols.forEach(col=>{
    const vals=rows.map(r=>r[col]).filter(v=>v!=null&&v!=='');
    const nums=vals.map(_NUM).filter(v=>v!==null);
    cstats[col]={count:vals.length,miss:n-vals.length,numDom:nums.length>vals.length*0.5,min:nums.length?Math.min(...nums):null,max:nums.length?Math.max(...nums):null,hasNeg:nums.some(v=>v<0),sample:vals.slice(0,3).map(String)};
  });

  // Mapping colonnes (score)
  const cmap={},cscore={};
  cols.forEach((col,i)=>{
    const lc=cl[i]; let best=null,bs=0;
    for(const [k,syns] of Object.entries(SYNO)){
      let sc=0;
      for(const s of syns){const sn=s.replace(/\s/g,'');if(lc===sn)sc=Math.max(sc,100);else if(lc.includes(sn)||sn.includes(lc))sc=Math.max(sc,sn.length*1.8);else{const w1=lc.split(/[_\s]/),w2=sn.split(/[_\s]/);const ov=w1.filter(w=>w.length>2&&w2.some(x=>x.includes(w)||w.includes(x))).length;if(ov>0)sc=Math.max(sc,ov*12);}}
      if(sc>bs){bs=sc;best=k;}
    }
    cmap[col]=bs>=10?best:null; cscore[col]=bs;
  });

  // Mapping vertical (si format Champ/Valeur)
  const vmap={};
  if(isV){
    const cc=cols[cIdx];
    rows.forEach(row=>{
      const cv=String(row[cc]||'').trim(); if(!cv||cv.startsWith('#')||cv.startsWith('-'))return;
      const lv=cv.toLowerCase().replace(/[\s_\-.]/g,''); let best=null,bs=0;
      for(const [k,syns] of Object.entries(SYNO)){for(const s of syns){const sn=s.replace(/\s/g,'');let sc=0;if(lv===sn)sc=100;else if(lv.includes(sn)||sn.includes(lv))sc=sn.length*1.5;else{const w1=lv.split(/[_\s]/),w2=sn.split(/[_\s]/);const ov=w1.filter(w=>w.length>2&&w2.some(x=>x.includes(w)||w.includes(x))).length;if(ov>0)sc=ov*10;}if(sc>bs){bs=sc;best=k;}}}
      if(bs>=10)vmap[cv]=best;
    });
  }

  // Incohérences comptables
  const fv2={};
  if(!isV){cols.forEach(col=>{const k=cmap[col];if(!k)return;const r=rows.find(r=>_NUM(r[col])!==null);if(r)fv2[k]=_NUM(r[col]);});}
  else{const cc=cols[cIdx],vc=cols[vIdx];rows.forEach(row=>{const k=vmap[String(row[cc]||'').trim()];if(k&&_NUM(row[vc])!==null)fv2[k]=_NUM(row[vc]);});}
  const inco=_accountingCheck(fv2);

  const mapped=new Set(isV?Object.values(vmap):Object.values(cmap).filter(Boolean));
  const mCrit=[...CRITICAL_KEYS].filter(k=>!mapped.has(k));
  const mImp=[...new Set(['tresorerie','dettes_totales','resultat_exploitation','ebitda','charges_financieres','marge_brute'])].filter(k=>!mapped.has(k));

  let miss=0,tot=0;rows.forEach(r=>cols.forEach(c=>{tot++;if(r[c]===null||r[c]===undefined||r[c]==='')miss++;}));
  const comp=tot>0?Math.round((1-miss/tot)*100):50;
  const cm=CRITICAL_KEYS.size-mCrit.length,im=6-mImp.length;
  const dqs=Math.round(comp*.25+((cm/CRITICAL_KEYS.size)*.45+(im/6)*.15)*100+(isV||!ghosts.length?90:60)*.15);

  const allStr=rows.flatMap(r=>cols.map(c=>String(r[c]||''))).join(' ').toLowerCase();
  const pays=allStr.includes('cameroun')||allStr.includes('cameroon')?'Cameroun':allStr.includes('senegal')?'Sénégal':allStr.includes('abidjan')?"Côte d'Ivoire":allStr.includes('mali')?'Mali':allStr.includes('burkina')?'Burkina Faso':null;
  const devise=allStr.includes('fcfa')||allStr.includes('xaf')?'FCFA':allStr.includes('eur')?'EUR':allStr.includes('usd')?'USD':'FCFA';

  let ent=null;
  const ni=cols.findIndex((_,i)=>SYNO.nom&&SYNO.nom.some(s=>cl[i].includes(s.replace(/\s/g,''))));
  if(ni>=0&&rows[0])ent=String(rows[0][cols[ni]]||'').trim()||null;
  if(!ent&&isV){const cc=cols[cIdx];const nr=rows.find(r=>SYNO.nom&&SYNO.nom.some(s=>String(r[cc]||'').toLowerCase().replace(/\s/g,'').includes(s.replace(/\s/g,''))));if(nr)ent=String(nr[cols[vIdx]]||'').trim()||null;}
  if(!ent&&ST.filename)ent=ST.filename.replace(/\.(csv|xlsx?|ods|json)$/i,'').replace(/^DS-\d+-?/i,'').replace(/[_-]/g,' ').trim()||null;

  return {isV,cIdx,vIdx,ghosts,fhdr,yearC,isMulti:yearC.length>=2,cmap,cscore,vmap,cstats,n,nc:cols.length,inco,mCrit,mImp,mapped,dqs,comp,pays,devise,ent,fv2,fmt:isV?'vertical':ghosts.length?'ghost_cols':yearC.length>=2?'multi_period':fhdr?'header_in_row1':'tabular'};
}

function _accountingCheck(v){
  const ic=[],g=k=>typeof v[k]==='number'?v[k]:null,T=0.02;
  const at=g('actif_total'),ac=g('actif_courant'),ai=g('actif_immobilise');
  const cp=g('capitaux_propres'),dt=g('dettes_totales'),pc=g('passif_courant'),dlt=g('dettes_lt');
  const ca=g('chiffre_affaires'),rn=g('resultat_net'),mb=g('marge_brute');
  if(at&&cp&&dt&&Math.abs((cp+dt-at)/at)>T)ic.push({type:'bilan_desequilibre',desc:`Actif(${at}) ≠ CP+D(${(cp+dt).toFixed(0)}) écart ${((cp+dt-at)/at*100).toFixed(1)}%`,champ:'actif_total',sev:'critique'});
  if(at&&ac&&ai&&Math.abs((ac+ai-at)/at)>T)ic.push({type:'actif_incoherent',desc:`AT(${at}) ≠ AC+AI(${(ac+ai).toFixed(0)})`,champ:'actif_total',sev:'important'});
  if(rn&&ca&&rn>ca*1.1)ic.push({type:'resultat_superieur_ca',desc:`RN(${rn}) > CA(${ca}) — impossible`,champ:'resultat_net',sev:'critique'});
  if(mb&&ca&&mb>ca)ic.push({type:'marge_superieure_ca',desc:`Marge(${mb}) > CA(${ca})`,champ:'marge_brute',sev:'important'});
  if(cp&&cp<0)ic.push({type:'fonds_propres_negatifs',desc:`CP négatifs(${cp})`,champ:'capitaux_propres',sev:'important'});
  return ic;
}

// ─── Pivot vertical → tabulaire (VRAI pivot, pas juste mapper) ──────────
function _executePivot() {
  const s=_inspect();
  if(!s.isV){return {ok:false,msg:'Format non vertical détecté'};}
  const cc=ST.columns[s.cIdx], vc=ST.columns[s.vIdx];
  if(!cc||!vc)return {ok:false,msg:'Colonnes Champ/Valeur introuvables'};

  const metaCols=ST.columns.filter((_,i)=>i!==s.cIdx&&i!==s.vIdx);
  const pivoted={};

  // Méta depuis la première ligne (pays, secteur, etc.)
  if(ST.data[0])metaCols.forEach(c=>{const v=ST.data[0][c];if(v!=null&&v!=='')pivoted[ST.colMap[c]||c]=v;});

  // Pivoter chaque ligne Champ→Valeur
  const mapped_rows=[], unmapped_rows=[];
  ST.data.forEach(row=>{
    const champ=String(row[cc]||'').trim();
    if(!champ||champ.startsWith('#')||champ.startsWith('-'))return;
    const k=s.vmap[champ]||(ST._vertMap||{})[champ]||null;
    const fk=k||champ.toLowerCase().replace(/[^a-z0-9]/g,'_').replace(/_+/g,'_');
    const v=row[vc];
    if(v!=null&&v!==''){const n=_NUM(v);pivoted[fk]=n!==null?n:v;if(k)mapped_rows.push(champ);else unmapped_rows.push(champ);}
  });

  _snapshot();
  ST.data=[pivoted];
  ST.columns=Object.keys(pivoted);
  ST.colMap={};
  ST.columns.forEach(col=>{if(OHADA_KEYS[col])ST.colMap[col]=col;});
  ST._vertMap={};
  _render();
  return {ok:true,mapped:mapped_rows.length,unmapped:unmapped_rows,total:Object.keys(pivoted).length};
}

// ════════════════════════════════════════════════════════════════════════
//  ANALYSE IA — Pipeline complet
// ════════════════════════════════════════════════════════════════════════
async function _runAIAnalysis() {
  const loader=document.getElementById('ppq-ai-loader'),ring=document.getElementById('ppq-dqs-ring'),btn=document.getElementById('ppq-ai-btn');
  if(loader)loader.style.display='flex';
  if(ring)ring.style.display='none';
  if(btn){btn.innerHTML='<i class="fa-solid fa-circle-notch fa-spin"></i>';btn.disabled=true;}

  const s=_inspect();
  ST._lastStruct=s;

  // Appliquer mapping local
  ST.colMap={};
  if(!s.isV)for(const[col,k] of Object.entries(s.cmap)){if(k&&OHADA_KEYS[k])ST.colMap[col]=k;}
  ST._vertMap=s.vmap||{};

  // Pré-rendu local
  const loc=_buildLocalResult(s);
  ST.aiResult=loc;
  _applyAIMapping(loc);
  _renderAISidebar(loc,true);

  // LLM
  try{
    const rows=ST.data,cols=ST.columns;
    let dc;
    if(rows.length<=100)dc={mode:'complet',data:rows};
    else{const step=Math.floor(rows.length/15),sa=[];for(let i=0;i<rows.length;i+=step)sa.push(rows[i]);dc={mode:'echantillon',total:rows.length,data:sa,first10:rows.slice(0,10),last5:rows.slice(-5)};}

    const prompt=`Expert-comptable OHADA. Analyse ce fichier financier, retourne UNIQUEMENT ce JSON :

STRUCTURE LOCAL:${JSON.stringify({format:s.fmt,isV:s.isV,col_champ:s.isV?cols[s.cIdx]:null,col_valeur:s.isV?cols[s.vIdx]:null,vmap:s.vmap,cmap:s.cmap,inco:s.inco,mCrit:s.mCrit,dqs:s.dqs})}
COLONNES:${JSON.stringify(cols)}
STATS:${JSON.stringify(s.cstats)}
DONNEES(${dc.mode}):${JSON.stringify(dc)}

JSON EXACT:{"pays":"p","pays_c":"h|m|l","secteur":"s","secteur_c":"h|m|l","devise":"FCFA|EUR|USD","exercice":2023,"entreprise":"nom","dqs":75,"dqs_detail":{"completude":80,"coherence":70,"fiabilite":75,"note":"n"},"structure":{"format":"vertical|tabular|multi_period|mixed","explication":"1 phrase","pivot_possible":true},"mapping":{"col":"cle|null"},"mapping_vertical":{"val":"cle"},"anomalies":[{"ligne":2,"colonne":"c","val":"v","prob":"p","sugg":null,"impact":"critique|important|mineur"}],"incoherences":[{"type":"t","desc":"d","champ":"c","sev":"critique|important"}],"manquants_crit":[],"manquants_imp":[],"ameliorations":[{"lvl":"err|warn|info|ok","cat":"structure|valeur|coherence|completude","msg":"m","action":"a|null"}],"synthese":"3 phrases."}
REGLE: Format vertical=NE PAS déclarer champs OHADA manquants,utilise mapping_vertical. JSON pur.`;

    const {getAuthToken}=await import('./firebase-auth.js').catch(()=>({getAuthToken:async()=>null}));
    const tok=await getAuthToken().catch(()=>null);
    const res=await fetch(`${_API}/chat`,{method:'POST',headers:{'Content-Type':'application/json',...(tok?{'Authorization':`Bearer ${tok}`}:{})},body:JSON.stringify({message:prompt,history:[],userId:window.S?.user?.uid||'anon',mode:'auto',model:'llama-3.3-70b-versatile'}),signal:AbortSignal.timeout(40000)});
    if(!res.ok)throw new Error(`HTTP ${res.status}`);
    const d=await res.json();
    const raw=d.message||d.content||'';
    
    // Parser le JSON LLM avec robustesse
    let llm=null;
    const jsonBlocks = raw.match(/\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}/g);
    if(jsonBlocks && jsonBlocks.length > 0){
      for(let i = jsonBlocks.length - 1; i >= 0; i--){
        try {
          const parsed = JSON.parse(jsonBlocks[i].replace(/,(\s*[}\]])/g,'$1').replace(/[\x00-\x1f\x7f]/g,' '));
          if(parsed.dqs || parsed.structure) {
            llm = parsed;
            break;
          }
        } catch(e) {}
      }
    }
    if(!llm) throw new Error('Format JSON invalide reçu du serveur');

    const fin={...loc,...llm};
    const aa=[...(loc.anomalies||[])];(llm.anomalies||[]).forEach(la=>{if(!aa.some(a=>a.ligne===la.ligne&&a.colonne===la.colonne))aa.push(la);});fin.anomalies=aa;
    const ii=[...(loc.incoherences||[])];(llm.incoherences||[]).forEach(li=>{if(!ii.some(i=>i.type===li.type))ii.push(li);});fin.incoherences=ii;
    fin.mapping_vertical={...s.vmap,...(llm.mapping_vertical||{})};
    ST._vertMap=fin.mapping_vertical;
    ST.aiResult=fin;
    _applyAIMapping(fin);
    _renderAISidebar(fin,false);
    const an=fin.anomalies?.length||0,ic=fin.incoherences?.length||0;
    _toast(`🧠 DQS ${fin.dqs}/100 · ${an} anomalie${an!==1?'s':''} · ${ic} incohérence${ic!==1?'s':''}`,fin.dqs>=70?'ok':fin.dqs>=40?'warn':'err',4500);
  }catch(err){
    console.warn('[AI]',err.message);
    _renderAISidebar(loc,false);
    _toast(`Analyse locale (${err.message.includes('HTTP')?'erreur serveur':'Groq indisponible'})`,'warn');
  }
  if(loader)loader.style.display='none';
  if(btn){btn.innerHTML='<i class="fa-solid fa-brain"></i> Analyser';btn.disabled=false;}
  document.getElementById('ppq-apply-btn')?.style.setProperty('display','inline-flex');
}

function _buildLocalResult(s){
  return {
    pays:s.pays||'Cameroun',pays_c:'m',secteur:null,secteur_c:'l',devise:s.devise,exercice:new Date().getFullYear(),entreprise:s.ent,
    dqs:s.dqs,dqs_detail:{completude:s.comp,coherence:70,fiabilite:65,note:'Analyse locale'},
    structure:{format:s.fmt,explication:s.isV?'Format vertical OHADA — postes en lignes':s.ghosts.length?'Colonnes fantômes détectées':s.fhdr?'1ère ligne = en-têtes probable':s.isMulti?'Multi-périodes':'Format tabulaire',pivot_possible:s.isV},
    mapping:s.cmap,mapping_vertical:s.vmap,
    anomalies:[],incoherences:s.inco,
    manquants_crit:s.isV?[]:s.mCrit,manquants_imp:s.isV?[]:s.mImp,
    ameliorations:[...(s.isV?[{lvl:'ok',cat:'structure',msg:'Format vertical — tapez "pivot" dans le chat agent',action:'Demandez à l\'agent : "Pivote le tableau"'}]:[]),...(s.ghosts.length?[{lvl:'warn',cat:'structure',msg:`${s.ghosts.length} colonne(s) fantôme(s)`,action:'Demandez à l\'agent : "Supprime les colonnes vides"'}]:[]),{lvl:'info',cat:'completude',msg:'Tapez une instruction dans le chat agent',action:null}],
    synthese:`${s.n} lignes × ${s.nc} col · ${s.fmt} · DQS ${s.dqs}/100 · ${[...s.mapped].length} champs mappés · Agent actif (Ctrl+K)`,
  };
}

function _localAnalysis(){return _buildLocalResult(_inspect());}

// ─── Rendu sidebar enrichi ─────────────────────────────────────────────
function _renderAISidebar(r,isPreview){
  const content=document.getElementById('ppq-ai-content'),ring=document.getElementById('ppq-dqs-ring');
  if(!content)return;
  if(ring){
    ring.style.display='flex';
    const dqs=r.dqs||0,off=226-(dqs/100)*226,col=dqs>=70?'#10b981':dqs>=40?'#f59e0b':'#ef4444';
    const fe=document.getElementById('ppq-ring-fill'),ve=document.getElementById('ppq-dqs-val');
    if(fe){fe.style.strokeDashoffset=off;fe.style.stroke=col;}
    if(ve){ve.textContent=dqs;ve.style.color=col;}
  }
  let h='';
  if(isPreview)h+=`<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;padding:5px 9px;border-radius:6px;background:rgba(125,211,252,.05);border:1px solid rgba(125,211,252,.12);font-family:'Syne',sans-serif;font-size:7.5px;font-weight:800;color:rgba(125,211,252,.6);"><i class="fa-solid fa-circle-notch fa-spin" style="font-size:8px;"></i>Llama analyse…</div>`;
  if(r.synthese)h+=`<div class="ppq-section"><div style="font-size:8.5px;color:rgba(255,255,255,.5);line-height:1.6;font-style:italic;padding:8px 10px;background:rgba(255,255,255,.025);border-radius:7px;border:1px solid rgba(255,255,255,.06);">${_esc(r.synthese)}</div></div>`;

  // Agent CTA
  h+=`<div class="ppq-section"><div style="padding:9px 11px;border-radius:9px;background:rgba(125,211,252,.05);border:1px solid rgba(125,211,252,.15);cursor:pointer;" onclick="PPQ.openAgent()">
    <div style="font-family:'Syne',sans-serif;font-size:9px;font-weight:800;color:#7DD3FC;margin-bottom:4px;display:flex;align-items:center;gap:6px;"><i class="fa-solid fa-terminal"></i>Agent IA — Copilot Data <span style="font-size:7px;padding:1px 5px;background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.25);color:#10b981;border-radius:3px;">ACTIF</span></div>
    <div style="font-size:8px;color:rgba(255,255,255,.4);line-height:1.5;">Dites à l'agent quoi faire : <em style="color:rgba(125,211,252,.6);">"Pivote le tableau"</em>, <em style="color:rgba(125,211,252,.6);">"Corrige toutes les anomalies"</em>, <em style="color:rgba(125,211,252,.6);">"Renomme actif circulant"</em>…</div>
    <div style="margin-top:6px;font-size:7.5px;color:rgba(255,255,255,.25);">Ctrl+K pour ouvrir · L'agent voit le tableau en temps réel</div>
  </div></div>`;

  // Structure
  if(r.structure){
    const fmt=r.structure.format||'tabular';
    const fc={vertical:'125,211,252',tabular:'16,185,129',multi_period:'139,92,246',ghost_cols:'245,158,11',header_in_row1:'245,158,11'};
    const fc2={vertical:'#7DD3FC',tabular:'#10b981',multi_period:'#8B5CF6',ghost_cols:'#f59e0b',header_in_row1:'#f59e0b'};
    const c=fc[fmt]||'125,211,252',c2=fc2[fmt]||'#7DD3FC';
    h+=`<div class="ppq-section"><div class="ppq-section-title"><i class="fa-solid fa-diagram-project"></i>Structure</div>
    <div style="padding:8px 10px;border-radius:8px;background:rgba(${c},.05);border:1px solid rgba(${c},.18);">
      <div style="font-family:'Syne',sans-serif;font-size:10px;font-weight:800;color:${c2};margin-bottom:3px;">${fmt.replace(/_/g,' ').replace(/\b\w/g,x=>x.toUpperCase())}</div>
      <div style="font-size:8px;color:rgba(255,255,255,.4);">${_esc(r.structure.explication||'')}</div>
      ${r.structure.pivot_possible?`<button onclick="PPQ.agentShortcut('pivot')" style="margin-top:6px;padding:4px 10px;border-radius:5px;background:rgba(125,211,252,.1);border:1px solid rgba(125,211,252,.25);color:#7DD3FC;font-family:'Syne',sans-serif;font-size:8px;font-weight:800;cursor:pointer;"><i class="fa-solid fa-rotate"></i> Pivoter maintenant</button>`:''}
    </div></div>`;
  }

  // Méta
  const metas=[{l:'Pays',v:r.pays,c:r.pays_c},{l:'Secteur',v:r.secteur,c:r.secteur_c},{l:'Devise',v:r.devise,c:'m'},{l:'Exercice',v:r.exercice,c:'m'},{l:'Entreprise',v:r.entreprise,c:'m'}].filter(m=>m.v);
  if(metas.length)h+=`<div class="ppq-section"><div class="ppq-section-title"><i class="fa-solid fa-globe"></i>Détection</div>${metas.map(m=>`<div class="ppq-meta-row"><span class="ppq-meta-lbl">${m.l}</span><div style="display:flex;align-items:center;gap:4px;"><span class="ppq-meta-val">${_esc(String(m.v))}</span><span class="ppq-meta-conf ${m.c==='h'?'ppq-meta-high':m.c==='m'?'ppq-meta-med':'ppq-meta-low'}">${m.c==='h'?'✓ Sûr':m.c==='m'?'~ Probable':'? Estimé'}</span></div></div>`).join('')}</div>`;

  // Champs critiques
  const mc=r.manquants_crit||[];
  if(mc.length)h+=`<div class="ppq-section"><div class="ppq-section-title"><i class="fa-solid fa-triangle-exclamation" style="color:#ef4444;"></i>Critiques absents (${mc.length})</div>
    ${mc.map(k=>`<div class="ppq-val-card urgent"><div class="ppq-val-card-title"><i class="fa-solid fa-circle-xmark" style="color:#ef4444;font-size:10px;"></i>${_esc(OHADA_KEYS[k]||k)}</div><div class="ppq-val-btns"><button class="ppq-vbtn ppq-vbtn-ok" onclick="PPQ.addMissingCol('${k}')"><i class="fa-solid fa-plus"></i> Ajouter</button><button class="ppq-vbtn ppq-vbtn-skip" onclick="PPQ.agentAsk('Estime la valeur de ${OHADA_KEYS[k]||k} pour cette entreprise basé sur les autres données disponibles')">🧠 Estimer</button></div></div>`).join('')}</div>`;

  // Incohérences
  const inc=r.incoherences||[];
  if(inc.length)h+=`<div class="ppq-section"><div class="ppq-section-title"><i class="fa-solid fa-calculator" style="color:#f97316;"></i>Incohérences (${inc.length})</div>
    ${inc.map((ic,i)=>`<div class="ppq-val-card" style="border-color:rgba(249,115,22,.22);" id="ppq-inco-${i}"><div class="ppq-val-card-title" style="color:#f97316;">${_esc((ic.type||'').replace(/_/g,' '))} ${ic.sev==='critique'?'🔴':''}</div><div class="ppq-val-card-body">${_esc(ic.desc||'')}</div><div class="ppq-val-btns"><button class="ppq-vbtn ppq-vbtn-edit" onclick="PPQ.agentAsk('Analyse et corrige l\'incohérence comptable : ${_esc(ic.desc).replace(/'/g,'&#39;')}')">🧠 Demander à l'agent</button></div></div>`).join('')}</div>`;

  // Anomalies
  const anoms=r.anomalies||[];
  if(anoms.length)h+=`<div class="ppq-section"><div class="ppq-section-title"><i class="fa-solid fa-bug" style="color:#f59e0b;"></i>${anoms.length} anomalie${anoms.length>1?'s':''}</div>
    ${anoms.slice(0,8).map((a,i)=>`<div class="ppq-val-card ${a.impact==='critique'?'urgent':'suggestion'}" id="ppq-anom-${i}">
      <div class="ppq-val-card-title"><i class="fa-solid fa-triangle-exclamation" style="color:${a.impact==='critique'?'#ef4444':'#f59e0b'};font-size:9px;"></i>L.${a.ligne||'?'} · <code style="font-family:'JetBrains Mono',monospace;font-size:8px;">${_esc(a.colonne||'')}</code></div>
      <div class="ppq-val-card-body">${_esc(a.prob||'')}${a.sugg!=null?`<br><strong>→ ${_esc(String(a.sugg))}</strong>`:''}</div>
      <div class="ppq-val-btns">
        ${a.sugg!=null?`<button class="ppq-vbtn ppq-vbtn-ok" onclick="PPQ.applyCorrection(${(a.ligne||1)-1},'${_esc(a.colonne||'')}',${JSON.stringify(a.sugg)},${i})"><i class="fa-solid fa-check"></i> Appliquer</button>`:''}
        <button class="ppq-vbtn ppq-vbtn-edit" onclick="PPQ.focusCell(${(a.ligne||1)-1},'${_esc(a.colonne||'')}')"><i class="fa-solid fa-pen"></i></button>
        <button class="ppq-vbtn ppq-vbtn-skip" onclick="document.getElementById('ppq-anom-${i}').style.opacity='.25'">Ignorer</button>
      </div>
    </div>`).join('')}</div>`;

  // DQS détail
  if(r.dqs_detail){const dd=r.dqs_detail;const bars=[{l:'Complétude',v:dd.completude},{l:'Cohérence',v:dd.coherence},{l:'Fiabilité',v:dd.fiabilite}].filter(x=>x.v!==undefined);
  h+=`<div class="ppq-section"><div class="ppq-section-title"><i class="fa-solid fa-chart-bar"></i>Qualité</div>${bars.map(b=>{const c=b.v>=70?'#10b981':b.v>=40?'#f59e0b':'#ef4444';return `<div style="margin-bottom:6px;"><div style="display:flex;justify-content:space-between;font-size:8px;margin-bottom:2px;"><span style="color:rgba(255,255,255,.4);">${b.l}</span><span style="color:${c};font-weight:800;">${b.v}/100</span></div><div style="height:3px;background:rgba(255,255,255,.05);border-radius:2px;"><div style="height:100%;width:${b.v}%;background:${c};border-radius:2px;transition:width .8s ease;"></div></div></div>`;}).join('')}</div>`;}

  // Améliorations
  const am=r.ameliorations||[];
  if(am.length){const lc={err:'#ef4444',warn:'#f59e0b',info:'rgba(125,211,252,.7)',ok:'#10b981'},cc={err:'urgent',warn:'suggestion',info:'info',ok:'info'};
  h+=`<div class="ppq-section"><div class="ppq-section-title"><i class="fa-solid fa-lightbulb"></i>Recommandations</div>${am.map(a=>`<div class="ppq-val-card ${cc[a.lvl]||'suggestion'}" style="border-left:3px solid ${lc[a.lvl]||'#7DD3FC'};">${a.cat?`<div style="font-size:7px;color:${lc[a.lvl]};font-family:'Syne',sans-serif;font-weight:900;letter-spacing:.08em;text-transform:uppercase;margin-bottom:3px;">${_esc(a.cat)}</div>`:''}<div class="ppq-val-card-body">${_esc(a.msg||'')}${a.action?`<br><span style="color:rgba(255,255,255,.35);font-size:7.5px;cursor:pointer;" onclick="PPQ.agentAsk('${_esc(a.action).replace(/'/g,'&#39;')}')">→ ${_esc(a.action)} <span style="color:rgba(125,211,252,.5);">[demander à l'agent]</span></span>`:''}</div></div>`).join('')}</div>`;}

  // Mapping
  const maps=[...Object.entries(ST.colMap||{}),...Object.entries(ST._vertMap||r.mapping_vertical||{})];
  if(maps.length)h+=`<div class="ppq-section"><div class="ppq-section-title"><i class="fa-solid fa-arrows-left-right"></i>Mapping OHADA (${maps.length})</div>${maps.map(([o,k])=>`<div class="ppq-col-map"><div class="ppq-col-orig" title="${_esc(o)}">${_esc(o)}</div><div class="ppq-col-arrow">→</div><div class="ppq-col-target">${_esc(OHADA_KEYS[k]||k)}</div><div class="ppq-col-status">${CRITICAL_KEYS.has(k)?'⭐':'✅'}</div></div>`).join('')}</div>`;

  content.innerHTML=h||'<div style="padding:14px;font-size:9px;color:rgba(255,255,255,.3);text-align:center;">Cliquez sur <strong style="color:#FFD700;">Analyser</strong> ou utilisez le chat agent</div>';
}

// ════════════════════════════════════════════════════════════════════════
//  AGENT AGENTIQUE — Chat avec outils réels sur le tableau
// ════════════════════════════════════════════════════════════════════════
const AGENT_TOOLS = {
  // ── Outil : Inspecter la structure ─────────────────────────────
  inspect_structure() {
    const s=_inspect();
    return {format:s.fmt,lignes:s.n,colonnes:s.nc,vertical:s.isV,col_champ:s.isV?ST.columns[s.cIdx]:null,col_valeur:s.isV?ST.columns[s.vIdx]:null,colonnes_fantomes:s.ghosts,premiere_ligne_entete:s.fhdr,mapping_detecte:s.cmap,mapping_vertical_detecte:s.vmap,champs_critiques_absents:s.mCrit,incoherences_comptables:s.inco,dqs:s.dqs,completude:s.comp+'%',devise:s.devise,pays:s.pays,entreprise:s.ent};
  },

  // ── Outil : Lire les données complètes ─────────────────────────
  read_data({limit=50,offset=0}={}) {
    const d=ST.data.slice(offset,offset+limit);
    return {total:ST.data.length,returned:d.length,offset,colonnes:ST.columns,data:d};
  },

  // ── Outil : Pivoter le tableau vertical ────────────────────────
  pivot_vertical() {
    const r=_executePivot();
    if(r.ok){if(ST.aiResult)_renderAISidebar(ST.aiResult,false);}
    return r;
  },

  // ── Outil : Renommer une colonne ─────────────────────────────
  rename_column({from, to}) {
    if(!from||!to)return{ok:false,msg:'Paramètres manquants'};
    const exact=ST.columns.find(c=>c===from);
    const fuzzy=!exact&&ST.columns.find(c=>c.toLowerCase().includes(from.toLowerCase())||from.toLowerCase().includes(c.toLowerCase()));
    const col=exact||fuzzy;
    if(!col)return{ok:false,msg:`Colonne "${from}" introuvable. Colonnes disponibles: ${ST.columns.join(', ')}`};
    if(ST.columns.includes(to))return{ok:false,msg:`"${to}" existe déjà`};
    _snapshot();
    const i=ST.columns.indexOf(col); ST.columns[i]=to;
    ST.data.forEach(r=>{r[to]=r[col];delete r[col];});
    if(ST.colMap[col]){ST.colMap[to]=ST.colMap[col];delete ST.colMap[col];}
    _render();
    return {ok:true,msg:`"${col}" renommée → "${to}"`};
  },

  // ── Outil : Mapper une colonne vers OHADA ─────────────────────
  map_column({column, ohada_key}) {
    if(!column||!ohada_key)return{ok:false,msg:'Paramètres manquants'};
    const col=ST.columns.find(c=>c.toLowerCase().includes(column.toLowerCase())||column.toLowerCase().includes(c.toLowerCase()));
    if(!col)return{ok:false,msg:`Colonne "${column}" introuvable`};
    if(!OHADA_KEYS[ohada_key])return{ok:false,msg:`Clé OHADA "${ohada_key}" inconnue. Clés valides: ${Object.keys(OHADA_KEYS).join(', ')}`};
    ST.colMap[col]=ohada_key;
    _renderHead();
    return {ok:true,msg:`"${col}" mappée → ${OHADA_KEYS[ohada_key]} (${ohada_key})`};
  },

  // ── Outil : Corriger une cellule ──────────────────────────────
  set_cell({row, column, value}) {
    if(row===undefined||!column||value===undefined)return{ok:false,msg:'Paramètres manquants (row, column, value)'};
    const ri=typeof row==='number'?row-1:row;
    if(ri<0||ri>=ST.data.length)return{ok:false,msg:`Ligne ${row} hors limites (1-${ST.data.length})`};
    const col=ST.columns.find(c=>c===column||c.toLowerCase().includes(column.toLowerCase()));
    if(!col)return{ok:false,msg:`Colonne "${column}" introuvable`};
    _snapshot();
    const nv=_NUM(value);
    ST.data[ri][col]=nv!==null?nv:(value===''||value===null?null:value);
    ST.modified.add(`${ri}-${col}`);
    _renderBody();
    return {ok:true,msg:`Cellule L${ri+1}/${col} = ${ST.data[ri][col]}`};
  },

  // ── Outil : Corriger toutes les anomalies ─────────────────────
  fix_all_anomalies() {
    const anoms=(ST.aiResult?.anomalies||[]).filter(a=>a.sugg!=null);
    if(!anoms.length)return{ok:false,msg:'Aucune anomalie avec suggestion disponible'};
    _snapshot();
    let fixed=0;
    anoms.forEach(a=>{
      const ri=(a.ligne||1)-1;
      const col=a.colonne;
      if(ri>=0&&ri<ST.data.length&&col){
        const nv=_NUM(a.sugg);ST.data[ri][col]=nv!==null?nv:a.sugg;
        ST.corrections.set(`${ri}-${col}`,{type:'fixed',value:a.sugg});ST.modified.add(`${ri}-${col}`);fixed++;
      }
    });
    _render();
    return {ok:true,msg:`${fixed} anomalie${fixed>1?'s':''} corrigée${fixed>1?'s':''}`,count:fixed};
  },

  // ── Outil : Supprimer les lignes vides ───────────────────────
  delete_empty_rows() {
    const before=ST.data.length;
    _snapshot();
    ST.data=ST.data.filter(r=>!ST.columns.every(c=>r[c]===null||r[c]===undefined||r[c]===''));
    const removed=before-ST.data.length;
    ST.page=Math.min(ST.page,Math.max(0,Math.ceil(ST.data.length/ST.pageSize)-1));
    _render();
    return {ok:true,msg:`${removed} ligne${removed>1?'s':''} vide${removed>1?'s':''} supprimée${removed>1?'s':''}`,removed};
  },

  // ── Outil : Supprimer les colonnes fantômes ──────────────────
  delete_ghost_columns() {
    const ghosts=ST.columns.filter(c=>/^(__empty|unnamed)/i.test(c));
    if(!ghosts.length)return{ok:false,msg:'Aucune colonne fantôme trouvée'};
    _snapshot();
    ghosts.forEach(g=>{ST.columns=ST.columns.filter(c=>c!==g);ST.data.forEach(r=>delete r[g]);delete ST.colMap[g];});
    _render();
    return {ok:true,msg:`${ghosts.length} colonne${ghosts.length>1?'s':''} supprimée${ghosts.length>1?'s':''}: ${ghosts.join(', ')}`};
  },

  // ── Outil : Corriger valeurs texte dans colonnes numériques ──
  fix_numeric_text() {
    const s=_inspect();let fixed=0;
    _snapshot();
    ST.data.forEach((row,ri)=>{
      ST.columns.forEach(col=>{
        const v=row[col]; if(v===null||v===undefined||v==='')return;
        if(s.cstats[col]?.numDom&&_NUM(v)===null){
          const clean=String(v).replace(/[^\d,.\-]/g,'').replace(',','.');
          const n=parseFloat(clean);
          if(!isNaN(n)){ST.data[ri][col]=n;ST.modified.add(`${ri}-${col}`);fixed++;}
        }
      });
    });
    _render();
    return {ok:true,msg:`${fixed} valeur${fixed>1?'s':''} numérique${fixed>1?'s':''} corrigée${fixed>1?'s':''}`,count:fixed};
  },

  // ── Outil : Ajouter colonne manquante ───────────────────────
  add_missing_column({ohada_key, values}) {
    if(!ohada_key||!OHADA_KEYS[ohada_key])return{ok:false,msg:`Clé OHADA "${ohada_key}" inconnue`};
    if(ST.columns.includes(ohada_key))return{ok:false,msg:`Colonne "${ohada_key}" existe déjà`};
    _snapshot();
    ST.columns.push(ohada_key);
    ST.data.forEach((r,i)=>{r[ohada_key]=values&&values[i]!==undefined?values[i]:null;});
    ST.colMap[ohada_key]=ohada_key;
    _render();
    return {ok:true,msg:`Colonne "${OHADA_KEYS[ohada_key]}" ajoutée`};
  },

  // ── Outil : Nettoyer et normaliser tout ─────────────────────
  normalize_all() {
    const s=_inspect();_snapshot();let count=0;
    // 1. Supprimer colonnes fantômes
    const gh=ST.columns.filter(c=>/^(__empty|unnamed)/i.test(c));
    gh.forEach(g=>{ST.columns=ST.columns.filter(c=>c!==g);ST.data.forEach(r=>delete r[g]);});
    // 2. Corriger valeurs texte dans col numériques
    ST.data.forEach((row,ri)=>{ST.columns.forEach(col=>{const v=row[col];if(v===null||v===undefined||v==='')return;if(s.cstats[col]?.numDom&&_NUM(v)===null){const n=parseFloat(String(v).replace(/[^\d,.\-]/g,'').replace(',','.'));if(!isNaN(n)){ST.data[ri][col]=n;count++;}}});});
    // 3. Appliquer mapping OHADA depuis l'analyse
    if(!s.isV){for(const[col,k] of Object.entries(s.cmap)){if(k&&OHADA_KEYS[k])ST.colMap[col]=k;}}
    _render();
    return {ok:true,msg:`Normalisation : ${gh.length} col fantômes supprimées, ${count} valeurs numériques corrigées, mapping OHADA appliqué`};
  },

  // ── Outil : Afficher le diff ─────────────────────────────────
  show_diff() {
    PPQ.showDiff();
    return {ok:true,msg:'Diff ouvert'};
  },

  // ── Outil : Highlight de cellule ────────────────────────────
  highlight_cell({row, column}) {
    PPQ.focusCell((row||1)-1,column||'');
    // Ajouter classe highlight
    setTimeout(()=>{const td=document.querySelector(`#ppq-tbody td[data-abs="${(row||1)-1}"][data-col="${column||''}"]`);if(td){td.classList.add('agent-highlight');setTimeout(()=>td.classList.remove('agent-highlight'),3000);}},200);
    return {ok:true,msg:`Focus L${row}/${column}`};
  },

  // ── Outil : Ajouter une colonne calculée ─────────────────────
  add_calculated_column({new_column, formula}) {
    if(!new_column||!formula) return {ok:false, msg:'Paramètres manquants (new_column, formula)'};
    if(ST.columns.includes(new_column)) return {ok:false, msg:`La colonne "${new_column}" existe déjà`};
    
    _snapshot();
    ST.columns.push(new_column);
    
    let successCount = 0;
    let errors = 0;
    
    try {
      // formula ex: "row['Quantite'] * row['PrixUnitaire']"
      const calc = new Function('row', `return (${formula});`);
      ST.data.forEach(r => {
        try {
          const res = calc(r);
          r[new_column] = (res === null || res === undefined || (typeof res === 'number' && isNaN(res))) ? null : res;
          successCount++;
        } catch(e) {
          r[new_column] = null;
          errors++;
        }
      });
      _render();
      return {ok:true, msg:`Colonne "${new_column}" calculée avec succès. Formule: ${formula}. (Erreurs: ${errors})`};
    } catch (err) {
      ST.columns.pop(); // annuler
      return {ok:false, msg:`Erreur de syntaxe dans la formule: ${err.message}`};
    }
  },
};

// ─── Historique chat agent ─────────────────────────────────────────────
const AGENT_HISTORY = [];
let AGENT_BUSY = false;

async function _agentChat(userMessage) {
  if(AGENT_BUSY)return;
  AGENT_BUSY=true;

  const sendBtn=document.getElementById('ppq-agent-send');
  if(sendBtn){sendBtn.disabled=true;sendBtn.classList.add('thinking');}

  // Afficher message user
  _agentAddMsg('user',userMessage);

  // Indicateur de réflexion
  const thinkId='think-'+Date.now();
  _agentAddThinking(thinkId);

  try{
    // Construire le contexte complet pour l'agent
    const s=_inspect();
    const dataSnapshot=ST.data.slice(0,60); // données réelles

    const systemPrompt=`Tu es un agent data expert OHADA intégré dans Doctor Smile. Tu as accès à des outils pour manipuler le tableau de données directement.

ÉTAT ACTUEL DU TABLEAU :
- Fichier: ${ST.filename}
- Format: ${s.fmt}
- Lignes: ${s.n}, Colonnes: ${s.nc}
- Format vertical: ${s.isV}
- Colonne Champ: ${s.isV?ST.columns[s.cIdx]:'N/A'}, Colonne Valeur: ${s.isV?ST.columns[s.vIdx]:'N/A'}
- Colonnes: ${JSON.stringify(ST.columns)}
- Colonnes fantômes: ${JSON.stringify(s.ghosts)}
- Mapping OHADA actuel: ${JSON.stringify(ST.colMap)}
- Mapping vertical: ${JSON.stringify(ST._vertMap||{})}
- Champs critiques absents: ${JSON.stringify(s.mCrit)}
- Incohérences: ${JSON.stringify(s.inco)}
- DQS: ${s.dqs}/100
- Données (60 premières lignes): ${JSON.stringify(dataSnapshot)}

OUTILS DISPONIBLES (appelle-les dans ton JSON) :
- inspect_structure() → Rapport complet sur la structure
- read_data({limit,offset}) → Lire les données
- pivot_vertical() → Pivote le format vertical Champ/Valeur en tabulaire
- rename_column({from,to}) → Renomme une colonne (cherche par nom approximatif)
- map_column({column,ohada_key}) → Associe une colonne à une clé OHADA
- set_cell({row,column,value}) → Modifie une cellule spécifique
- fix_all_anomalies() → Corrige toutes les anomalies détectées par l'IA
- delete_empty_rows() → Supprime les lignes entièrement vides
- delete_ghost_columns() → Supprime les colonnes __EMPTY/Unnamed
- fix_numeric_text() → Corrige les textes dans colonnes numériques
- add_missing_column({ohada_key,values}) → Ajoute une colonne OHADA manquante
- add_calculated_column({new_column,formula}) → Crée une colonne avec une formule JS (ex: "row['CA'] * 1.1925")
- normalize_all() → Nettoie tout en une fois
- show_diff() → Affiche les modifications avant/après
- highlight_cell({row,column}) → Met en évidence une cellule

INSTRUCTIONS :
1. Analyse la demande de l'utilisateur.
2. Décide quels outils appeler (tu peux appeler PLUSIEURS outils en séquence).
3. Retourne UNIQUEMENT ce JSON :
{
  "reasoning": "Ta réflexion en 1-2 phrases (pourquoi ces actions)",
  "tool_calls": [
    {"tool": "nom_outil", "args": {...}, "description": "Ce que ça fait"},
    {"tool": "autre_outil", "args": {...}, "description": "..."}
  ],
  "response": "Ta réponse finale à l'utilisateur en français (après exécution des outils)"
}

Si tu ne peux pas faire l'action, dis-le clairement dans "response" avec une suggestion.
JSON pur, aucun texte avant ou après.`;

    // Transformer l'historique local vers le format Backend
    const backendHistory = [];
    AGENT_HISTORY.slice(-5).forEach(h => {
      backendHistory.push({ role: 'user', content: h.user });
      backendHistory.push({ role: 'assistant', content: typeof h.assistant === 'string' ? h.assistant : JSON.stringify(h.assistant) });
    });

    const {getAuthToken}=await import('./firebase-auth.js').catch(()=>({getAuthToken:async()=>null}));
    const tok=await getAuthToken().catch(()=>null);
    const res=await fetch(`${_API}/chat`,{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        ...(tok?{'Authorization':`Bearer ${tok}`}:{})
      },
      body:JSON.stringify({
        message:userMessage,
        history:backendHistory,
        userId:window.S?.user?.uid||'anon',
        mode:'auto',
        model:'llama-3.3-70b-versatile',
        system:systemPrompt
      }),
      signal:AbortSignal.timeout(45000)
    });

    // Retirer l'indicateur de réflexion
    document.getElementById(thinkId)?.remove();

    if(!res.ok)throw new Error(`HTTP ${res.status}`);
    const d=await res.json();
    const raw=d.message||d.content||'';

    // Parser la réponse agent (plus robuste)
    let agentResp=null;
    // On cherche le dernier bloc JSON valide (souvent le cas si l'IA réfléchit d'abord)
    const jsonBlocks = raw.match(/\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}/g);
    if(jsonBlocks && jsonBlocks.length > 0){
      // On teste les blocs du plus long au plus court (ou le dernier)
      for(let i = jsonBlocks.length - 1; i >= 0; i--){
        try {
          const parsed = JSON.parse(jsonBlocks[i].replace(/,(\s*[}\]])/g,'$1').replace(/[\x00-\x1f\x7f]/g,' '));
          if(parsed.tool_calls || parsed.response) {
            agentResp = parsed;
            break;
          }
        } catch(e) {}
      }
    }

    if(agentResp){
      // Afficher raisonnement
      if(agentResp.reasoning){
        _agentAddSystemMsg(`💭 ${agentResp.reasoning}`);
      }

      // Exécuter les outils en séquence
      const toolCalls=agentResp.tool_calls||[];
      const toolResults=[];
      for(const tc of toolCalls){
        const toolFn=AGENT_TOOLS[tc.tool];
        if(!toolFn){
          _agentAddToolCall(tc.tool,tc.description||tc.tool,false,'Outil inconnu');
          continue;
        }
        try{
          const result=toolFn(tc.args||{});
          _agentAddToolCall(tc.tool,tc.description||tc.tool,result.ok!==false,result.msg||JSON.stringify(result));
          toolResults.push({tool:tc.tool,result});
        }catch(e){
          _agentAddToolCall(tc.tool,tc.description||tc.tool,false,'Erreur: '+e.message);
        }
      }

      // Réponse finale
      const finalMsg=agentResp.response||'Action exécutée.';
      _agentAddMsg('ai',finalMsg);

      // Sauvegarder dans l'historique
      AGENT_HISTORY.push({user:userMessage,assistant:JSON.stringify(agentResp)});
      if(AGENT_HISTORY.length>8)AGENT_HISTORY.shift();

      // Re-analyser si des modifications importantes ont eu lieu
      const structuralTools=['pivot_vertical','normalize_all','delete_ghost_columns','rename_column'];
      if(toolCalls.some(tc=>structuralTools.includes(tc.tool))){
        setTimeout(()=>_runAIAnalysis(),500);
      }

    }else{
      // L'agent a répondu en texte libre (pas de JSON)
      _agentAddMsg('ai',raw.trim().slice(0,800)||'Je ne comprends pas cette demande. Reformulez ou utilisez les raccourcis.');
    }

  }catch(err){
    document.getElementById(thinkId)?.remove();
    console.warn('[Agent]',err);
    _agentAddMsg('ai',`Erreur : ${err.message.includes('HTTP')?'Groq indisponible — vérifiez votre connexion':err.message}`,'error');
  }

  AGENT_BUSY=false;
  if(sendBtn){sendBtn.disabled=false;sendBtn.classList.remove('thinking');}
}

// ─── Rendu messages agent ──────────────────────────────────────────────
function _agentAddMsg(role,text,type=''){
  const msgs=document.getElementById('ppq-agent-msgs');if(!msgs)return;
  const isAI=role==='ai';
  const div=document.createElement('div');div.className=`ppq-msg ${isAI?'ai':'user'}`;
  const bubbleClass=type==='error'?'ppq-bubble-error':isAI?'ppq-bubble-ai':'ppq-bubble-user';
  div.innerHTML=`
    <div class="ppq-msg-av ${isAI?'ppq-av-ai':'ppq-av-user'}">${isAI?'🤖':'👤'}</div>
    <div class="ppq-msg-bubble ${bubbleClass}">${_esc(text).replace(/\n/g,'<br>')}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop=msgs.scrollHeight;
}

function _agentAddSystemMsg(text){
  const msgs=document.getElementById('ppq-agent-msgs');if(!msgs)return;
  const div=document.createElement('div');
  div.className='ppq-msg ai';
  div.innerHTML=`<div class="ppq-msg-bubble ppq-bubble-system" style="width:100%;">${_esc(text)}</div>`;
  msgs.appendChild(div);msgs.scrollTop=msgs.scrollHeight;
}

function _agentAddToolCall(toolName,description,success,result){
  const msgs=document.getElementById('ppq-agent-msgs');if(!msgs)return;
  const div=document.createElement('div');
  div.className=`ppq-tool-call ${success?'ok':'err'}`;
  div.innerHTML=`
    <i class="fa-solid ${success?'fa-check-circle':'fa-times-circle'} ppq-tool-icon"></i>
    <span style="font-weight:700;">${_esc(toolName)}</span>
    <span style="opacity:.6;">—</span>
    <span>${_esc(description||'')}</span>
    <span style="margin-left:auto;opacity:.55;">${_esc(result||'')}</span>`;
  msgs.appendChild(div);msgs.scrollTop=msgs.scrollHeight;
}

function _agentAddThinking(id){
  const msgs=document.getElementById('ppq-agent-msgs');if(!msgs)return;
  const div=document.createElement('div');div.id=id;div.className='ppq-msg ai';
  div.innerHTML=`<div class="ppq-msg-av ppq-av-ai">🤖</div><div class="ppq-msg-bubble ppq-bubble-ai"><div class="ppq-thinking"><div class="ppq-think-dot"></div><div class="ppq-think-dot"></div><div class="ppq-think-dot"></div><span style="font-size:9px;color:rgba(255,255,255,.4);margin-left:4px;">L'agent analyse et planifie…</span></div></div>`;
  msgs.appendChild(div);msgs.scrollTop=msgs.scrollHeight;
}


function _applyAIMapping(result) {
  if (!result?.mapping) return;
  ST.colMap = {};
  for (const [orig, mapped] of Object.entries(result.mapping)) {
    if (mapped && OHADA_KEYS[mapped]) ST.colMap[orig] = mapped;
  }

  // Marquer les cellules anomalies
  (result.anomalies || []).forEach(anom => {
    const lineIdx = (anom.ligne || 1) - 1;
    const col     = anom.colonne;
    if (lineIdx >= 0 && lineIdx < ST.data.length && col) {
      ST.corrections.set(`${lineIdx}-${col}`, {
        type: 'anomaly',
        suggestion: anom.suggestion,
        probleme: anom.probleme,
        original: ST.data[lineIdx]?.[col],
      });
    }
  });

  _render();
}


// ════════════════════════════════════════════════════════════════════════
//  window.PPQ — API publique complète avec Agent
// ════════════════════════════════════════════════════════════════════════
window.PPQ = {

  // ── Ouvrir ────────────────────────────────────────────────────
  open(filename, data) {
    _buildModal();
    ST.filename   = filename;
    ST.data       = JSON.parse(JSON.stringify(data));
    ST.original   = JSON.parse(JSON.stringify(data));
    ST.columns    = data.length > 0 ? Object.keys(data[0]) : [];
    ST.colMap     = {};
    ST._vertMap   = {};
    ST._lastStruct= null;
    ST.corrections= new Map();
    ST.modified   = new Set();
    ST.selected   = new Set();
    ST.history    = [];
    ST.historyIdx = -1;
    ST.page       = 0;
    ST.searchQ    = '';
    ST.filters    = {};
    ST.aiResult   = null;
    AGENT_HISTORY.length = 0;
    AGENT_BUSY = false;

    document.getElementById('ppq-file-badge').textContent = filename;
    document.getElementById('ppq-overlay').classList.add('open');
    document.getElementById('ppq-apply-btn')?.style.setProperty('display','none');

    _snapshot();
    _render();
    setTimeout(() => _runAIAnalysis(), 400);

    // Message d'accueil de l'agent
    setTimeout(() => {
      _agentAddMsg('ai', `Bonjour ! Je suis votre agent IA Data. J'analyse "${filename}" en temps réel.\n\nVous pouvez me demander :\n• "Pivote le tableau vertical"\n• "Nettoie les données"\n• "Corrige toutes les anomalies"\n• "Renomme actif circulant en actif_courant"\n• "Supprime les colonnes vides"\n• "Mappe CA vers chiffre_affaires"\n\nOu décrivez librement ce que vous voulez faire.`);
    }, 800);
  },

  close() {
    document.getElementById('ppq-overlay')?.classList.remove('open');
  },

  // ── Sidebar ───────────────────────────────────────────────────
  toggleSidebar() {
    document.getElementById('ppq-sidebar')?.classList.toggle('collapsed');
  },

  // ── Agent ─────────────────────────────────────────────────────
  toggleAgent() {
    const panel = document.getElementById('ppq-agent-panel');
    const chev  = document.getElementById('ppq-agent-chevron');
    if (!panel) return;
    const isOpen = panel.classList.contains('open');
    panel.classList.toggle('open', !isOpen);
    panel.classList.toggle('closed', isOpen);
    if (chev) chev.style.transform = isOpen ? '' : 'rotate(180deg)';
    if (!isOpen) {
      setTimeout(() => document.getElementById('ppq-agent-inp')?.focus(), 350);
    }
  },

  openAgent() {
    const panel = document.getElementById('ppq-agent-panel');
    if (panel) { panel.classList.add('open'); panel.classList.remove('closed'); }
    const chev = document.getElementById('ppq-agent-chevron');
    if (chev) chev.style.transform = 'rotate(180deg)';
    setTimeout(() => document.getElementById('ppq-agent-inp')?.focus(), 350);
  },

  agentSend() {
    const inp = document.getElementById('ppq-agent-inp');
    if (!inp) return;
    const msg = inp.value.trim();
    if (!msg) return;
    inp.value = '';
    if (!document.getElementById('ppq-agent-panel')?.classList.contains('open')) {
      this.openAgent();
      setTimeout(() => _agentChat(msg), 400);
    } else {
      _agentChat(msg);
    }
  },

  agentShortcut(type) {
    this.openAgent();
    const cmds = {
      pivot:    'Pivote le tableau vertical en format tabulaire OHADA',
      clean:    'Nettoie et normalise toutes les données : supprime colonnes vides, corrige valeurs texte dans colonnes numériques, applique le mapping OHADA',
      map:      'Mappe intelligemment toutes les colonnes vers leurs clés OHADA correspondantes',
      validate: 'Vérifie les incohérences comptables et les anomalies, explique ce que tu trouves',
      fix:      'Corrige toutes les anomalies détectées automatiquement et dis-moi ce que tu as changé',
    };
    const msg = cmds[type] || type;
    setTimeout(() => _agentChat(msg), 400);
  },

  agentAsk(question) {
    this.openAgent();
    setTimeout(() => _agentChat(question), 400);
  },

  // ── Cellule ───────────────────────────────────────────────────
  onCellFocus(td) {
    if (td.textContent.trim() === '—') td.textContent = '';
  },

  onCellEdit(td) {
    const absIdx = +td.dataset.abs, col = td.dataset.col;
    let val = td.textContent.trim(); if (val === '') val = null;
    const prev = ST.data[absIdx]?.[col];
    if (String(prev ?? '') === String(val ?? '')) return;
    _snapshot();
    if (ST.data[absIdx]) { ST.data[absIdx][col] = isNaN(val)||val===null?val:+val; ST.modified.add(`${absIdx}-${col}`); }
    td.classList.add('ppq-modified');
  },

  // ── Lignes / Colonnes ─────────────────────────────────────────
  addRow() {
    _snapshot();
    const nr = {}; ST.columns.forEach(c => { nr[c] = null; });
    ST.data.push(nr);
    ST.page = Math.floor((ST.data.length-1)/ST.pageSize);
    _render(); _toast(`Ligne ${ST.data.length} ajoutée`,'info');
  },

  addColumn() {
    const name = prompt('Nom de la nouvelle colonne :');
    if (!name?.trim()) return;
    _snapshot();
    const cn = name.trim();
    if (ST.columns.includes(cn)) { _toast('Cette colonne existe déjà','warn'); return; }
    ST.columns.push(cn); ST.data.forEach(r => { r[cn] = null; });
    _render(); _toast(`"${cn}" ajoutée`,'ok');
  },

  addMissingCol(ohKey) {
    _snapshot();
    ST.columns.push(ohKey); ST.data.forEach(r => { r[ohKey] = null; });
    ST.colMap[ohKey] = ohKey; _render();
    _toast(`"${OHADA_KEYS[ohKey]||ohKey}" ajoutée`,'ok');
    if (ST.aiResult) _renderAISidebar(ST.aiResult, false);
  },

  deleteColumn(col) {
    if (!confirm(`Supprimer "${col}" ?`)) return;
    _snapshot();
    ST.columns = ST.columns.filter(c => c !== col);
    ST.data.forEach(r => delete r[col]);
    delete ST.colMap[col];
    _render(); _toast(`"${col}" supprimée`,'warn');
  },

  deleteSelected() {
    if (!ST.selected.size) { _toast('Sélectionnez des lignes','warn'); return; }
    if (!confirm(`Supprimer ${ST.selected.size} ligne(s) ?`)) return;
    _snapshot();
    ST.data = ST.data.filter((_, i) => !ST.selected.has(i));
    ST.selected.clear();
    ST.page = Math.min(ST.page, Math.max(0, Math.ceil(ST.data.length/ST.pageSize)-1));
    _render(); _toast('Lignes supprimées','warn');
  },

  // ── Sélection ─────────────────────────────────────────────────
  onRowClick(e, idx) {
    if (e.target.tagName==='TD' && e.target.getAttribute('contenteditable')==='true') return;
    ST.selected.has(idx) ? ST.selected.delete(idx) : ST.selected.add(idx);
    const tr = document.querySelector(`#ppq-tbody tr[data-idx="${idx}"]`);
    if (tr) tr.classList.toggle('selected', ST.selected.has(idx));
  },

  selectAll(checked) {
    if (checked) _filteredData().forEach(r => ST.selected.add(ST.data.indexOf(r)));
    else ST.selected.clear();
    _renderBody();
  },

  // ── Renommage double-clic ─────────────────────────────────────
  startRenameCol(el, oldName) {
    el.contentEditable = 'true'; el.focus();
    const rng = document.createRange(); rng.selectNodeContents(el);
    window.getSelection().removeAllRanges(); window.getSelection().addRange(rng);
    const finish = () => {
      const nn = el.textContent.trim(); el.contentEditable = 'false';
      if (!nn || nn === oldName) return;
      if (ST.columns.includes(nn)) { el.textContent = oldName; _toast('Nom déjà utilisé','warn'); return; }
      _snapshot();
      const i = ST.columns.indexOf(oldName); if (i>=0) ST.columns[i]=nn;
      ST.data.forEach(r => { r[nn]=r[oldName]; delete r[oldName]; });
      if (ST.colMap[oldName]) { ST.colMap[nn]=ST.colMap[oldName]; delete ST.colMap[oldName]; }
      _render(); _toast(`"${oldName}" → "${nn}"`,'ok');
    };
    el.onblur = finish;
    el.onkeydown = e => { if(e.key==='Enter'){e.preventDefault();el.blur();} if(e.key==='Escape'){el.textContent=oldName;el.blur();} };
  },

  // ── Filtre ────────────────────────────────────────────────────
  toggleFilter(e, col) { _showFilterDD(e, col); },
  toggleFilterVal(e, col, val, el) {
    e.stopPropagation();
    if (!ST.filters[col]) ST.filters[col] = new Set();
    ST.filters[col].has(val) ? ST.filters[col].delete(val) : ST.filters[col].add(val);
    el.classList.toggle('selected', ST.filters[col].has(val));
    el.querySelector('i')?.classList.toggle('fa-square-check', ST.filters[col].has(val));
    el.querySelector('i')?.classList.toggle('fa-square', !ST.filters[col].has(val));
    ST.page = 0; _renderBody(); _renderPagination();
  },
  clearFilter(col) { delete ST.filters[col]; ST.filterDD?.remove(); ST.filterDD=null; ST.page=0; _render(); },

  // ── Recherche / Pagination ────────────────────────────────────
  onSearch(q) { ST.searchQ=q; ST.page=0; _renderBody(); _renderPagination(); },
  goPage(p) {
    const max = Math.ceil(_filteredData().length/ST.pageSize)-1;
    ST.page = Math.max(0,Math.min(p,max));
    _renderBody(); _renderPagination();
    document.getElementById('ppq-table-wrap')?.scrollTo(0,0);
  },

  // ── IA ────────────────────────────────────────────────────────
  runAI() { _runAIAnalysis(); },

  applyCorrection(rowIdx, col, suggestion, cardIdx) {
    _snapshot();
    if (ST.data[rowIdx]) {
      const nv = (isNaN(suggestion)||suggestion===''||suggestion===null) ? suggestion : +suggestion;
      ST.data[rowIdx][col] = nv;
      ST.corrections.set(`${rowIdx}-${col}`, {type:'fixed',value:nv});
      ST.modified.add(`${rowIdx}-${col}`);
    }
    document.getElementById(`ppq-anom-${cardIdx}`)?.style.setProperty('opacity','.35');
    _renderBody(); _toast(`L.${rowIdx+1} ${col} = ${suggestion}`,'ok');
  },

  applyAllSuggestions() {
    const anoms = ST.aiResult?.anomalies||[];
    if (!anoms.length) { _toast('Aucune suggestion','info'); return; }
    _snapshot(); let n=0;
    anoms.forEach(a => {
      const idx=(a.ligne||1)-1;
      if(idx>=0&&idx<ST.data.length&&a.colonne&&(a.suggestion??a.sugg)!=null){
        const sv=a.suggestion??a.sugg;
        ST.data[idx][a.colonne]=isNaN(sv)?sv:+sv;
        ST.corrections.set(`${idx}-${a.colonne}`,{type:'fixed',value:sv});
        ST.modified.add(`${idx}-${a.colonne}`); n++;
      }
    });
    _render(); _toast(`${n} correction${n>1?'s':''} appliquée${n>1?'s':''}`,'ok');
  },

  focusCell(rowIdx, col) {
    const p=Math.floor(rowIdx/ST.pageSize);
    if(p!==ST.page){ST.page=p;_render();}
    setTimeout(()=>{const td=document.querySelector(`#ppq-tbody td[data-abs="${rowIdx}"][data-col="${col}"]`);if(td){td.focus();td.scrollIntoView({behavior:'smooth',block:'center'});}},150);
  },

  // ── Diff ──────────────────────────────────────────────────────
  showDiff()  { _showDiff(); },
  closeDiff() { document.getElementById('ppq-diff-view')?.classList.remove('open'); },

  // ── Undo / Redo ───────────────────────────────────────────────
  undo() { _undo(); },
  redo() { _redo(); },

  // ── Reset ─────────────────────────────────────────────────────
  resetAll() {
    if (!confirm('Réinitialiser toutes les modifications ?')) return;
    ST.data       = JSON.parse(JSON.stringify(ST.original));
    ST.columns    = ST.original.length>0?Object.keys(ST.original[0]):[];
    ST.modified   = new Set(); ST.corrections=new Map(); ST.colMap={}; ST._vertMap={};
    ST.page=0; ST.history=[]; ST.historyIdx=-1;
    _snapshot(); _render(); _toast('Données réinitialisées','warn');
  },

  // ── Lancer le pipeline ML ─────────────────────────────────────
  launch() {
    if (!ST.data.length) { _toast('Aucune donnée','err'); return; }
    const s = _inspect();
    let finalData;

    // Pivot automatique si format vertical
    if (s.isV) {
      const r = _executePivot();
      if (r.ok) {
        // Données déjà pivotées dans ST.data après _executePivot()
        finalData = ST.data.map(row => {
          const mapped = { ...row };
          const ai = ST.aiResult;
          if (ai) {
            if (ai.pays    && !mapped.pays)    mapped.pays    = ai.pays;
            if (ai.secteur && !mapped.secteur) mapped.secteur = ai.secteur;
            if (ai.devise)                     mapped.devise  = ai.devise;
            if (ai.exercice)                   mapped.exercice= ai.exercice;
            if (ai.entreprise && !mapped.nom)  mapped.nom     = ai.entreprise;
          }
          return mapped;
        });
      } else {
        // Pivot manuel
        finalData = [_buildPivotedObj()];
      }
    } else {
      // Format tabulaire : mapper avec colMap
      const ai = ST.aiResult;
      finalData = ST.data.map(row => {
        const mapped = {};
        ST.columns.forEach(col => {
          const key = ST.colMap[col] || col;
          const val = row[col];
          const nv  = _NUM(val);
          mapped[key] = (val!=null&&val!=='')?nv!==null?nv:val:null;
        });
        if (ai) {
          if (ai.pays    && !mapped.pays)    mapped.pays    = ai.pays;
          if (ai.secteur && !mapped.secteur) mapped.secteur = ai.secteur;
          if (ai.devise)                     mapped.devise  = ai.devise;
          if (ai.exercice)                   mapped.exercice= ai.exercice;
          if (ai.entreprise && !mapped.nom)  mapped.nom     = ai.entreprise;
        }
        return mapped;
      });
    }

    if (window.S) window.S.rawFileData = { filename: ST.filename, data: finalData };
    this.close();
    if (window.DS_UPLOAD?.sendToAPI) window.DS_UPLOAD.sendToAPI();
    _toast('Pipeline ML lancé…','ok');
  },
};

// ─── Pivot manuel (si _executePivot non dispo) ────────────────────────
function _buildPivotedObj() {
  const s = _inspect();
  if (!s.isV) return ST.data[0] || {};
  const cc=ST.columns[s.cIdx], vc=ST.columns[s.vIdx];
  const pivoted={};
  ST.columns.forEach((col,i) => { if(i!==s.cIdx&&i!==s.vIdx&&ST.data[0]){const v=ST.data[0][col];if(v!=null&&v!=='')pivoted[ST.colMap[col]||col]=v;} });
  ST.data.forEach(row => {
    const champ=String(row[cc]||'').trim(); if(!champ||champ.startsWith('#'))return;
    const k=s.vmap[champ]||(ST._vertMap||{})[champ]||null;
    const fk=k||champ.toLowerCase().replace(/[^a-z0-9]/g,'_').replace(/_+/g,'_');
    const v=row[vc]; if(v!=null&&v!==''){const n=_NUM(v);pivoted[fk]=n!==null?n:v;}
  });
  return pivoted;
}


(function _patch() {
  function tryPatch() {
    if (!window.DS_UPLOAD) { setTimeout(tryPatch, 400); return; }

    // Remplacer openDataViewer par notre Power Query
    window.DS_UPLOAD.openDataViewer = function(fname, data) {
      window.PPQ.open(fname, data);
    };

    // Aussi patcher openCurrentDataViewer
    window.DS_UPLOAD.openCurrentDataViewer = function() {
      const d = window.S?.rawFileData;
      if (d) window.PPQ.open(d.filename, d.data);
    };

    // Patcher resetDataTable
    window.DS_UPLOAD.resetDataTable = function() {
      window.PPQ.resetAll?.();
    };

    // Patcher launchML pour passer par PPQ
    const origLaunch = window.DS_UPLOAD.launchML?.bind(window.DS_UPLOAD);
    window.DS_UPLOAD.launchML = function() {
      // Si PPQ est ouvert, utiliser son launch
      if (document.getElementById('ppq-overlay')?.classList.contains('open')) {
        window.PPQ.launch();
      } else if (origLaunch) {
        origLaunch();
      }
    };

    // Patcher DS (alias)
    if (window.DS) {
      window.DS.closeModal          = (e) => window.PPQ.close?.();
      window.DS.closeModalDirect    = ()  => window.PPQ.close?.();
      window.DS.switchDataView      = (v,b) => {}; // no-op, géré par PPQ
      window.DS.resetDataTable      = ()  => window.PPQ.resetAll?.();
      window.DS.launchML            = ()  => window.PPQ.launch?.();
      window.DS.openCurrentDataViewer= () => window.DS_UPLOAD.openCurrentDataViewer?.();
    }

    console.log('[ds-preprocess] ✅ Power Query IA patché sur DS_UPLOAD');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryPatch);
  else tryPatch();
})();