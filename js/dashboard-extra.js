// dashboard-extra.js  —  Doctor Smile  v5
// Palette harmonisée – Tous les styles inline remplacés par des variables CSS
// Requiert Three.js r128 (window.THREE) + Chart.js 4 (window.Chart)

// ── Utilitaires ─────────────────────────────────────────────────
function _toast(msg, type) {
  const typeMap = {
    err:  'error',
    warn: 'warning',
    info: 'info',
    ok:   'success'
  };
  const dsType = typeMap[type] || 'success';
  if (window.Toast) {
    window.Toast.show(msg, { type: dsType });
  } else {
    console.log(`[Toast Fallback] ${type}: ${msg}`);
  }
}

function _confirm(title, body, label) {
  if (window.Modal) {
    return window.Modal.confirm(title, body, { 
      confirmLabel: label || 'Confirmer',
      size: 'small'
    });
  }
  
  // Fallback if Modal is not available
  return new Promise(function(ok) {
    var o = document.createElement('div');
    o.className = 'ds-confirm-overlay';
    o.innerHTML = `
      <div class="ds-confirm-box">
        <div class="ds-confirm-title">${title}</div>
        <div class="ds-confirm-body">${body}</div>
        <div class="ds-confirm-actions">
          <button class="ds-confirm-cancel">Annuler</button>
          <button class="ds-confirm-ok">${label || 'Confirmer'}</button>
        </div>
      </div>`;
    document.body.appendChild(o);
    o.querySelector('.ds-confirm-cancel').onclick = function() { o.remove(); ok(false); };
    o.querySelector('.ds-confirm-ok').onclick = function() { o.remove(); ok(true); };
    o.onclick = function(e) { if (e.target === o) { o.remove(); ok(false); } };
  });
}

function _cleanEl(id){
  var el=document.getElementById(id);if(!el)return null;
  if(el._dsCleanup){try{el._dsCleanup();}catch(e){}delete el._dsCleanup;}
  el.innerHTML='';return el;
}

function _destroyChart(cid){
  if(!window._dsCharts)return;
  var ch=window._dsCharts[cid];
  if(ch){try{ch.destroy();}catch(e){}delete window._dsCharts[cid];}
}

function _saveChart(cid,ch){
  if(!window._dsCharts)window._dsCharts={};
  window._dsCharts[cid]=ch;
}

function _chatBtn(container,prompt){
  if(!container)return;
  var ex=container.querySelector('._dscb');if(ex)ex.remove();
  if(getComputedStyle(container).position==='static')container.style.position='relative';
  var b=document.createElement('button');
  b.className='_dscb ds-chat-btn';
  b.textContent='💬 Expliquer';
  b.addEventListener('click',function(){_sendToChat(prompt);});
  container.appendChild(b);
}

function _sendToChat(prompt){
  if(window.DS&&window.DS.navTo)window.DS.navTo('chat');
  setTimeout(function(){
    var inp=document.getElementById('chat-inp-full')||document.getElementById('chat-inp');
    if(inp){inp.value=prompt;inp.dispatchEvent(new Event('input'));if(window.DS&&window.DS.sendChatFull)window.DS.sendChatFull();}
  },380);
}

// ════ GRAPHES 3D ════════════════════════════════════════════════

function render3DGlobe(cid,score,zone){
  var T=window.THREE;
  if(!T){setTimeout(function(){render3DGlobe(cid,score,zone);},400);return;}
  var el=_cleanEl(cid);if(!el)return;
  var W=el.clientWidth||280,H=el.clientHeight||200;
  if(W<10){setTimeout(function(){render3DGlobe(cid,score,zone);},250);return;}
  var sc=new T.Scene(),cam=new T.PerspectiveCamera(45,W/H,.1,100);
  var ren=new T.WebGLRenderer({antialias:true,alpha:true});
  ren.setSize(W,H);ren.setClearColor(0,0);el.appendChild(ren.domElement);
  cam.position.set(0,0,3.6);
  sc.add(new T.AmbientLight(0xffffff,.35));
  var pl=new T.PointLight(0x7DD3FC,2.5,12);pl.position.set(3,4,4);sc.add(pl);
  var ZC={saine:0x10b981,vigilance:0xf59e0b,risque:0xf97316,critique:0xef4444};
  var col=ZC[zone]||0xf59e0b;
  var globe=new T.Mesh(new T.SphereGeometry(1,64,64),new T.MeshPhongMaterial({color:col,shininess:100,transparent:true,opacity:.82}));
  sc.add(globe);
  sc.add(new T.Mesh(new T.SphereGeometry(1.02,18,18),new T.MeshBasicMaterial({color:0xffffff,wireframe:true,transparent:true,opacity:.05})));
  var ring=new T.Mesh(new T.TorusGeometry(1.42,.03,8,80),new T.MeshPhongMaterial({color:0x7DD3FC,shininess:150}));
  ring.rotation.x=Math.PI/3.5;sc.add(ring);
  var nPts=Math.floor((1-score/100)*32)+5;
  for(var i=0;i<nPts;i++){
    var phi=Math.acos(2*Math.random()-1),theta=2*Math.PI*Math.random();
    var pt=new T.Mesh(new T.SphereGeometry(.04,8,8),new T.MeshBasicMaterial({color:col}));
    pt.position.set(Math.sin(phi)*Math.cos(theta),Math.sin(phi)*Math.sin(theta),Math.cos(phi));
    globe.add(pt);
  }
  var fr;
  function anim(){fr=requestAnimationFrame(anim);globe.rotation.y+=.006;ring.rotation.z+=.004;ren.render(sc,cam);}
  anim();
  el._dsCleanup=function(){cancelAnimationFrame(fr);ren.dispose();};
  _chatBtn(el,'Globe de risque : score '+score+'/100, zone '+zone+', '+nPts+' points d\'alerte. Interprète ce niveau.');
}

