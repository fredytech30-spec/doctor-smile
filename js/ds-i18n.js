// ════════════════════════════════════════════════════════════════
//  ds-i18n.js — Doctor Smile · Internationalisation
//
//  Stratégie : chaque texte statique du dashboard est ciblé par
//  un sélecteur CSS précis. Pas besoin de modifier le HTML.
//  applyTranslations() parcourt la MAP et remplace directement
//  textContent / innerHTML / placeholder dans le DOM.
//
//  Usage : window.DS_I18N.changeLang('en')
// ════════════════════════════════════════════════════════════════

const DICT = {
  fr: {
    // ── NAV ──────────────────────────────────────────────────
    '[data-view="dashboard"] .nav-tip':    'Dashboard',
    '[data-view="analyses"] .nav-tip':     'Analyses',
    '[data-view="chat"] .nav-tip':         'Chat IA',
    '[data-view="visualisations"] .nav-tip':'Visuels 3D',
    '[data-view="rapports"] .nav-tip':     'Rapports',
    '[data-view="parametres"] .nav-tip':   'Paramètres',
    '#nav-logout .nav-tip':                'Déconnexion',
    // ── SIDEBAR ──────────────────────────────────────────────
    '.sidebar-title':                      'Analyses récentes',
    '#sidebar input[type="text"]':         {ph:'Rechercher…'},
    '.btn-new':                            '+ Nouvelle analyse',
    '.sidebar-section-lbl':                'Ce mois',
    // ── TOPBAR ───────────────────────────────────────────────
    _greeting:                             'Bonjour',
    _bilan:                                'voici votre bilan',
    // ── KPI ──────────────────────────────────────────────────
    '.kpi:nth-child(1) .kpi-lbl':         'Score santé actuel',
    '.kpi:nth-child(2) .kpi-lbl':         'Analyses effectuées',
    '.kpi:nth-child(3) .kpi-lbl':         'Indice de confiance',
    '.kpi:nth-child(4) .kpi-lbl':         'Vitesse d\'analyse',
    // ── UPLOAD ───────────────────────────────────────────────
    '.upload-title':                       'Déposez votre fichier financier',
    '.upload-sub':                         'Excel · CSV · PDF · ODS · JSON — ou cliquez pour parcourir',
    // ── PIPELINE ─────────────────────────────────────────────
    '.pl-title':                           {keep:'fa-solid fa-bolt', text:'Pipeline ML en cours'},
    // ── CHAT ─────────────────────────────────────────────────
    '#chat-inp':                           {ph:'Posez une question sur votre analyse…'},
    '.chat-head-title':                    {keep:'fa-solid fa-robot', text:'Analyste IA · Doctor Smile'},
    // ── WHAT-IF ──────────────────────────────────────────────
    '.wi-btn':                             {keep:'fa-solid fa-play', text:'Simuler'},
    '.wi-result > div:last-child':         'Ajustez les curseurs pour simuler l\'impact de chaque levier.',
    // ── VUES — titres ────────────────────────────────────────
    '#view-analyses .view-title':          'Mes <span class="g">Analyses</span>',
    '#view-visualisations .view-title':    'Visualisations <span class="g">analytiques</span>',
    '#view-rapports .view-title':          'Mes <span class="g">Rapports</span>',
    '#view-parametres .view-title':        'Mes <span class="g">Paramètres</span>',
    '#view-alertes .view-title':           'Mes <span class="g">Alertes</span>',
    '#view-benchmark .view-title':         'Benchmark <span class="g">Sectoriel</span>',
    // ── VUES — sous-titres ───────────────────────────────────
    '#viz-sub':                            'Chargez une analyse pour afficher les graphes',
    '#view-parametres .view-sub':          'Gérez votre profil et vos préférences',
    '#view-analyses .an-open-btn':         {keep:'fa-solid fa-plus', text:'Nouvelle analyse'},
    // ── PARAMETRES sections ──────────────────────────────────
    _paramSections: ['Photo de profil','Profil utilisateur','Abonnement','Langue & Région','Sécurité','À propos'],
  },

  en: {
    '[data-view="dashboard"] .nav-tip':    'Dashboard',
    '[data-view="analyses"] .nav-tip':     'Analyses',
    '[data-view="chat"] .nav-tip':         'AI Chat',
    '[data-view="visualisations"] .nav-tip':'3D Visuals',
    '[data-view="rapports"] .nav-tip':     'Reports',
    '[data-view="parametres"] .nav-tip':   'Settings',
    '#nav-logout .nav-tip':                'Logout',
    '.sidebar-title':                      'Recent Analyses',
    '#sidebar input[type="text"]':         {ph:'Search…'},
    '.btn-new':                            '+ New Analysis',
    '.sidebar-section-lbl':                'This month',
    _greeting:                             'Hello',
    _bilan:                                'here is your report',
    '.kpi:nth-child(1) .kpi-lbl':         'Current health score',
    '.kpi:nth-child(2) .kpi-lbl':         'Analyses performed',
    '.kpi:nth-child(3) .kpi-lbl':         'Confidence index',
    '.kpi:nth-child(4) .kpi-lbl':         'Analysis speed',
    '.upload-title':                       'Drop your financial file',
    '.upload-sub':                         'Excel · CSV · PDF · ODS · JSON — or click to browse',
    '.pl-title':                           {keep:'fa-solid fa-bolt', text:'ML Pipeline running'},
    '#chat-inp':                           {ph:'Ask a question about your analysis…'},
    '.chat-head-title':                    {keep:'fa-solid fa-robot', text:'AI Analyst · Doctor Smile'},
    '.wi-btn':                             {keep:'fa-solid fa-play', text:'Simulate'},
    '.wi-result > div:last-child':         'Adjust sliders to simulate the impact of each lever.',
    '#view-analyses .view-title':          'My <span class="g">Analyses</span>',
    '#view-visualisations .view-title':    'Analytical <span class="g">Visualizations</span>',
    '#view-rapports .view-title':          'My <span class="g">Reports</span>',
    '#view-parametres .view-title':        'My <span class="g">Settings</span>',
    '#view-alertes .view-title':           'My <span class="g">Alerts</span>',
    '#view-benchmark .view-title':         'Sector <span class="g">Benchmark</span>',
    '#viz-sub':                            'Load an analysis to display charts',
    '#view-parametres .view-sub':          'Manage your profile and preferences',
    '#view-analyses .an-open-btn':         {keep:'fa-solid fa-plus', text:'New Analysis'},
    _paramSections: ['Profile photo','User profile','Subscription','Language & Region','Security','About'],
  },

  es: {
    '[data-view="dashboard"] .nav-tip':    'Panel',
    '[data-view="analyses"] .nav-tip':     'Análisis',
    '[data-view="chat"] .nav-tip':         'Chat IA',
    '[data-view="visualisations"] .nav-tip':'Visuales 3D',
    '[data-view="rapports"] .nav-tip':     'Informes',
    '[data-view="parametres"] .nav-tip':   'Ajustes',
    '#nav-logout .nav-tip':                'Cerrar sesión',
    '.sidebar-title':                      'Análisis recientes',
    '#sidebar input[type="text"]':         {ph:'Buscar…'},
    '.btn-new':                            '+ Nuevo análisis',
    '.sidebar-section-lbl':                'Este mes',
    _greeting:                             'Hola',
    _bilan:                                'aquí está su informe',
    '.kpi:nth-child(1) .kpi-lbl':         'Puntuación de salud',
    '.kpi:nth-child(2) .kpi-lbl':         'Análisis realizados',
    '.kpi:nth-child(3) .kpi-lbl':         'Índice de confianza',
    '.kpi:nth-child(4) .kpi-lbl':         'Velocidad de análisis',
    '.upload-title':                       'Suelte su archivo financiero',
    '.upload-sub':                         'Excel · CSV · PDF · ODS · JSON — o haga clic para explorar',
    '.pl-title':                           {keep:'fa-solid fa-bolt', text:'Pipeline ML en curso'},
    '#chat-inp':                           {ph:'Haga una pregunta sobre su análisis…'},
    '.chat-head-title':                    {keep:'fa-solid fa-robot', text:'Analista IA · Doctor Smile'},
    '.wi-btn':                             {keep:'fa-solid fa-play', text:'Simular'},
    '.wi-result > div:last-child':         'Ajuste los controles para simular el impacto de cada palanca.',
    '#view-analyses .view-title':          'Mis <span class="g">Análisis</span>',
    '#view-visualisations .view-title':    'Visualizaciones <span class="g">analíticas</span>',
    '#view-rapports .view-title':          'Mis <span class="g">Informes</span>',
    '#view-parametres .view-title':        'Mis <span class="g">Ajustes</span>',
    '#view-alertes .view-title':           'Mis <span class="g">Alertas</span>',
    '#view-benchmark .view-title':         'Benchmark <span class="g">Sectorial</span>',
    '#viz-sub':                            'Cargue un análisis para ver los gráficos',
    '#view-parametres .view-sub':          'Gestione su perfil y preferencias',
    '#view-analyses .an-open-btn':         {keep:'fa-solid fa-plus', text:'Nuevo análisis'},
    _paramSections: ['Foto de perfil','Perfil de usuario','Suscripción','Idioma y región','Seguridad','Acerca de'],
  },

  ar: {
    '[data-view="dashboard"] .nav-tip':    'لوحة التحكم',
    '[data-view="analyses"] .nav-tip':     'التحليلات',
    '[data-view="chat"] .nav-tip':         'محادثة الذكاء',
    '[data-view="visualisations"] .nav-tip':'مرئيات 3D',
    '[data-view="rapports"] .nav-tip':     'التقارير',
    '[data-view="parametres"] .nav-tip':   'الإعدادات',
    '#nav-logout .nav-tip':                'تسجيل الخروج',
    '.sidebar-title':                      'التحليلات الأخيرة',
    '#sidebar input[type="text"]':         {ph:'بحث…'},
    '.btn-new':                            '+ تحليل جديد',
    '.sidebar-section-lbl':                'هذا الشهر',
    _greeting:                             'مرحباً',
    _bilan:                                'إليك تقريرك',
    '.kpi:nth-child(1) .kpi-lbl':         'نقاط الصحة الحالية',
    '.kpi:nth-child(2) .kpi-lbl':         'التحليلات المنجزة',
    '.kpi:nth-child(3) .kpi-lbl':         'مؤشر الثقة',
    '.kpi:nth-child(4) .kpi-lbl':         'سرعة التحليل',
    '.upload-title':                       'أسقط ملفك المالي هنا',
    '.upload-sub':                         'Excel · CSV · PDF · ODS · JSON — أو انقر للتصفح',
    '.pl-title':                           {keep:'fa-solid fa-bolt', text:'جارٍ تشغيل نموذج ML'},
    '#chat-inp':                           {ph:'اطرح سؤالاً حول تحليلك…'},
    '.chat-head-title':                    {keep:'fa-solid fa-robot', text:'محلل الذكاء الاصطناعي · Doctor Smile'},
    '.wi-btn':                             {keep:'fa-solid fa-play', text:'محاكاة'},
    '.wi-result > div:last-child':         'اضبط المنزلقات لمحاكاة تأثير كل رافعة.',
    '#view-analyses .view-title':          'تحليلاتي <span class="g">الكاملة</span>',
    '#view-visualisations .view-title':    'المرئيات <span class="g">التحليلية</span>',
    '#view-rapports .view-title':          'تقاريري',
    '#view-parametres .view-title':        '<span class="g">الإعدادات</span>',
    '#view-alertes .view-title':           'تنبيهاتي',
    '#view-benchmark .view-title':         'المقارنة <span class="g">المعيارية</span>',
    '#viz-sub':                            'حمّل تحليلاً لعرض الرسوم البيانية',
    '#view-parametres .view-sub':          'إدارة ملفك الشخصي وتفضيلاتك',
    '#view-analyses .an-open-btn':         {keep:'fa-solid fa-plus', text:'تحليل جديد'},
    _paramSections: ['صورة الملف الشخصي','الملف الشخصي','الاشتراك','اللغة والمنطقة','الأمان','حول'],
  },
};

