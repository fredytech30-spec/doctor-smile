// ════════════════════════════════════════════════════════════════
//  ds-upload.js — Doctor Smile
//  Upload fichier, parsing, pipeline ML, modal données, What-If
//  Dépend de : ds-core.js, dashboard.js (window.DS)
// ════════════════════════════════════════════════════════════════

const API_BASE = window.API_BASE || 'http://127.0.0.1:8000';

// ── Données démo ──────────────────────────────────────────────
window.DEMO_DATA = {
  id:'demo',
  entreprise:'Société SPORDEMO',
  score: 45,
  zone: 'vigilance',
  ivf: 55,
  pays: 'Cameroun / CEMAC',
  secteur: 'Services',
  probabiliteDefaut: 55.0,
  confidence: 95,
  model: 'Moteur Déterministe SYSCOHADA v3',
  engine: 'SYSCOHADA Engine v3.0',
  auc: 0,
  createdAt: new Date(),
  processingMs: 42,
  scoreHistory: [40, 42, 41, 44, 43, 44, 45],
  shapValues: [],
  ratios: [
    { name:'Liquidité générale',        value:1.42,  unit:'',  benchmark:'> 1.0',   status:'green',  score:71 },
    { name:'Marge nette (%)',            value:4.76,  unit:'%', benchmark:'> 2.0%',  status:'green',  score:75 },
    { name:'ROE (%)',                    value:14.98, unit:'%', benchmark:'> 5.0%',  status:'green',  score:80 },
    { name:"Ratio d'endettement",       value:2.65,  unit:'',  benchmark:'< 2.5',   status:'yellow', score:58 },
    { name:'Rotation des actifs',        value:0.86,  unit:'',  benchmark:'> 0.5',   status:'green',  score:78 },
    { name:'Délai client (DSO) — jours',value:212,   unit:'j', benchmark:'< 60j',   status:'red',    score:25, compte:'411' },
    { name:'Délai fournisseur (DPO)',    value:87,    unit:'j', benchmark:'> 60j',   status:'green',  score:80, compte:'401' },
    { name:'Ratio Clients/Fournisseurs',value:5.66,  unit:'×', benchmark:'< 1.5×',  status:'red',    score:20, compte:'411/401' },
  ],
  radarDimensions: [
    { label:'Trésorerie',   value: 35 },
    { label:'Recouvrement', value: 25 },
    { label:'Rentabilité',  value: 75 },
    { label:'Solvabilité',  value: 58 },
    { label:'Liquidité',    value: 71 },
    { label:'Croissance',   value: 55 },
  ],
  risk_factors: [
    {
      rule: 'dso_catastrophique',
      name: 'DSO Catastrophique — Asphyxie Trésorerie',
      description: 'DSO = 212 jours. Vos clients paient après 7 mois. L\'entreprise finance ses clients avec ses propres ressources.',
      severity: 'critical',
      score_impact: -30,
      compte: '411',
      action: 'Acompte 50% signature + Mobile Money pour solde livraison. Relance WhatsApp clients > 30j.',
    },
    {
      rule: 'ratio_cli_four_critique',
      name: 'Déséquilibre Clients/Fournisseurs Extrême',
      description: 'Ratio 5,66×: pour chaque 1 FCFA dû aux fournisseurs, vos clients vous doivent 5,66 FCFA.',
      severity: 'critical',
      score_impact: -20,
      compte: '411 / 401',
      action: 'Stop livraison clients > 45j impayé. Négociez délais fournisseurs à 90 jours.',
    },
    {
      rule: 'endettement_eleve',
      name: "Ratio d'Endettement Au-Dessus du Seuil",
      description: 'Endettement 2,65× (seuil CEMAC = 2,5×). Marge réduite pour nouveau crédit bancaire.',
      severity: 'high',
      score_impact: -10,
      compte: '16 / 17',
      action: 'Remboursez les dettes CT (compte 164) avant de solliciter un nouveau financement.',
    },
  ],
  recommendations: [
    {
      urgency: 'immediate', level: 'high', icon: 'fa-exclamation-triangle', emoji: '🔴',
      title: 'Campagne Recouvrement Urgente — Compte 411',
      detail: 'Contactez tous les clients > 30j. Offrez 5% de remise pour paiement Mobile Money dans les 48h.',
      description: 'DSO = 212 jours : vous financez vos clients depuis 7 mois sur vos propres ressources.',
      compte: '411', impact_score: 30,
    },
    {
      urgency: 'immediate', level: 'high', icon: 'fa-ban', emoji: '🔴',
      title: 'Stop-and-Go — Bloquer les nouvelles livraisons impayées',
      detail: 'Aucune livraison sans acompte 50% ou solde intégral des créances en cours.',
      description: 'Ratio Clients/Fournisseurs à 5,66×: vous subventionnez vos clients avec vos dettes fournisseurs.',
      compte: '411 / 401', impact_score: 20,
    },
    {
      urgency: 'court_terme', level: 'medium', icon: 'fa-file-invoice', emoji: '🟠',
      title: 'Optimiser la TVA sur encaissements',
      detail: 'Passez à la TVA sur encaissements: ne payez la DGI que quand le client a payé.',
      description: 'Libère immédiatement de la trésorerie en différant les décaissements fiscaux.',
      compte: '441 / 444 / 445', impact_score: 10,
    },
  ],
};