function render3DBarChart(cid,ratios){
  var T=window.THREE;
  if(!T){setTimeout(function(){render3DBarChart(cid,ratios);},400);return;}
  var el=_cleanEl(cid);if(!el)return;
  if(!ratios||!ratios.length){el.innerHTML='<div class="ds-empty-chart">Données insuffisantes</div>';return;}
  var W=el.clientWidth||280,H=el.clientHeight||200;
  if(W<10){setTimeout(function(){render3DBarChart(cid,ratios);},250);return;}
  var sc=new T.Scene(),cam=new T.PerspectiveCamera(50,W/H,.1,200);
  var ren=new T.WebGLRenderer({antialias:true,alpha:true});
  ren.setSize(W,H);ren.setClearColor(0,0);el.appendChild(ren.domElement);
  cam.position.set(0,4,9);cam.lookAt(0,0,0);
  sc.add(new T.AmbientLight(0xffffff,.6));
  var dl=new T.DirectionalLight(0x7DD3FC,1.2);dl.position.set(6,8,6);sc.add(dl);
  var top5=ratios.slice(0,5),SC={green:0x10b981,yellow:0xf59e0b,red:0xef4444},GAP=1.6;
  var startX=-(top5.length-1)*GAP/2;
  for(var i=0;i<top5.length;i++){
    var r=top5[i],x=startX+i*GAP,h=Math.max(.12,(r.p||50)/28),color=SC[r.s]||0x7DD3FC;
    var bar=new T.Mesh(new T.BoxGeometry(.82,h,.82),new T.MeshPhongMaterial({color:color,shininess:80,transparent:true,opacity:.92}));
    bar.position.set(x,h/2-.4,0);sc.add(bar);
    var cap=new T.Mesh(new T.BoxGeometry(.82,.04,.82),new T.MeshPhongMaterial({color:0xffffff,shininess:200,transparent:true,opacity:.3}));
    cap.position.set(x,h-.4+.02,0);sc.add(cap);
    var bm=new T.Mesh(new T.BoxGeometry(.82,.04,.82),new T.MeshBasicMaterial({color:0xFFD700}));
    bm.position.set(x,1.55,0);sc.add(bm);
  }
  var floor=new T.Mesh(new T.PlaneGeometry(top5.length*GAP+2,4),new T.MeshBasicMaterial({color:0x0a0e1a,transparent:true,opacity:.35}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-.4;sc.add(floor);
  var angle=.3,fr;
  function anim(){fr=requestAnimationFrame(anim);angle+=.004;cam.position.x=Math.sin(angle)*10;cam.position.z=Math.cos(angle)*10;cam.lookAt(0,0,0);ren.render(sc,cam);}
  anim();
  el._dsCleanup=function(){cancelAnimationFrame(fr);ren.dispose();};
  _chatBtn(el,'Bar 3D des ratios : '+top5.map(function(r){return r.n+'='+r.v;}).join(', ')+'. Barres dorées = benchmarks. Analyse les écarts.');
}

// ════ GRAPHES 2D (Chart.js) ════════════════════════════════════

function renderWaterfallChart(cid,shapValues){
  var C=window.Chart;if(!C){setTimeout(function(){renderWaterfallChart(cid,shapValues);},400);return;}
  var el=document.getElementById(cid);if(!el)return;
  _destroyChart('c_'+cid);
  if(!shapValues||!shapValues.length){el.innerHTML='<div class="ds-empty-chart">Facteurs SHAP non disponibles</div>';return;}
  var top7=shapValues.slice(0,7);
  el.innerHTML='<canvas id="c_'+cid+'" style="width:100%;height:100%;"></canvas>';
  el.style.position='relative';
  var canvas=document.getElementById('c_'+cid);
  var values=top7.map(function(s){return parseFloat(s.value||s.v||0);});
  var ch=new C(canvas,{
    type:'bar',
    data:{
      labels:top7.map(function(s){return (s.feature||s.n||'').slice(0,22);}),
      datasets:[{label:'Impact SHAP',data:values,backgroundColor:values.map(function(v){return v>=0?'rgba(16,185,129,.78)':'rgba(239,68,68,.78)';}),borderColor:values.map(function(v){return v>=0?'#10b981':'#ef4444';}),borderWidth:1.5,borderRadius:5}]
    },
    options:{
      responsive:true,maintainAspectRatio:false,indexAxis:'y',
      plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return (ctx.parsed.x>=0?'+':'')+ctx.parsed.x.toFixed(3);}}}},
      scales:{
        x:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'var(--text-2)',font:{family:'Syne',size:9}},border:{color:'var(--border)'}},
        y:{grid:{display:false},ticks:{color:'var(--text-2)',font:{family:'Syne',size:9}},border:{display:false}}
      }
    }
  });
  _saveChart('c_'+cid,ch);
  _chatBtn(el,'Facteurs SHAP : '+top7.slice(0,4).map(function(s){return (s.feature||s.n)+'='+(s.value||s.v);}).join(', ')+'. Quels facteurs augmentent/diminuent le risque ? Recommandations ?');
}