// ── État ─────────────────────────────────────────────────────────
let _lang = localStorage.getItem('ds_lang') || 'fr';

// ════════════════════════════════════════════════════════════════
//  applyTranslations() — cœur du système
// ════════════════════════════════════════════════════════════════
function applyTranslations(lang) {
  const map = DICT[lang] || DICT.fr;

  for (const [sel, val] of Object.entries(map)) {
    // Clés spéciales (underscore) traitées séparément
    if (sel.startsWith('_')) continue;

    let els;
    try { els = document.querySelectorAll(sel); } catch { continue; }
    if (!els.length) continue;

    els.forEach(el => {
      if (!val) return;

      // Cas 1 : placeholder uniquement  { ph: '…' }
      if (typeof val === 'object' && val.ph !== undefined) {
        el.placeholder = val.ph;
        return;
      }

      // Cas 2 : texte en conservant une icône <i>  { keep:'fa-…', text:'…' }
      if (typeof val === 'object' && val.keep !== undefined) {
        const icon = el.querySelector(`i.${val.keep.replace(/ /g,'.')}`)
                  || el.querySelector('i');
        if (icon) {
          el.innerHTML = '';
          el.appendChild(icon.cloneNode(true));
          el.appendChild(document.createTextNode(' ' + val.text));
        } else {
          el.textContent = val.text;
        }
        return;
      }

      // Cas 3 : innerHTML (pour <span class="g">, <div class="cdot">, etc.)
      if (typeof val === 'string') {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.placeholder = val;
        } else {
          el.innerHTML = val;
        }
      }
    });
  }

  // ── Greeting topbar ──────────────────────────────────────────
  const greetEl = document.querySelector('.topbar-greeting');
  if (greetEl) {
    const uname = document.getElementById('uname');
    const name  = uname?.textContent?.trim() || '…';
    greetEl.innerHTML =
      `${map._greeting || 'Bonjour'}, <span class="g" id="uname">${name}</span>` +
      `<span style="opacity:.3;font-size:.65em;margin-left:8px;">${map._bilan || ''}</span>`;
  }

  // ── Titres des sections Paramètres (injectées dynamiquement) ──
  const sections = map._paramSections || [];
  document.querySelectorAll('.param-section-title').forEach((el, i) => {
    if (!sections[i]) return;
    // Conserver l'icône <i> si présente
    const icon = el.querySelector('i');
    if (icon) {
      el.innerHTML = '';
      el.appendChild(icon.cloneNode(true));
      el.appendChild(document.createTextNode(' ' + sections[i]));
    } else {
      el.textContent = sections[i];
    }
  });

  // ── RTL / LTR ────────────────────────────────────────────────
  const isRTL = lang === 'ar';
  document.documentElement.setAttribute('dir',  isRTL ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', lang);
  if (isRTL) _injectArabicFont();
  else document.body.style.fontFamily = '';
}