// ── Upload ────────────────────────────────────────────────────
window.DS_UPLOAD = {

  // ── Contrôle annulation ────────────────────────────────────
  _abortCtrl:    null,    // AbortController actif
  _isCancelled:  false,   // flag annulation volontaire

  trigger() { document.getElementById('file-inp')?.click(); },

  // ── Stopper l'analyse en cours ──────────────────────────────
  cancelAnalysis() {
    this._isCancelled = true;

    // Abort le fetch réseau immédiatement
    if (this._abortCtrl) { this._abortCtrl.abort(); this._abortCtrl = null; }

    // Arrêter le timer visuel
    clearInterval(S.pipelineTimer);
    S.waitingForResult = false;
    S.pendingAnalyseId = null;

    // Animer le bouton en mode "annulation"
    const btn = document.getElementById('pl-stop-btn');
    if (btn) {
      btn.classList.add('stopping');
      btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>Annulation…';
    }

    // Masquer le pipeline + restaurer la zone upload après l'animation
    setTimeout(() => {
      document.getElementById('pipeline')?.classList.remove('show');
      document.getElementById('upload-sec').style.display = 'block';
      document.getElementById('score-sec').style.display  = 'none';
      if (btn) {
        btn.classList.remove('stopping');
        btn.innerHTML = `<i class="fa-solid fa-stop"></i>Stopper l'analyse`;
      }
      this._isCancelled = false;
      showToast('Analyse annulée', 'warn');
    }, 480);
  },

  handleDragOver(e) {
    e.preventDefault();
    document.getElementById('upload-zone')?.classList.add('drag');
  },

  handleDragLeave() {
    document.getElementById('upload-zone')?.classList.remove('drag');
  },

  handleDrop(e) {
    e.preventDefault();
    document.getElementById('upload-zone')?.classList.remove('drag');
    const f = e.dataTransfer.files[0];
    if (f) window.DS_UPLOAD.handleFile(f);
  },

  // ── Toast robuste ─────────────────────────────────────────────
  _showToast(msg, type = 'ok') {
    if (window.showToast) window.showToast(msg, type);
    else console.log(`[Toast ${type}] ${msg}`);
  },

  async handleFile(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    this._showToast(`📂 Lecture de ${file.name}…`, 'info');
    try {
      let parsed;
      if (['xlsx','xls','ods'].includes(ext)) parsed = await this._parseExcel(file);
      else if (ext==='csv')                    parsed = await this._parseCSV(file);
      else if (ext==='json')                   parsed = await this._parseJSON(file);
      else if (ext==='pdf') {
        // Proposer le choix : extraction tableau OU OCR/IA
        this._showPDFModeModal(file);
        return;
      } else { this._showToast('Format non supporté','err'); return; }
      S.rawFileData = { filename: file.name, data: parsed };
      this.openDataViewer(file.name, parsed);
    } catch(err) {
      this._showToast('Erreur de lecture : '+err.message,'err');
      console.error('Parse error:',err);
    }
  },

  // ── Modal choix mode PDF ────────────────────────────────────
  _showPDFModeModal(file) {
    let m = document.getElementById('_pdf-mode-modal');
    if (m) m.remove();
    m = document.createElement('div');
    m.id = '_pdf-mode-modal';
    m.style.cssText = `position:fixed;inset:0;z-index:9500;display:flex;
      align-items:center;justify-content:center;
      background:rgba(0,0,0,.75);backdrop-filter:blur(14px);`;
    m.innerHTML = `
    <div style="background:linear-gradient(160deg,rgba(10,14,26,.98),rgba(15,25,41,.98));
      border:1px solid rgba(139,127,240,.15);border-radius:18px;padding:28px;
      width:min(480px,92vw);box-shadow:0 28px 70px rgba(0,0,0,.7);">
      <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:900;color:#fff;margin-bottom:6px;">
        <i class="fa-solid fa-file-pdf" style="color:#ef4444;margin-right:9px;"></i>${file.name}
      </div>
      <div style="font-size:10px;color:rgba(255,255,255,.35);margin-bottom:22px;">
        Choisissez la méthode d'extraction selon votre document
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;">
        <div onclick="DS_UPLOAD._launchPDF('table',this._file)" id="_pdf-btn-table"
          style="padding:16px;border-radius:12px;border:2px solid rgba(139,127,240,.2);
          background:rgba(139,127,240,.04);cursor:pointer;transition:all .2s;"
          onmouseenter="this.style.borderColor='rgba(139,127,240,.5)';this.style.background='rgba(139,127,240,.1)'"
          onmouseleave="this.style.borderColor='rgba(139,127,240,.2)';this.style.background='rgba(139,127,240,.04)'">
          <div style="font-size:20px;margin-bottom:8px;">📊</div>
          <div style="font-family:'Syne',sans-serif;font-size:11px;font-weight:800;color:#8B7FF0;margin-bottom:5px;">
            Tableaux natifs
          </div>
          <div style="font-size:9px;color:rgba(255,255,255,.4);line-height:1.6;">
            PDF numérique avec tableaux. Rapide. Idéal pour exports comptables.
          </div>
        </div>
        <div onclick="DS_UPLOAD._launchPDF('ocr',this._file)" id="_pdf-btn-ocr"
          style="padding:16px;border-radius:12px;border:2px solid rgba(167,139,250,.2);
          background:rgba(167,139,250,.04);cursor:pointer;transition:all .2s;"
          onmouseenter="this.style.borderColor='rgba(167,139,250,.5)';this.style.background='rgba(167,139,250,.1)'"
          onmouseleave="this.style.borderColor='rgba(167,139,250,.2)';this.style.background='rgba(167,139,250,.04)'">
          <div style="font-size:20px;margin-bottom:8px;">🔬</div>
          <div style="font-family:'Syne',sans-serif;font-size:11px;font-weight:800;color:#8B7FF0;margin-bottom:5px;">
            OCR / IA
          </div>
          <div style="font-size:9px;color:rgba(255,255,255,.4);line-height:1.6;">
            PDF scanné, liasse fiscale, bilan manuscrit. Extraction intelligente.
          </div>
        </div>
      </div>
      <div style="font-size:8px;color:rgba(255,255,255,.2);text-align:center;margin-bottom:16px;">
        <i class="fa-solid fa-circle-info" style="margin-right:4px;"></i>
        Liasse fiscale 2050/2051 → OCR · Export Sage/Cegid → Tableaux natifs
      </div>
      <button onclick="document.getElementById('_pdf-mode-modal').remove()"
        style="width:100%;padding:10px;border-radius:9px;border:1px solid rgba(255,255,255,.08);
        background:rgba(255,255,255,.04);color:rgba(255,255,255,.4);
        font-family:'Syne',sans-serif;font-size:9px;cursor:pointer;">
        Annuler
      </button>
    </div>`;
    // Stocker la référence du fichier
    m.querySelector('#_pdf-btn-table')._file = file;
    m.querySelector('#_pdf-btn-ocr')._file   = file;
    // Fixer onclick avec closure
    m.querySelector('#_pdf-btn-table').onclick = () => { m.remove(); this._launchPDF('table', file); };
    m.querySelector('#_pdf-btn-ocr').onclick   = () => { m.remove(); this._launchPDF('ocr',   file); };
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    document.body.appendChild(m);
  },

  async _launchPDF(mode, file) {
    if (mode === 'table') {
      showToast('PDF : extraction tableaux…', 'info');
      await this.uploadPDF(file);
    } else {
      showToast('PDF : extraction OCR/IA en cours…', 'info');
      await this.uploadPDFOcr(file);
    }
  },

  async _parseExcel(file) {
    if (!window.XLSX) throw new Error('SheetJS non chargé');
    const buf = await file.arrayBuffer();
    const wb  = XLSX.read(buf,{type:'array'});
    return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:null});
  },

  async _parseCSV(file) {
    if (!window.XLSX) throw new Error('SheetJS non chargé');
    const text = await file.text();
    const wb   = XLSX.read(text,{type:'string'});
    return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:null});
  },

  async _parseJSON(file) {
    const d = JSON.parse(await file.text());
    return Array.isArray(d) ? d : [d];
  },

  // ── Data Viewer Modal ───────────────────────────────────────
  _viewMode: 'raw',
  _origData: null,

  openDataViewer(fname, data) {
    this._origData = JSON.parse(JSON.stringify(data));
    document.getElementById('modal-fname').textContent = fname;
    document.getElementById('qlist').innerHTML =
      this._analyzeQuality(data).warnings.join('<br>');
    this._renderDataTable(data,'raw');
    const o = document.getElementById('modal-overlay');
    o.style.display='flex';
    requestAnimationFrame(()=>o.classList.add('show'));
  },

  openCurrentDataViewer() {
    if (S.rawFileData) this.openDataViewer(S.rawFileData.filename, S.rawFileData.data);
  },

  _analyzeQuality(data) {
    if (!data?.length) return { warnings:['Aucune donnée détectée'] };
    const keys=Object.keys(data[0]||{}); const warnings=[]; let missing=0;
    data.forEach((row,ri)=>{
      keys.forEach(k=>{
        if(row[k]===null||row[k]===undefined||row[k]===''){
          missing++;
          if(warnings.length<4) warnings.push(`• Ligne ${ri+1}, colonne "${k}" : valeur manquante`);
        }
      });
    });
    if(!warnings.length) warnings.push('• Aucune anomalie détectée — données prêtes pour l\'analyse');
    else warnings.push(`• Total valeurs manquantes : ${missing}`);
    return { warnings };
  },

  switchDataView(v, btn) {
    this._viewMode=v;
    document.querySelectorAll('.vtab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    if (S.rawFileData) this._renderDataTable(S.rawFileData.data,v);
  },

  _renderDataTable(data, mode) {
    if (!data?.length) return;
    const keys=Object.keys(data[0]);
    document.getElementById('tbl-head').innerHTML=
      '<tr>'+keys.map(k=>`<th>${k}</th>`).join('')+'</tr>';
    document.getElementById('tbl-body').innerHTML=data.map((row,ri)=>
      '<tr>'+keys.map(k=>{
        const v=row[k], missing=v===null||v===undefined||v==='';
        const cls=missing?' class="edited"':'';
        const display=missing?'<em style="opacity:.4">—</em>':escHtml(String(v));
        const editable=mode==='raw'?' contenteditable="true"':'';
        return `<td${cls}${editable} data-row="${ri}" data-key="${k}">${display}</td>`;
      }).join('')+'</tr>'
    ).join('');
    if (mode==='raw') {
      document.querySelectorAll('#tbl-body td[contenteditable]').forEach(td=>{
        td.addEventListener('blur',()=>{
          const ri=+td.dataset.row, k=td.dataset.key;
          if(S.rawFileData?.data[ri]) {
            S.rawFileData.data[ri][k]=td.textContent.trim();
            td.classList.add('edited');
          }
        });
      });
    }
  },

  resetDataTable() {
    if(this._origData&&S.rawFileData) S.rawFileData.data=JSON.parse(JSON.stringify(this._origData));
    if(S.rawFileData) this._renderDataTable(S.rawFileData.data,this._viewMode);
  },

  closeModal(e) { if(e.target===document.getElementById('modal-overlay')) this.closeModalDirect(); },
  closeModalDirect() {
    const o=document.getElementById('modal-overlay');
    o.classList.remove('show');
    setTimeout(()=>{o.style.display='none';},280);
  },

  launchML() {
    this.closeModalDirect();
    // Lire l'état du toggle Mode IA Avancé
    const llmToggle = document.getElementById('_llm-toggle');
    this._useLLM = llmToggle?.checked || false;
    this.sendToAPI();
  },

  _useLLM: false,

  _toggleLLM(wrap) {
    const cb = document.getElementById('_llm-toggle');
    if (cb) { cb.checked = !cb.checked; this._onToggleLLM(cb); }
  },

  _onToggleLLM(cb) {
    this._useLLM = cb.checked;
    const btn  = document.getElementById('_launch-btn');
    const badge = document.getElementById('_llm-badge');
    if (btn) {
      if (cb.checked) {
        btn.style.background = 'linear-gradient(135deg,rgba(167,139,250,.7),rgba(139,127,240,.5))';
        btn.style.boxShadow  = '0 0 20px rgba(167,139,250,.35)';
        btn.innerHTML = '<i class="fa-solid fa-brain" style="margin-right:5px;"></i>Lancer avec IA Avancée';
      } else {
        btn.style.background = 'linear-gradient(135deg,var(--ice),var(--ice-2))';
        btn.style.boxShadow  = '0 0 16px var(--ice-glow)';
        btn.innerHTML = '<i class="fa-solid fa-bolt" style="margin-right:5px;"></i>Lancer l\'analyse ML';
      }
    }
    if (badge) {
      badge.style.opacity = cb.checked ? '1' : '0.4';
    }
  },

  // ── Pipeline ML UI ─────────────────────────────────────────
  ML_STEPS: [
    { l:'Validation et parsing',                  i:'fa-check'            },
    { l:'Preprocessing + imputation sectorielle', i:'fa-filter'           },
    { l:'Feature engineering (23 ratios)',        i:'fa-calculator'       },
    { l:'Ensemble ML : RF + XGBoost + LightGBM',  i:'fa-circle-notch'    },
    { l:'Calibration isotonique',                 i:'fa-sliders'          },
    { l:'SHAP explicabilité',                     i:'fa-magnifying-glass' },
    { l:'Recommandations IA',                     i:'fa-lightbulb'        },
  ],

  ML_STEPS_LLM: [
    { l:'Réception et lecture du fichier',          i:'fa-file-import'    },
    { l:'Analyse IA — identification des colonnes', i:'fa-brain'          },
    { l:'Correction et normalisation intelligente', i:'fa-wand-magic-sparkles' },
    { l:'Estimation des valeurs manquantes',        i:'fa-fill-drip'      },
    { l:'Détection des anomalies et incohérences',  i:'fa-triangle-exclamation' },
    { l:'Feature engineering (17 ratios ML)',       i:'fa-calculator'     },
    { l:'Ensemble ML : RF + XGBoost + LightGBM',   i:'fa-circle-notch'   },
    { l:'SHAP + Recommandations IA',                i:'fa-lightbulb'      },
  ],

  startPipelineUI() {
    S.pipelineStep=0;
    const pl=document.getElementById('pipeline');
    const fill=document.getElementById('pl-fill');
    const pct=document.getElementById('pl-pct');
    const stps=document.getElementById('pl-steps');
    document.getElementById('upload-sec').style.display='none';
    document.getElementById('score-sec').style.display='none';
    pl.classList.add('show');
    fill.style.width='0%'; pct.textContent='0%';
    // Utiliser les étapes LLM si mode IA activé
    const steps = this._useLLM ? this.ML_STEPS_LLM : this.ML_STEPS;
    stps.innerHTML=steps.map((s,i)=>
      `<div class="pl-step wait" id="ps${i}">
         <div class="pl-icon"><i class="fa-solid ${s.i}"></i></div>
         <div class="pl-lbl">${s.l}</div>
       </div>`
    ).join('');
    S.pipelineTimer=setInterval(()=>{
      if(S.pipelineStep>=(this._useLLM?this.ML_STEPS_LLM:this.ML_STEPS).length-1) return;
      if(S.pipelineStep>0){
        const prev=document.getElementById(`ps${S.pipelineStep-1}`);
        if(prev){prev.className='pl-step done';prev.querySelector('i').className='fa-solid fa-check';}
      }
      const cur=document.getElementById(`ps${S.pipelineStep}`);
      if(cur) cur.className='pl-step go';
      S.pipelineStep++;
      const p=Math.round((S.pipelineStep/(this._useLLM?this.ML_STEPS_LLM:this.ML_STEPS).length)*88);
      fill.style.width=p+'%'; pct.textContent=p+'%';
    },1200);
  },

  hidePipeline() {
    clearInterval(S.pipelineTimer);
    const fill=document.getElementById('pl-fill'), pct=document.getElementById('pl-pct');
    if(fill) fill.style.width='100%';
    if(pct)  pct.textContent='100%';
    this.ML_STEPS.forEach((_,i)=>{
      const el=document.getElementById(`ps${i}`);
      if(el){ el.className='pl-step done'; const ic=el.querySelector('i'); if(ic) ic.className='fa-solid fa-check'; }
    });
    setTimeout(()=>{ document.getElementById('pipeline')?.classList.remove('show'); },600);
  },

  stopPipelineUI() {
    clearInterval(S.pipelineTimer);
    document.getElementById('pipeline')?.classList.remove('show');
    document.getElementById('upload-sec').style.display = 'block';
    // Reset visuel du bouton stop
    const btn = document.getElementById('pl-stop-btn');
    if (btn) {
      btn.classList.remove('stopping');
      btn.innerHTML = `<i class="fa-solid fa-stop"></i>Stopper l'analyse`;
    }
  },

  runDemoPipeline() {
    this.startPipelineUI();
    setTimeout(()=>{
      this.hidePipeline();
      S.waitingForResult=false;
      window.DS_DASH?.loadAnalyse(window.DEMO_DATA);
      window._DS_injectExportBtn?.();
    }, this.ML_STEPS.length*1200+600);
  },

  // ── API POST /analyses ─────────────────────────────────────
  async sendToAPI() {
    if (!S.rawFileData) return;
    this._isCancelled = false;
    this._abortCtrl   = new AbortController();
    this.startPipelineUI();
    try {
      const { fetchWithAuth } = await import('./utils.js');
      const response = await fetchWithAuth(`${API_BASE}/analyses`, {
        method: 'POST',
        signal: this._abortCtrl.signal,
        body: JSON.stringify({
          filename:          S.rawFileData.filename,
          data:              S.rawFileData.data,
          userId:            S.user.uid,
          plan:              S.abonnement?.plan ?? S.profile?.plan ?? 'standard',
          entreprise:        S.profile?.entreprise ?? {},
          use_llm_moderator: this._useLLM,          // ← Mode IA Avancé
          llm_context: {                             // ← Contexte pour le LLM
            secteur: S.profile?.entreprise?.secteur || S.currentAnalyse?.secteur || 'autre',
            pays:    S.profile?.entreprise?.pays    || 'Cameroun',
            devise:  S.profile?.entreprise?.devise  || 'FCFA',
          },
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const res = await response.json();
      if (res.analyseId && !this._isCancelled) {
        S.waitingForResult = true;
        S.pendingAnalyseId = res.analyseId;

        // Afficher le rapport qualité LLM si mode IA activé
        if (this._useLLM && res.score_confiance !== undefined) {
          this._showLLMReport(res);
        }
        const llmMsg = this._useLLM
          ? `🧠 Modération IA — confiance ${res.score_confiance || '?'}% · ${res.corrections_count || 0} corrections`
          : '⚡ Pipeline lancé — résultat dans quelques secondes…';
        this._showToast(llmMsg, this._useLLM ? 'ok' : 'info');
      }
    } catch(err) {
      if (err.name === 'AbortError' || this._isCancelled) return; // annulation silencieuse
      this.stopPipelineUI();
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || err.message?.includes('0')) {
        this._showToast('⚠️ API hors ligne — démo chargée', 'warn');
        this.runDemoPipeline();
      } else {
        this._showToast('Erreur : ' + (err.message || 'Inconnue'), 'err');
      }
    } finally {
      this._abortCtrl = null;
    }
  },

  async uploadPDF(file) {
    this._isCancelled = false;
    this._abortCtrl   = new AbortController();
    this.startPipelineUI();
    const form = new FormData();
    form.append('file', file);
    form.append('userId', S.user.uid);
    form.append('plan', S.abonnement?.plan ?? 'standard');
    form.append('entreprise', JSON.stringify(S.profile?.entreprise ?? {}));
    try {
      const { getAuthToken } = await import('./firebase-auth.js');
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE}/analyses/upload`, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body:    form,
        signal:  this._abortCtrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.analyseId && !this._isCancelled) {
        S.waitingForResult = true;
        S.pendingAnalyseId = data.analyseId;
      }
    } catch(err) {
      if (err.name === 'AbortError' || this._isCancelled) return;
      this.stopPipelineUI();
      showToast('Erreur upload PDF', 'err');
    } finally {
      this._abortCtrl = null;
    }
  },

  // ── Upload PDF OCR/IA ──────────────────────────────────────
  async uploadPDFOcr(file) {
    this._isCancelled = false;
    this._abortCtrl   = new AbortController();
    this.startPipelineUI();
    // Personnaliser les steps pour l'OCR
    const ocrSteps = [
      { l:'Conversion PDF → images',              i:'fa-file-image'     },
      { l:'OCR multi-stratégie (3 passes)',        i:'fa-eye'            },
      { l:'Reconnaissance labels financiers',      i:'fa-magnifying-glass'},
      { l:'Extraction valeurs + nettoyage',        i:'fa-filter'         },
      { l:'Validation données extraites',          i:'fa-check-double'   },
      { l:'Pipeline ML : RF + XGBoost + LightGBM', i:'fa-circle-notch'  },
      { l:'SHAP + recommandations IA',             i:'fa-lightbulb'      },
    ];
    const stps = document.getElementById('pl-steps');
    if (stps) stps.innerHTML = ocrSteps.map((s, i) =>
      `<div class="pl-step wait" id="pso${i}">
         <div class="pl-icon"><i class="fa-solid ${s.i}"></i></div>
         <div class="pl-lbl">${s.l}</div>
       </div>`).join('');

    const form = new FormData();
    form.append('file',       file);
    form.append('userId',     S.user.uid);
    form.append('plan',       S.abonnement?.plan ?? 'standard');
    form.append('entreprise', JSON.stringify(S.profile?.entreprise ?? {}));
    try {
      const { getAuthToken } = await import('./firebase-auth.js');
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE}/analyses/upload/ocr`, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body:    form,
        signal:  this._abortCtrl?.signal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const method = data.status?.split('_').slice(2).join(' ') || 'ocr';
      showToast(`✓ Extraction OCR réussie (${method})`, 'ok');
      if (data.analyseId) { S.waitingForResult = true; S.pendingAnalyseId = data.analyseId; }
    } catch (err) {
      this.stopPipelineUI();
      if (err.name === 'AbortError' || this._isCancelled) return;
      if (err.message?.includes('Failed to fetch') || err.message?.includes('501')) {
        showToast("OCR non disponible — essayez l'extraction par tableaux", 'warn');
      } else {
        showToast('OCR : ' + (err.message || 'Erreur inconnue'), 'err');
      }
    } finally {
      this._abortCtrl = null;
    }
  },

  // ── What-If Simulator ──────────────────────────────────────
  async simulate() {
    if (!S.currentAnalyse) return;
    const { normalizeWI, normalizeRatios } = window.DS_RENDER;
    const wi=normalizeWI(
      S.currentAnalyse.whatifParams||S.currentAnalyse.wi||[],
      normalizeRatios(S.currentAnalyse.ratios||S.currentAnalyse.financialRatios||[])
    );
    const overrides={};
    wi.forEach(w=>{ const el=document.getElementById(w.id); if(el) overrides[w.l]=parseFloat(el.value); });
    const deltaEl=document.getElementById('wi-delta');
    if(deltaEl){deltaEl.textContent='…'; deltaEl.style.color='var(--muted)';}
    try {
      const { fetchWithAuth } = await import('./utils.js');
      const response=await fetchWithAuth(`${API_BASE}/analyses/whatif`,{
        method:'POST',
        body:JSON.stringify({ analyseId:S.currentAnalyse.id, ratioOverrides:overrides }),
      });
      if(!response.ok) throw new Error(`HTTP ${response.status}`);
      const res=await response.json();
      const delta=Math.round((res.simulatedScore-S.currentAnalyse.score)*10)/10;
      if(deltaEl){
        deltaEl.textContent=(delta>=0?'+':'')+delta;
        deltaEl.style.color=delta>=0?'var(--emerald)':'var(--ruby)';
        deltaEl.style.animation='none'; deltaEl.offsetHeight; deltaEl.style.animation='mIn .4s ease';
      }
      this._showToast(`Score simulé : ${res.simulatedScore}/100`,delta>=0?'ok':'warn');
    } catch { this._simulateLocal(wi); }
  },


  // ── Rapport qualité LLM — affiché dans le modal après analyse ──
  _showLLMReport(res) {
    const report  = document.getElementById('_llm-report');
    const confVal = document.getElementById('_llm-conf-val');
    const confFill= document.getElementById('_llm-conf-fill');
    const synthese= document.getElementById('_llm-synthese');
    const corrections = document.getElementById('_llm-corrections');
    const anomalies   = document.getElementById('_llm-anomalies');

    if (!report) return;
    report.classList.add('visible');

    const conf  = res.score_confiance || 0;
    const color = conf >= 70 ? '#10b981' : conf >= 40 ? '#f59e0b' : '#ef4444';

    if (confVal)  confVal.textContent  = conf + '%';
    if (confVal)  confVal.style.color  = color;
    if (confFill) { confFill.style.width = conf + '%'; confFill.style.background = color; }
    if (synthese) synthese.textContent = res.synthese_llm || '';

    // LLM utilisé
    const badge = document.getElementById('_llm-badge');
    if (badge && res.llm_used) {
      badge.textContent = res.llm_used.includes('groq') ? 'GROQ · Llama' : 'Gemini Flash';
    }

    // Anomalies (si présentes)
    if (anomalies && res.anomalies_count > 0) {
      anomalies.innerHTML = `<div class="llm-anomaly-item">
        <i class="fa-solid fa-triangle-exclamation" style="margin-right:4px;"></i>
        ${res.anomalies_count} anomalie${res.anomalies_count > 1 ? 's' : ''} détectée${res.anomalies_count > 1 ? 's' : ''}
      </div>`;
    }

    // Corrections count
    if (corrections && res.corrections_count > 0) {
      corrections.innerHTML = `<div class="llm-correction-item">
        <i class="fa-solid fa-check" style="color:#10b981;margin-right:4px;"></i>
        ${res.corrections_count} correction${res.corrections_count > 1 ? 's' : ''} appliquée${res.corrections_count > 1 ? 's' : ''}
      </div>`;
    }
  },

  _simulateLocal(wi) {
    let delta=0;
    wi.forEach((w,i)=>{
      const el=document.getElementById(w.id); if(!el) return;
      const diff=parseFloat(el.value)-w.cur;
      if(i===0) delta+=diff*8; else if(i===1) delta+=diff*1.2; else delta-=diff*12;
    });
    delta=Math.round(delta*10)/10;
    const el=document.getElementById('wi-delta');
    if(el){
      el.textContent=(delta>=0?'+':'')+delta;
      el.style.color=delta>=0?'var(--emerald)':'var(--ruby)';
      el.style.animation='none'; el.offsetHeight; el.style.animation='mIn .4s ease';
    }
  },
};

console.log('[ds-upload] ✓ Chargé');