function renderBulletRatios(cid,ratios){
  var C=window.Chart;if(!C){setTimeout(function(){renderBulletRatios(cid,ratios);},400);return;}
  var el=document.getElementById(cid);if(!el)return;
  _destroyChart('c_'+cid);
  if(!ratios||!ratios.length){el.innerHTML='<div class="ds-empty-chart">Données manquantes</div>';return;}
  var top6=ratios.slice(0,6);
  el.innerHTML='<canvas id="c_'+cid+'" style="width:100%;height:100%;"></canvas>';
  el.style.position='relative';
  var canvas=document.getElementById('c_'+cid);
  var ch=new C(canvas,{
    type:'bar',
    data:{
      labels:top6.map(function(r){return r.n||'';}),
      datasets:[
        {label:'Score ratio',data:top6.map(function(r){return r.p||50;}),backgroundColor:top6.map(function(r){if(r.s==='green')return 'rgba(16,185,129,.75)';if(r.s==='red')return 'rgba(239,68,68,.75)';return 'rgba(245,158,11,.75)';}),borderRadius:5,borderSkipped:false},
        {label:'Objectif 75',data:top6.map(function(){return 75;}),type:'line',borderColor:'rgba(255,215,0,.55)',backgroundColor:'transparent',borderWidth:1.5,borderDash:[5,4],pointRadius:0,tension:0}
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{color:'var(--text-2)',font:{family:'Syne',size:9}}}},
      scales:{
        x:{grid:{display:false},ticks:{color:'var(--text-2)',font:{family:'Syne',size:8}},border:{color:'var(--border)'}},
        y:{min:0,max:100,grid:{color:'var(--border)'},ticks:{color:'var(--text-2)',font:{family:'Syne',size:8}},border:{color:'var(--border)'}}
      }
    }
  });
  _saveChart('c_'+cid,ch);
  _chatBtn(el,'Scores ratios : '+top6.map(function(r){return r.n+'='+r.p+'%';}).join(', ')+'. Ligne dorée = objectif 75. Quels ratios sont sous la cible ?');
}

function renderHeatmap(cid,ratios){
  var el=document.getElementById(cid);if(!el||!ratios||!ratios.length)return;
  el.style.position='relative';el.innerHTML='';
  var g=document.createElement('div');g.className='ds-heatmap-grid';
  ratios.slice(0,9).forEach(function(r){
    var sClass = r.s === 'green' ? 'heatmap-green' : r.s === 'red' ? 'heatmap-red' : 'heatmap-yellow';
    var cell=document.createElement('div');
    cell.className='ds-heatmap-cell ' + sClass;
    (function(ratio){cell.addEventListener('click',function(){_sendToChat('Explique le ratio '+ratio.n+' = '+ratio.v+(ratio.u||'')+'. Référence : '+ratio.b+'. Statut : '+ratio.s+'. Que signifie ce niveau et comment l\'améliorer ?');});})(r);
    cell.innerHTML=`
      <div class="heatmap-name">${(r.n||'').slice(0,14)}</div>
      <div class="heatmap-value">${r.v}${r.u||''}</div>
      <div class="heatmap-ref">réf: ${r.b||'—'}</div>`;
    g.appendChild(cell);
  });
  el.appendChild(g);
  _chatBtn(el,'Heatmap ratios : '+ratios.slice(0,6).map(function(r){return r.n+'='+r.v+(r.u||'')+' ('+r.s+')';}).join(', ')+'. Identifie les zones critiques.');
}

// ════ PRÉVISION INTERACTIVE ══════════════════════════════════════