function _injectArabicFont() {
  if (document.getElementById('ds-arabic-font')) return;
  const l = document.createElement('link');
  l.id = 'ds-arabic-font'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;700;900&display=swap';
  document.head.appendChild(l);
  document.body.style.fontFamily = "'Noto Sans Arabic','Instrument Sans',sans-serif";
}

// ════════════════════════════════════════════════════════════════
//  API PUBLIQUE window.DS_I18N
// ════════════════════════════════════════════════════════════════
window.DS_I18N = {

  getLang() { return _lang; },

  async changeLang(lang) {
    if (!DICT[lang]) return;
    _lang = lang;
    localStorage.setItem('ds_lang', lang);

    // Firestore
    try {
      const { db, auth } = await import('./firebase-config.js');
      const { doc, updateDoc } = await import(
        'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js'
      );
      if (auth?.currentUser) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {'settings.lang': lang});
      }
    } catch(e) { console.warn('[i18n] Firestore:', e.message); }

    // Appliquer au DOM
    applyTranslations(lang);

    // Mettre à jour les cartes de sélection
    document.querySelectorAll('#lang-grid button[data-lang]').forEach(btn => {
      const active = btn.dataset.lang === lang;
      btn.style.background  = active ? 'rgba(56,189,248,.08)' : 'rgba(255,255,255,.04)';
      btn.style.borderColor = active ? 'rgba(56,189,248,.4)'  : 'rgba(125,211,252,.1)';
      const lbl = btn.querySelector('span:nth-child(2)');
      if (lbl) lbl.style.color = active ? 'var(--ice)' : 'rgba(255,255,255,.45)';
      btn.querySelector('.lang-chk')?.remove();
      if (active) {
        const chk = document.createElement('span');
        chk.className = 'lang-chk';
        chk.style.cssText = 'position:absolute;top:5px;right:5px;width:14px;height:14px;' +
          'border-radius:50%;background:var(--ice-2);color:#02040B;font-size:7px;' +
          'display:flex;align-items:center;justify-content:center;';
        chk.innerHTML = '<i class="fa-solid fa-check"></i>';
        btn.appendChild(chk);
      }
    });

    // Feedback
    const fb = document.getElementById('lang-feedback');
    const labels = {fr:'Français', en:'English', es:'Español', ar:'العربية'};
    if (fb) {
      fb.textContent = `✓ ${labels[lang]} sélectionné`;
      setTimeout(() => { if(fb) fb.textContent = ''; }, 2500);
    }

    window.dispatchEvent(new CustomEvent('ds-lang-change', {detail:{lang}}));
  },

  // Ré-appliquer après re-render d'une vue
  refresh() { applyTranslations(_lang); },
};

// ── Appliquer au chargement ───────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => applyTranslations(_lang));
} else {
  applyTranslations(_lang);
}

// Ré-appliquer 80ms après chaque changement (laisse le temps au DOM de se reconstruire)
window.addEventListener('ds-lang-change', e =>
  setTimeout(() => applyTranslations(e.detail.lang), 80)
);

console.log('[ds-i18n] ✓ Chargé — langue:', _lang);