function renderFailureForecast(cid,score,zone){
  var el=document.getElementById(cid);if(!el)return;
  var ZM={saine:.6,vigilance:1.0,risque:1.3,critique:1.6};
  var DECAY={saine:.97,vigilance:.94,risque:.90,critique:.85};
  var base=Math.min(98,Math.round((100-score)*(ZM[zone]||1)*.85));
  var decay=DECAY[zone]||.94;

  function cProb(m){return Math.min(99,Math.round(100-(100-base)*Math.pow(decay,m/12)));}
  function mLabel(m){if(m<12)return m+' mois';var y=m/12;return (y===Math.floor(y)?y:y.toFixed(1))+' an'+(y>1?'s':'');}
  function pClass(p){return p>70?'gauge-danger':p>45?'gauge-warning2':p>25?'gauge-accent':'gauge-ok';}

  function buildSparkline(selMonth){
    var steps=[0,3,6,12,24,36,48,60];
    var probs=steps.map(function(m){return m===0?base:cProb(m);});
    var TW=220,TH=44,p2=6;
    var sp=steps.map(function(m,i){return {x:p2+(i/Math.max(steps.length-1,1))*(TW-p2*2),y:TH-p2-((probs[i])/(100))*(TH-p2*2)};});
    var sline=sp.map(function(p,i){return (i===0?'M':'L')+p.x.toFixed(1)+','+p.y.toFixed(1);}).join(' ');
    var sarea='M'+sp[0].x+','+TH+' '+sp.map(function(p){return 'L'+p.x.toFixed(1)+','+p.y.toFixed(1);}).join(' ')+' L'+sp[sp.length-1].x+','+TH+' Z';
    var selIdx=steps.indexOf(selMonth);if(selIdx<0)selIdx=steps.length-1;
    var selP=sp[selIdx]||sp[sp.length-1];
    var uid2='sp_'+cid+'_'+Date.now();
    return `<svg viewBox="0 0 ${TW} ${TH}" class="fc-sparkline" preserveAspectRatio="none">
      <defs><linearGradient id="${uid2}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--color-primary-dark)" stop-opacity=".2"/><stop offset="100%" stop-color="var(--color-primary-dark)" stop-opacity="0"/></linearGradient></defs>
      <path d="${sarea}" fill="url(#${uid2})" />
      <path d="${sline}" fill="none" stroke="var(--color-primary-dark)" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="${selP.x.toFixed(1)}" cy="${selP.y.toFixed(1)}" r="4" fill="var(--text)" stroke="var(--color-primary-dark)" stroke-width="2"/>
    </svg>`;
  }

  function buildBars(selMonth){
    var ms=[3,6,12,24,36,60];
    return ms.map(function(m){
      var p2=cProb(m),cClass=pClass(p2),isA=m===selMonth;
      var barW=Math.min(96,p2)+'%';
      return `<div onclick="window._fcSet(${m})" class="fc-bar-row${isA?' fc-bar-active':''}">
        <div class="fc-bar-header">
          <span class="fc-bar-label">${mLabel(m)}</span>
          <span class="fc-bar-value ${cClass}">${p2}%</span>
        </div>
        <div class="fc-bar-bg"><div class="fc-bar-fill ${cClass}" style="width:${barW};"></div></div>
      </div>`;
    }).join('');
  }

  function renderForecast(months){
    var prob=cProb(months),pcClass=pClass(prob),lbl=mLabel(months);
    var aiPrompt='Pour score '+score+'/100 en zone '+zone+', probabilité faillite '+prob+'% dans '+lbl+' sans action. Quels leviers activer pour inverser la tendance ?';
    el.innerHTML=`
      <div class="fc-grid">
        <div>
          <div class="fc-score-current"><span class="fc-score-label">Score actuel</span><span class="fc-score-num">${score}<span class="fc-score-sub">/100</span></span></div>
          <div class="fc-prob"><span class="fc-score-label">Dans <strong>${lbl}</strong> sans action</span><span class="fc-prob-num ${pcClass}">${prob}<span class="fc-prob-pct">%</span></span><span class="fc-prob-sub">de risque de faillite</span></div>
          <div class="fc-sparkline-wrap">${buildSparkline(months)}</div>
          <div class="fc-horizon"><span class="fc-horizon-label">Horizon</span><span class="fc-horizon-value">${lbl}</span></div>
          <input type="range" id="_fcsl_${cid}" min="1" max="60" value="${months}" step="1" class="fc-slider">
          <div class="fc-range-labels"><span>1 mois</span><span>5 ans</span></div>
          <button onclick="window.DS_EXTRA._sendToChat('${aiPrompt}')" class="fc-chat-btn">💬 Analyser ce scénario avec l'IA</button>
        </div>
        <div>
          <div class="fc-jalon-title">Jalons temporels</div>
          ${buildBars(months)}
          <div class="fc-legend">🟢 &lt;25% · 🟡 25-45% · 🟠 45-70% · 🔴 &gt;70%</div>
        </div>
      </div>`;

    var sl=document.getElementById('_fcsl_'+cid);
    if(sl)sl.addEventListener('input',function(){window._fcSet(parseInt(this.value));});
  }

  window._fcSet=function(m){renderForecast(m);};
  renderForecast(12);
}

// ════ PROFIL DRAWER ══════════════════════════════════════════════

function showProfileDrawer(){
  var ex=document.getElementById('_pfd');if(ex){ex.remove();return;}
  if(!document.getElementById('_pfdcss')){
    var s=document.createElement('style');s.id='_pfdcss';
    s.textContent='@keyframes _pfup{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}';
    document.head.appendChild(s);
  }
  var d=document.createElement('div');d.id='_pfd';
  d.className='ds-profile-drawer';
  d.innerHTML=`
    <div class="pd-head2">
      <span class="pd-title2">Mon Profil</span>
      <button onclick="document.getElementById('_pfd')?.remove()" class="pd-close2">✕</button>
    </div>
    <div class="pd-body2">
      <div class="pd-row2">
        <div id="_pdav" class="pd-avatar2">?</div>
        <div><div id="_pdnm" class="pd-name2">—</div><div id="_pdem" class="pd-email2">—</div></div>
      </div>
      <div class="pd-fields2">
        <div><div class="pd-fld-label">Plan</div><div id="_pdpl" class="badge standard">Standard</div></div>
        <div><div class="pd-fld-label">Entreprise</div><div id="_pden" class="pd-fld-val">—</div></div>
        <div><div class="pd-fld-label">Membre depuis</div><div id="_pdsi" class="pd-fld-val">—</div></div>
        <div><div class="pd-fld-label">Analyses</div><div id="_pdnb" class="pd-fld-val">—</div></div>
      </div>
      <div class="pd-actions2">
        <button onclick="window.DS?.navTo('parametres');document.getElementById('_pfd')?.remove()" class="pd-btn-params">⚙️ Paramètres</button>
        <button onclick="window.DS_LOGOUT?.()" class="pd-btn-logout2">🚪 Déconnexion</button>
      </div>
    </div>`;
  document.body.appendChild(d);
  _loadProfile();
  setTimeout(function(){document.addEventListener('click',function _h(e){if(!d.contains(e.target)&&!e.target.closest('#nav-avatar')){d.remove();document.removeEventListener('click',_h);}});},150);
}

async function _loadProfile(){
  try{
    var fa=await import('./firebase-config.js');
    var u=fa.auth.currentUser;if(!u)return;
    var init=(u.displayName||u.email||'?').split(' ').map(function(w){return w[0];}).join('').toUpperCase().slice(0,2);
    var av=document.getElementById('_pdav');if(av)av.textContent=init;
    var nm=document.getElementById('_pdnm');if(nm)nm.textContent=u.displayName||'Utilisateur';
    var em=document.getElementById('_pdem');if(em)em.textContent=u.email||'';
    var si=document.getElementById('_pdsi');
    if(si)si.textContent=u.metadata&&u.metadata.creationTime?new Date(u.metadata.creationTime).toLocaleDateString('fr-FR',{month:'long',year:'numeric'}):'—';
    var ff=await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    var ps=await ff.getDoc(ff.doc(fa.db,'users',u.uid));
    if(ps.exists()){
      var p=ps.data();
      var en=document.getElementById('_pden');if(en)en.textContent=p.entreprise&&p.entreprise.nom?p.entreprise.nom:p.entrepriseName||'—';
      var plan=p.plan||'standard';
      var pl=document.getElementById('_pdpl');if(pl){pl.textContent=plan.charAt(0).toUpperCase()+plan.slice(1);pl.className='badge '+plan;}
    }
    try{var q=ff.query(ff.collection(fa.db,'analyses'),ff.where('userId','==',u.uid));var sn=await ff.getDocs(q);var nb=document.getElementById('_pdnb');if(nb)nb.textContent=sn.size+' analyse'+(sn.size!==1?'s':'');}catch(e){}
  }catch(e){console.warn('[Profile]',e);}
}

// ════ SUPPRESSION ════════════════════════════════════════════════

async function deleteAnalyse(id,nom){
  var ok=await _confirm('🗑️ Supprimer ?','<strong>'+(nom||'Cette analyse')+'</strong> sera supprimée définitivement.','Supprimer');
  if(!ok)return;
  try{
    var token='';
    try{var fa2=await import('./firebase-config.js');token=await fa2.auth.currentUser?.getIdToken(false)||'';}catch(e){}
    await fetch((window.API_BASE || 'http://127.0.0.1:8000') + '/analyses/' + id, {method:'DELETE',headers:{Authorization:'Bearer '+token}}).catch(function(){});
    try{var fb2=await import('./firebase-config.js');var ff2=await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');await ff2.deleteDoc(ff2.doc(fb2.db,'analyses',id));}catch(e){}
    _toast('Analyse supprimée ✓');
    setTimeout(function(){location.reload();},900);
  }catch(e){_toast('Erreur : '+e.message,'err');}
}

// ════ COMPARATEUR ════════════════════════════════════════════════

function showComparator(){
  var ex=document.getElementById('_cmpm');if(ex){ex.remove();return;}
  var S=window.S||{};
  if(!S.analyses||!S.analyses.length){_toast('Aucune analyse disponible','warn');return;}
  var m=document.createElement('div');m.id='_cmpm';
  m.className='ds-comparator-overlay';
  var items=S.analyses.slice(0,8).map(function(a,i){
    return `<div class="cmp-row">
      <input type="checkbox" id="_ck_${i}" data-idx="${i}" class="cmp-cb">
      <label for="_ck_${i}" class="cmp-label">
        <div class="cmp-name">${a.entreprise||'Sans nom'}</div>
        <div class="cmp-sub">Score <span class="cmp-score">${a.score||0}</span>/100</div>
      </label>
      <div class="cmp-bigscore">${a.score||'—'}</div>
    </div>`;
  }).join('');
  m.innerHTML=`
    <div class="cmp-box">
      <div class="cmp-head">
        <div><div class="cmp-title">⚖️ Comparateur</div><div class="cmp-desc">Sélectionnez 2 à 4 analyses</div></div>
        <button onclick="document.getElementById('_cmpm')?.remove()" class="cmp-close">✕</button>
      </div>
      <div>${items}</div>
      <div id="_cmpres"></div>
      <div class="cmp-footer">
        <button onclick="window.DS_EXTRA._doComparison()" class="cmp-btn">⚡ COMPARER</button>
      </div>
    </div>`;
  document.body.appendChild(m);
  m.addEventListener('click',function(e){if(e.target===m)m.remove();});
}

function _doComparison(){
  var S=window.S||{};
  var checked=[].slice.call(document.querySelectorAll('[id^="_ck_"]:checked'));
  var sel=checked.map(function(cb){return S.analyses&&S.analyses[+cb.dataset.idx];}).filter(Boolean);
  if(sel.length<2){_toast('Sélectionnez au moins 2 analyses','warn');return;}
  var res=document.getElementById('_cmpres');if(!res)return;
  var METS=[{k:'score',l:'Score /100',b:'max'},{k:'probabiliteDefaut',l:'Prob. défaut %',b:'min'},{k:'confidence',l:'Confiance %',b:'max'},{k:'auc',l:'AUC ROC',b:'max'}];
  var rows=METS.map(function(mt){
    var vals=sel.map(function(a){return parseFloat(a[mt.k]||0);});
    var best=mt.b==='max'?Math.max.apply(null,vals):Math.min.apply(null,vals);
    return `<tr class="cmp-tr">
      <td class="cmp-td-label">${mt.l}</td>
      ${sel.map(function(a){var v=parseFloat(a[mt.k]||0),isB=(v===best);return `<td class="cmp-td-val${isB?' cmp-best':''}">${a[mt.k]||'—'}${isB?' ✓':''}</td>`;}).join('')}
    </tr>`;
  }).join('');
  res.innerHTML=`
    <div class="cmp-res-wrap">
      <table class="cmp-table"><thead><tr><th class="cmp-th">CRITÈRE</th>${sel.map(function(a){return '<th class="cmp-th">'+(a.entreprise||'—').slice(0,12)+'</th>';}).join('')}</tr></thead><tbody>${rows}</tbody></table>
      <button onclick="window.DS_EXTRA._sendToChat('Compare : '+sel.map(function(a){return a.entreprise+' score '+a.score+' zone '+a.zone;}).join(' vs ')+'. Quelle entreprise a le meilleur profil financier et pourquoi ?')" class="cmp-chat-btn">💬 Analyser avec IA</button>
    </div>`;
}

// ════ ALERTES ════════════════════════════════════════════════════

function initAlerts(analyse){
  if(!analyse)return;
  var alerts=[];
  var ratios=analyse.ratios||[];
  var redCount=ratios.filter(function(r){return (r.status||r.s)==='red';}).length;
  if(redCount>=2)alerts.push({msg:'🔴 '+redCount+' ratios critiques détectés',lvl:'err'});
  if((analyse.score||100)<25)alerts.push({msg:'💀 Score critique < 25 — urgence',lvl:'err'});
  else if((analyse.score||100)<50)alerts.push({msg:'⚠️ Zone risque — action requise',lvl:'warn'});
  if((analyse.probabiliteDefaut||0)>60)alerts.push({msg:'🚨 Probabilité faillite > 60%',lvl:'err'});
  if(!alerts.length)return;
  var av=document.getElementById('nav-avatar');
  if(av&&av.parentElement){
    av.parentElement.style.position='relative';
    var ex2=document.getElementById('_alrt');if(ex2)ex2.remove();
    var bg2=document.createElement('div');bg2.id='_alrt';
    bg2.className='nav-alert-badge';
    bg2.textContent=alerts.length;av.parentElement.appendChild(bg2);
  }
  setTimeout(function(){_toast(alerts[0].msg,alerts[0].lvl);},1200);
}

// ════ EXPORT PDF ═════════════════════════════════════════════════

function exportReport(analyse){
  if(!analyse){_toast('Aucune analyse chargée','warn');return;}
  var zone=analyse.zone||'vigilance';
  var ZL={saine:'Zone Saine',vigilance:'Zone Vigilance',risque:'Zone Risque',critique:'Zone Critique'};
  var ZBG={saine:'#d1fae5',vigilance:'#fef3c7',risque:'#fed7aa',critique:'#fee2e2'};
  var ZTX={saine:'#065f46',vigilance:'#92400e',risque:'#9a3412',critique:'#991b1b'};
  var score=analyse.score||0;
  var date=new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'});
  var ZM5={saine:.6,vigilance:1.0,risque:1.3,critique:1.6};
  var prob=Math.round((100-score)*(ZM5[zone]||1)*.85);
  var ratiosHtml=(analyse.ratios||[]).slice(0,6).map(function(r){
    var sc2=(r.status||r.s)==='green'?'#065f46':(r.status||r.s)==='red'?'#991b1b':'#92400e';
    return '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f1f5f9;font-size:11px;"><span>'+(r.name||r.n)+'</span><strong style="color:'+sc2+'">'+(r.value||r.v)+(r.unit||r.u||'')+'</strong></div>';
  }).join('');
  var recoHtml=(analyse.recommendations||[]).slice(0,3).map(function(r){
    return '<div style="padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:11px;"><strong>'+(r.title||r.t)+'</strong> — '+(r.description||r.d)+'</div>';
  }).join('');
  var html='<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Doctor Smile — Rapport</title>'
    +'<style>body{font-family:Segoe UI,sans-serif;margin:0;padding:36px;background:#fff;color:#1e293b;}.hd{background:linear-gradient(135deg,#0a0e1a,#0f1929);color:#fff;padding:28px;border-radius:12px;margin-bottom:24px;}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:18px 0;}.card{border:1px solid #e2e8f0;border-radius:10px;padding:16px;}.card h3{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin:0 0 10px;}.badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:10px;font-weight:700;background:'+ZBG[zone]+';color:'+ZTX[zone]+';}.ft{margin-top:24px;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:14px;}@media print{body{padding:18px;}}</style></head><body>'
    +'<div class="hd"><div style="font-size:22px;font-weight:900;color:#8B7FF0;margin-bottom:4px;">Doctor Smile™ — Rapport d\'analyse</div>'
    +'<div style="font-size:11px;color:rgba(255,255,255,.5);">Généré le '+date+'</div></div>'
    +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">'
    +'<div><div style="font-size:22px;font-weight:800;margin-bottom:6px;">'+(analyse.entreprise||'Entreprise')+'</div><span class="badge">'+ZL[zone]+'</span></div>'
    +'<div style="text-align:right;"><div style="font-size:56px;font-weight:900;color:'+ZTX[zone]+';line-height:1;">'+score+'</div><div style="font-size:11px;color:#64748b;">/ 100</div></div></div>'
    +'<div class="grid"><div class="card"><h3>Indicateurs clés</h3>'
    +'<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f1f5f9;font-size:11px;"><span>Risque de faillite</span><strong style="color:'+ZTX[zone]+'">'+prob+'%</strong></div>'
    +'<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f1f5f9;font-size:11px;"><span>Confiance modèle</span><strong>'+(analyse.confidence||'—')+'%</strong></div>'
    +'<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:11px;"><span>AUC ROC</span><strong>'+(analyse.auc||'—')+'</strong></div></div>'
    +'<div class="card"><h3>Ratios financiers</h3>'+ratiosHtml+'</div></div>'
    +(recoHtml?'<div class="card" style="margin-bottom:18px;"><h3>Recommandations IA</h3>'+recoHtml+'</div>':'')
    +'<div class="ft">Doctor Smile™ · Intelligence artificielle · Ne constitue pas un conseil financier réglementé</div>'
    +'</body></html>';
  var w=window.open('','_blank','width=900,height=700');
  if(w){w.document.write(html);w.document.close();setTimeout(function(){w.print();},600);}
  _toast('Rapport prêt ✓');
  setTimeout(function(){
    if(window.DS && window.DS.shareReport){
      var s=document.createElement('div');
      s.className='ds-share-toast';
      s.innerHTML='<i class="fa-solid fa-share-nodes"></i> Partager ce rapport';
      s.onclick=function(){s.remove();window.DS.shareReport(analyse&&analyse.id);};
      document.body.appendChild(s);
      setTimeout(function(){s.style.opacity='0';s.style.transition='opacity .3s';setTimeout(function(){s.remove();},320);},5000);
    }
  },800);
}

// ════ HISTORIQUE CHAT ═══════════════════════════════════════════

function renderChatHistory(){
  var list=document.getElementById('chat-history-list');if(!list)return;
  var S=window.S||{};
  if(!S.analyses||!S.analyses.length){
    list.innerHTML='<div class="chat-hist-empty"><i class="fa-solid fa-comments chat-hist-icon"></i><div>Aucune conversation</div></div>';return;
  }
  list.innerHTML=S.analyses.map(function(a){
    var zone=a.zone||(window.zoneFromScore?window.zoneFromScore(a.score||0):'vigilance');
    var isCur=S.currentAnalyse&&S.currentAnalyse.id===a.id;
    var dt=a.createdAt?(typeof a.createdAt.toDate==='function'?a.createdAt.toDate():new Date(a.createdAt)):new Date();
    var ds=dt&&!isNaN(dt)?dt.toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}):'—';
    return `<div data-aid="${a.id}" class="_chi${isCur?' _chi-active':''}">
      <div class="_chi-row">
        <div class="_chi-name">${a.entreprise||'Sans nom'}</div>
        <div class="_chi-date">${ds}</div>
      </div>
      <div class="_chi-zone-row">
        <span class="zone-badge zone-${zone}">${zone.charAt(0).toUpperCase()+zone.slice(1)}</span>
        <span class="_chi-score">${a.score}</span>
      </div>
    </div>`;
  }).join('');
  list.querySelectorAll('._chi').forEach(function(item){
    item.addEventListener('click',function(){
      var S2=window.S||{};
      var found=S2.analyses&&S2.analyses.find(function(a){return a.id===item.dataset.aid;});
      if(found){S2.chatHistory=[];var msgs=document.getElementById('chat-msgs-full');if(msgs)msgs.innerHTML='';if(window.loadAnalyse)window.loadAnalyse(found);renderChatHistory();}
    });
  });
}
window._DS_renderChatHistoryPanel=renderChatHistory;

// ════ CSS & INIT ═════════════════════════════════════════════════

function _injectCSS(){
  if(document.getElementById('_dsxcss'))return;
  var s=document.createElement('style');s.id='_dsxcss';
  s.textContent='@keyframes _pfup{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}'
    +'.ac{position:relative!important;}.ac-del{opacity:0!important;transition:opacity .2s!important;pointer-events:none;}.ac:hover .ac-del{opacity:1!important;pointer-events:all!important;}'
    +'.an-card{position:relative!important;}.an-del-btn{opacity:0!important;transition:opacity .2s!important;}.an-card:hover .an-del-btn{opacity:1!important;}'
    +'#tl-svg,#tl-svg-extra{overflow:hidden!important;display:block!important;}'
    +'._chi{transition:background .2s;cursor:pointer;}'
    +'._chi:hover{background:rgba(139,127,240,0.05)!important;}'
    +'._chi-active{background:rgba(139,127,240,0.12)!important;border-left:3px solid var(--violet)!important;}'
    +'#chat-history-list::-webkit-scrollbar{width:3px;}#chat-history-list::-webkit-scrollbar-thumb{background:rgba(139,127,240,.25);border-radius:2px;}'
    +'._dscb{pointer-events:all!important;}';
  document.head.appendChild(s);
}

function _patchAvatar(){
  var av=document.getElementById('nav-avatar');
  if(av){av.onclick=function(e){e.stopPropagation();showProfileDrawer();};av.title='Mon profil';}
}

// ════ NAVIGATION OVERFLOW & MENU PLUS ══════════════════════════

function toggleMoreMenu(event) {
  if (event) event.stopPropagation();
  const menu = document.getElementById('nav-more-menu');
  if (!menu) return;
  
  const isOpening = !menu.classList.contains('open');
  
  // Fermer si clic ailleurs
  if (isOpening) {
    menu.classList.add('open');
    const closer = (e) => {
      if (!menu.contains(e.target)) {
        menu.classList.remove('open');
        document.removeEventListener('click', closer);
      }
    };
    setTimeout(() => document.addEventListener('click', closer), 10);
  } else {
    menu.classList.remove('open');
  }
}

window.DS_EXTRA={
  render3DGlobe:render3DGlobe,render3DBarChart:render3DBarChart,
  renderWaterfallChart:renderWaterfallChart,renderBulletRatios:renderBulletRatios,
  renderHeatmap:renderHeatmap,
  renderFailureForecast:renderFailureForecast,
  showProfileDrawer:showProfileDrawer,deleteAnalyse:deleteAnalyse,
  showComparator:showComparator,_doComparison:_doComparison,
  initAlerts:initAlerts,
  initSmartAlerts:function(a){initAlerts(a);},
  exportReport:exportReport,
  renderChatHistory:renderChatHistory,
  _sendToChat:_sendToChat,_chatBtn:_chatBtn,
  toggleMoreMenu:toggleMoreMenu,
};

(function(){
  function init(){_injectCSS();_patchAvatar();console.log('%c[DS Extra v5] ✅ OK','color:#8B7FF0;font-weight:bold');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();