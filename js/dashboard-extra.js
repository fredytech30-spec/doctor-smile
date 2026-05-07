// dashboard-extra.js  —  Doctor Smile  v5
// Requiert Three.js r128 (window.THREE) + Chart.js 4 (window.Chart)

// ── Utilitaires ─────────────────────────────────────────────────
function _toast(msg,type){
  var C={ok:'#10b981',err:'#ef4444',warn:'#f59e0b',info:'#7DD3FC'};
  var c=C[type||'ok']||C.ok;
  var el=document.createElement('div');
  el.style.cssText='position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(14px);'
    +'z-index:99999;padding:11px 24px;border-radius:10px;background:rgba(8,12,22,.97);'
    +'border:1px solid '+c+'44;color:'+c+';font-family:Syne,sans-serif;font-size:11px;'
    +'font-weight:700;backdrop-filter:blur(16px);white-space:nowrap;'
    +'transition:transform .24s,opacity .24s;opacity:0;pointer-events:none;';
  el.textContent=msg;
  document.body.appendChild(el);
  requestAnimationFrame(function(){el.style.transform='translateX(-50%) translateY(0)';el.style.opacity='1';});
  setTimeout(function(){el.style.opacity='0';setTimeout(function(){el.remove();},280);},3000);
}

function _confirm(title,body,label){
  return new Promise(function(ok){
    var o=document.createElement('div');
    o.style.cssText='position:fixed;inset:0;z-index:99998;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.78);backdrop-filter:blur(10px);';
    o.innerHTML='<div style="background:rgba(8,12,22,.99);border:1px solid rgba(239,68,68,.25);border-radius:18px;padding:32px;max-width:400px;width:90%;">'
      +'<div style="font-family:Syne,sans-serif;font-size:17px;font-weight:900;color:#fff;margin-bottom:10px;">'+title+'</div>'
      +'<div style="font-size:11px;color:rgba(255,255,255,.5);line-height:1.65;margin-bottom:24px;">'+body+'</div>'
      +'<div style="display:flex;gap:10px;justify-content:flex-end;">'
      +'<button id="_cc" style="padding:9px 20px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.45);font-family:Syne,sans-serif;font-size:10px;cursor:pointer;">Annuler</button>'
      +'<button id="_ck" style="padding:9px 20px;border-radius:8px;border:none;background:#ef4444;color:#000;font-family:Syne,sans-serif;font-size:10px;font-weight:800;cursor:pointer;">'+(label||'Confirmer')+'</button>'
      +'</div></div>';
    document.body.appendChild(o);
    o.querySelector('#_cc').onclick=function(){o.remove();ok(false);};
    o.querySelector('#_ck').onclick=function(){o.remove();ok(true);};
    o.onclick=function(e){if(e.target===o){o.remove();ok(false);}};
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
  var b=document.createElement('button');b.className='_dscb';
  b.style.cssText='position:absolute;bottom:7px;right:7px;z-index:20;padding:4px 10px;'
    +'background:rgba(125,211,252,.1);border:1px solid rgba(125,211,252,.22);border-radius:7px;'
    +'color:#7DD3FC;font-size:8px;font-weight:800;font-family:Syne,sans-serif;cursor:pointer;'
    +'backdrop-filter:blur(8px);transition:background .15s;letter-spacing:.04em;';
  b.textContent='💬 Expliquer';
  b.addEventListener('mouseenter',function(){b.style.background='rgba(125,211,252,.22)';});
  b.addEventListener('mouseleave',function(){b.style.background='rgba(125,211,252,.1)';});
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
  if(!ratios||!ratios.length){el.innerHTML='<div style="padding:20px;text-align:center;font-size:10px;color:rgba(255,255,255,.2);">Données insuffisantes</div>';return;}
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
  if(!shapValues||!shapValues.length){el.innerHTML='<div style="padding:20px;text-align:center;font-size:10px;color:rgba(255,255,255,.25);">Facteurs SHAP non disponibles</div>';return;}
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
        x:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'rgba(255,255,255,.38)',font:{family:'Syne',size:9}},border:{color:'rgba(255,255,255,.1)'}},
        y:{grid:{display:false},ticks:{color:'rgba(255,255,255,.55)',font:{family:'Syne',size:9}},border:{display:false}}
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
  if(!ratios||!ratios.length){el.innerHTML='<div style="padding:20px;text-align:center;font-size:10px;color:rgba(255,255,255,.25);">Données manquantes</div>';return;}
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
      plugins:{legend:{labels:{color:'rgba(255,255,255,.38)',font:{family:'Syne',size:9}}}},
      scales:{
        x:{grid:{display:false},ticks:{color:'rgba(255,255,255,.45)',font:{family:'Syne',size:8}},border:{color:'rgba(255,255,255,.08)'}},
        y:{min:0,max:100,grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'rgba(255,255,255,.35)',font:{family:'Syne',size:8}},border:{color:'rgba(255,255,255,.08)'}}
      }
    }
  });
  _saveChart('c_'+cid,ch);
  _chatBtn(el,'Scores ratios : '+top6.map(function(r){return r.n+'='+r.p+'%';}).join(', ')+'. Ligne dorée = objectif 75. Quels ratios sont sous la cible ?');
}

function renderHeatmap(cid,ratios){
  var el=document.getElementById(cid);if(!el||!ratios||!ratios.length)return;
  el.style.position='relative';el.innerHTML='';
  var CC={green:{bg:'rgba(16,185,129,.16)',bd:'rgba(16,185,129,.36)',tx:'#10b981'},yellow:{bg:'rgba(245,158,11,.16)',bd:'rgba(245,158,11,.36)',tx:'#f59e0b'},red:{bg:'rgba(239,68,68,.16)',bd:'rgba(239,68,68,.36)',tx:'#ef4444'}};
  var g=document.createElement('div');g.style.cssText='display:grid;grid-template-columns:repeat(3,1fr);gap:7px;';
  ratios.slice(0,9).forEach(function(r){
    var c=CC[r.s]||CC.yellow;
    var cell=document.createElement('div');
    cell.style.cssText='background:'+c.bg+';border:1px solid '+c.bd+';border-radius:10px;padding:9px 7px;text-align:center;cursor:pointer;transition:transform .18s,box-shadow .18s;';
    cell.addEventListener('mouseenter',function(){cell.style.transform='scale(1.06)';cell.style.boxShadow='0 8px 20px '+c.bg;});
    cell.addEventListener('mouseleave',function(){cell.style.transform='';cell.style.boxShadow='';});
    (function(ratio){cell.addEventListener('click',function(){_sendToChat('Explique le ratio '+ratio.n+' = '+ratio.v+(ratio.u||'')+'. Référence : '+ratio.b+'. Statut : '+ratio.s+'. Que signifie ce niveau et comment l\'améliorer ?');});})(r);
    cell.innerHTML='<div style="font-size:7.5px;font-weight:800;letter-spacing:.06em;color:rgba(255,255,255,.38);text-transform:uppercase;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:5px;">'+(r.n||'').slice(0,14)+'</div>'
      +'<div style="font-family:Syne,sans-serif;font-size:16px;font-weight:900;color:'+c.tx+';">'+r.v+(r.u||'')+'</div>'
      +'<div style="font-size:7px;color:rgba(255,255,255,.22);margin-top:3px;">réf: '+(r.b||'—')+'</div>';
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
  var ZC={saine:'#10b981',vigilance:'#f59e0b',risque:'#f97316',critique:'#ef4444'};
  var base=Math.min(98,Math.round((100-score)*(ZM[zone]||1)*.85));
  var decay=DECAY[zone]||.94;
  var zonecol=ZC[zone]||'#f59e0b';

  function cProb(m){return Math.min(99,Math.round(100-(100-base)*Math.pow(decay,m/12)));}
  function mLabel(m){if(m<12)return m+' mois';var y=m/12;return (y===Math.floor(y)?y:y.toFixed(1))+' an'+(y>1?'s':'');}
  function pColor(p){return p>70?'#ef4444':p>45?'#f97316':p>25?'#f59e0b':'#10b981';}

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
    return '<svg viewBox="0 0 '+TW+' '+TH+'" style="width:100%;height:44px;display:block;" preserveAspectRatio="none">'
      +'<defs><linearGradient id="'+uid2+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="'+zonecol+'33"/><stop offset="100%" stop-color="'+zonecol+'00"/></linearGradient></defs>'
      +'<path d="'+sarea+'" fill="url(#'+uid2+')" />'
      +'<path d="'+sline+'" fill="none" stroke="'+zonecol+'" stroke-width="1.5" stroke-linecap="round"/>'
      +'<circle cx="'+selP.x.toFixed(1)+'" cy="'+selP.y.toFixed(1)+'" r="4" fill="#fff" stroke="'+zonecol+'" stroke-width="2"/>'
      +'</svg>';
  }

  function buildBars(selMonth){
    var ms=[3,6,12,24,36,60];
    return ms.map(function(m){
      var p2=cProb(m),c2=pColor(p2),isA=m===selMonth;
      var barW=Math.min(96,p2)+'%';
      return '<div onclick="window._fcSet('+m+')" '
        +'style="cursor:pointer;padding:8px 10px;border-radius:8px;margin-bottom:5px;'
        +'background:'+(isA?'rgba(255,255,255,.06)':'transparent')+';border:1px solid '+(isA?'rgba(255,255,255,.1)':'transparent')+';transition:background .15s;"'
        +' onmouseenter="this.style.background=\'rgba(255,255,255,.04)\'" onmouseleave="this.style.background=\''+(isA?'rgba(255,255,255,.06)':'transparent')+'\'">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">'
        +'<span style="font-size:9px;font-weight:700;color:rgba(255,255,255,.55);">'+mLabel(m)+'</span>'
        +'<span style="font-family:Syne,sans-serif;font-size:13px;font-weight:900;color:'+c2+';">'+p2+'%</span>'
        +'</div>'
        +'<div style="background:rgba(255,255,255,.07);border-radius:4px;height:6px;overflow:hidden;">'
        +'<div style="background:'+c2+';height:100%;width:'+barW+';border-radius:4px;transition:width .4s;"></div>'
        +'</div></div>';
    }).join('');
  }

  function renderForecast(months){
    var prob=cProb(months),pc=pColor(prob),lbl=mLabel(months);
    var aiPrompt='Pour score '+score+'/100 en zone '+zone+', probabilité faillite '+prob+'% dans '+lbl+' sans action. Quels leviers activer pour inverser la tendance ?';
    el.innerHTML='<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:4px 0;">'
      // Colonne gauche
      +'<div>'
        +'<div style="margin-bottom:14px;">'
          +'<div style="font-size:9px;color:rgba(255,255,255,.35);margin-bottom:4px;">Score actuel</div>'
          +'<div style="font-family:Syne,sans-serif;font-size:30px;font-weight:900;color:#7DD3FC;line-height:1;">'+score+'<span style="font-size:13px;opacity:.4;">/100</span></div>'
        +'</div>'
        +'<div style="margin-bottom:14px;">'
          +'<div style="font-size:9px;color:rgba(255,255,255,.35);margin-bottom:4px;">Dans <strong style="color:#fff;">'+lbl+'</strong> sans action</div>'
          +'<div style="font-family:Syne,sans-serif;font-size:54px;font-weight:900;color:'+pc+';line-height:1;">'+prob+'<span style="font-size:20px;">%</span></div>'
          +'<div style="font-size:9px;color:rgba(255,255,255,.3);margin-top:3px;">de risque de faillite</div>'
        +'</div>'
        +'<div style="margin-bottom:12px;border-radius:8px;background:rgba(0,0,0,.2);padding:6px;">'+buildSparkline(months)+'</div>'
        +'<div style="margin-bottom:12px;">'
          +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">'
            +'<span style="font-size:9px;color:rgba(255,255,255,.4);">Horizon</span>'
            +'<span style="font-size:9px;font-weight:800;color:#7DD3FC;">'+lbl+'</span>'
          +'</div>'
          +'<input type="range" id="_fcsl_'+cid+'" min="1" max="60" value="'+months+'" step="1" style="width:100%;accent-color:'+pc+';cursor:pointer;">'
          +'<div style="display:flex;justify-content:space-between;margin-top:3px;">'
            +'<span style="font-size:7px;color:rgba(255,255,255,.2);">1 mois</span>'
            +'<span style="font-size:7px;color:rgba(255,255,255,.2);">5 ans</span>'
          +'</div>'
        +'</div>'
        +'<button onclick="window.DS_EXTRA._sendToChat(\''+aiPrompt+'\')" '
          +'style="width:100%;padding:9px;border-radius:8px;border:1px solid rgba(125,211,252,.22);background:rgba(125,211,252,.06);color:#7DD3FC;font-family:Syne,sans-serif;font-size:9px;font-weight:800;cursor:pointer;">💬 Analyser ce scénario avec l\'IA</button>'
      +'</div>'
      // Colonne droite
      +'<div>'
        +'<div style="font-size:9px;font-weight:800;letter-spacing:.08em;color:rgba(255,255,255,.3);text-transform:uppercase;margin-bottom:10px;">Jalons temporels</div>'
        +buildBars(months)
        +'<div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.06);font-size:8px;color:rgba(255,255,255,.22);">🟢 &lt;25% · 🟡 25-45% · 🟠 45-70% · 🔴 &gt;70%</div>'
      +'</div>'
    +'</div>';

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
  d.style.cssText='position:fixed;bottom:0;left:72px;width:275px;z-index:9000;background:rgba(6,10,20,.99);border:1px solid rgba(125,211,252,.15);border-radius:16px 16px 0 0;box-shadow:0 -24px 60px rgba(0,0,0,.55);animation:_pfup .28s cubic-bezier(.16,1,.3,1);';
  d.innerHTML='<div style="padding:16px 18px 11px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;justify-content:space-between;align-items:center;">'
    +'<span style="font-family:Syne,sans-serif;font-size:13px;font-weight:900;color:#fff;">Mon Profil</span>'
    +'<button onclick="document.getElementById(\'_pfd\')?.remove()" style="background:rgba(255,255,255,.07);border:none;border-radius:6px;padding:4px 9px;color:rgba(255,255,255,.4);cursor:pointer;">✕</button></div>'
    +'<div style="padding:16px 18px 20px;max-height:60vh;overflow-y:auto;">'
    +'<div style="display:flex;gap:12px;align-items:center;margin-bottom:18px;">'
    +'<div id="_pdav" style="width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#7DD3FC,#FFD700);display:flex;align-items:center;justify-content:center;font-family:Syne,sans-serif;font-size:17px;font-weight:900;color:#000;flex-shrink:0;">?</div>'
    +'<div><div id="_pdnm" style="font-family:Syne,sans-serif;font-size:14px;font-weight:800;color:#fff;">—</div>'
    +'<div id="_pdem" style="font-size:9px;color:rgba(255,255,255,.35);margin-top:2px;">—</div></div></div>'
    +'<div style="display:flex;flex-direction:column;gap:10px;">'
    +'<div><div style="font-size:8px;font-weight:800;letter-spacing:.1em;color:rgba(255,255,255,.28);text-transform:uppercase;margin-bottom:3px;">Plan</div>'
    +'<div id="_pdpl" style="display:inline-flex;padding:4px 10px;border-radius:20px;font-size:9px;font-weight:800;background:rgba(125,211,252,.1);color:#7DD3FC;border:1px solid rgba(125,211,252,.2);">Standard</div></div>'
    +'<div><div style="font-size:8px;font-weight:800;letter-spacing:.1em;color:rgba(255,255,255,.28);text-transform:uppercase;margin-bottom:3px;">Entreprise</div>'
    +'<div id="_pden" style="font-size:11px;color:rgba(255,255,255,.65);">—</div></div>'
    +'<div><div style="font-size:8px;font-weight:800;letter-spacing:.1em;color:rgba(255,255,255,.28);text-transform:uppercase;margin-bottom:3px;">Membre depuis</div>'
    +'<div id="_pdsi" style="font-size:11px;color:rgba(255,255,255,.65);">—</div></div>'
    +'<div><div style="font-size:8px;font-weight:800;letter-spacing:.1em;color:rgba(255,255,255,.28);text-transform:uppercase;margin-bottom:3px;">Analyses</div>'
    +'<div id="_pdnb" style="font-size:11px;color:rgba(255,255,255,.65);">—</div></div>'
    +'</div>'
    +'<div style="display:flex;flex-direction:column;gap:7px;margin-top:18px;padding-top:14px;border-top:1px solid rgba(255,255,255,.06);">'
    +'<button onclick="window.DS?.navTo(\'parametres\');document.getElementById(\'_pfd\')?.remove()" style="width:100%;padding:9px;border-radius:8px;border:1px solid rgba(125,211,252,.2);background:rgba(125,211,252,.05);color:#7DD3FC;font-family:Syne,sans-serif;font-size:9px;font-weight:800;cursor:pointer;">⚙️ Paramètres</button>'
    +'<button onclick="window.DS_LOGOUT?.()" style="width:100%;padding:9px;border-radius:8px;border:1px solid rgba(239,68,68,.2);background:rgba(239,68,68,.05);color:#ef4444;font-family:Syne,sans-serif;font-size:9px;font-weight:800;cursor:pointer;">🚪 Déconnexion</button>'
    +'</div></div>';
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
      var PC={standard:{bg:'rgba(125,211,252,.1)',c:'#7DD3FC'},premium:{bg:'rgba(255,215,0,.1)',c:'#FFD700'},extra:{bg:'rgba(139,92,246,.1)',c:'#a78bfa'}};
      var pc=PC[plan]||PC.standard;
      var pl=document.getElementById('_pdpl');if(pl){pl.textContent=plan.charAt(0).toUpperCase()+plan.slice(1);pl.style.background=pc.bg;pl.style.color=pc.c;}
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
    await fetch('http://127.0.0.1:8000/analyses/'+id,{method:'DELETE',headers:{Authorization:'Bearer '+token}}).catch(function(){});
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
  m.style.cssText='position:fixed;inset:0;z-index:99990;background:rgba(0,0,0,.82);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;overflow:auto;padding:20px;';
  var ZC2={saine:'#10b981',vigilance:'#f59e0b',risque:'#f97316',critique:'#ef4444'};
  var items=S.analyses.slice(0,8).map(function(a,i){
    var c=ZC2[a.zone||'vigilance']||'#f59e0b';
    return '<div style="padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);display:flex;align-items:center;gap:10px;">'
      +'<input type="checkbox" id="_ck_'+i+'" data-idx="'+i+'" style="accent-color:#7DD3FC;width:15px;height:15px;cursor:pointer;">'
      +'<label for="_ck_'+i+'" style="flex:1;cursor:pointer;">'
      +'<div style="font-family:Syne,sans-serif;font-size:11px;font-weight:800;color:#fff;">'+(a.entreprise||'Sans nom')+'</div>'
      +'<div style="font-size:9px;color:rgba(255,255,255,.35);">Score <span style="color:'+c+'">'+(a.score||0)+'</span>/100</div>'
      +'</label>'
      +'<div style="font-family:Syne,sans-serif;font-size:20px;font-weight:900;color:'+c+';">'+(a.score||'—')+'</div></div>';
  }).join('');
  m.innerHTML='<div style="background:rgba(8,12,22,.99);border:1px solid rgba(125,211,252,.15);border-radius:18px;width:100%;max-width:700px;max-height:90vh;overflow:auto;">'
    +'<div style="padding:20px 24px 14px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:rgba(8,12,22,.99);z-index:2;">'
    +'<div><div style="font-family:Syne,sans-serif;font-size:16px;font-weight:900;color:#fff;">⚖️ Comparateur</div>'
    +'<div style="font-size:10px;color:rgba(255,255,255,.35);margin-top:3px;">Sélectionnez 2 à 4 analyses</div></div>'
    +'<button onclick="document.getElementById(\'_cmpm\')?.remove()" style="background:rgba(255,255,255,.07);border:none;border-radius:8px;padding:6px 12px;color:rgba(255,255,255,.5);cursor:pointer;">✕</button>'
    +'</div><div>'+items+'</div>'
    +'<div id="_cmpres"></div>'
    +'<div style="padding:14px 20px;border-top:1px solid rgba(255,255,255,.06);">'
    +'<button onclick="window.DS_EXTRA._doComparison()" style="width:100%;padding:11px;border-radius:10px;border:none;background:linear-gradient(135deg,#7DD3FC,#38bdf8);color:#000;font-family:Syne,sans-serif;font-size:11px;font-weight:900;cursor:pointer;">⚡ COMPARER</button>'
    +'</div></div>';
  document.body.appendChild(m);
  m.addEventListener('click',function(e){if(e.target===m)m.remove();});
}

function _doComparison(){
  var S=window.S||{};
  var checked=[].slice.call(document.querySelectorAll('[id^="_ck_"]:checked'));
  var sel=checked.map(function(cb){return S.analyses&&S.analyses[+cb.dataset.idx];}).filter(Boolean);
  if(sel.length<2){_toast('Sélectionnez au moins 2 analyses','warn');return;}
  var res=document.getElementById('_cmpres');if(!res)return;
  var ZC3={saine:'#10b981',vigilance:'#f59e0b',risque:'#f97316',critique:'#ef4444'};
  var METS=[{k:'score',l:'Score /100',b:'max'},{k:'probabiliteDefaut',l:'Prob. défaut %',b:'min'},{k:'confidence',l:'Confiance %',b:'max'},{k:'auc',l:'AUC ROC',b:'max'}];
  var rows=METS.map(function(mt){
    var vals=sel.map(function(a){return parseFloat(a[mt.k]||0);});
    var best=mt.b==='max'?Math.max.apply(null,vals):Math.min.apply(null,vals);
    return '<tr style="border-top:1px solid rgba(255,255,255,.05);">'
      +'<td style="padding:8px 10px;color:rgba(255,255,255,.45);font-size:10px;">'+mt.l+'</td>'
      +sel.map(function(a){var v=parseFloat(a[mt.k]||0),isB=(v===best);return '<td style="text-align:center;padding:8px 6px;font-family:Syne,sans-serif;font-weight:800;font-size:11px;color:'+(isB?'#10b981':'rgba(255,255,255,.6)')+'">'+(a[mt.k]||'—')+(isB?' ✓':'')+'</td>';}).join('')+'</tr>';
  }).join('');
  res.innerHTML='<div style="padding:16px 20px;overflow-x:auto;">'
    +'<table style="width:100%;border-collapse:collapse;"><thead>'
    +'<tr><th style="text-align:left;padding:8px 10px;font-size:8px;letter-spacing:.1em;color:rgba(255,255,255,.3);">CRITÈRE</th>'
    +sel.map(function(a){return '<th style="text-align:center;padding:8px 6px;color:#7DD3FC;font-family:Syne,sans-serif;font-size:10px;font-weight:800;">'+(a.entreprise||'—').slice(0,12)+'</th>';}).join('')
    +'</tr></thead><tbody>'+rows+'</tbody></table>'
    +'<button onclick="window.DS_EXTRA._sendToChat(\'Compare : '+sel.map(function(a){return a.entreprise+' score '+a.score+' zone '+a.zone;}).join(' vs ')+'. Quelle entreprise a le meilleur profil financier et pourquoi ?\')" '
    +'style="margin-top:12px;width:100%;padding:9px;border-radius:8px;border:1px solid rgba(125,211,252,.2);background:rgba(125,211,252,.06);color:#7DD3FC;font-family:Syne,sans-serif;font-size:9px;font-weight:800;cursor:pointer;">💬 Analyser avec IA</button>'
    +'</div>';
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
    bg2.style.cssText='position:absolute;top:-3px;right:-3px;width:14px;height:14px;background:#ef4444;border-radius:50%;font-size:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;border:2px solid rgba(8,12,22,.9);z-index:2;';
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
    +'<div class="hd"><div style="font-size:22px;font-weight:900;color:#7DD3FC;margin-bottom:4px;">Doctor Smile™ — Rapport d\'analyse</div>'
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
  // Proposer le partage
  setTimeout(function(){
    if(window.DS && window.DS.shareReport){
      var s=document.createElement('div');
      s.style.cssText='position:fixed;bottom:72px;left:50%;transform:translateX(-50%);z-index:10001;'
        +'padding:10px 20px;border-radius:10px;background:rgba(8,12,22,.98);'
        +'border:1px solid rgba(125,211,252,.22);color:#7DD3FC;font-family:Syne,sans-serif;'
        +'font-size:10px;font-weight:800;cursor:pointer;backdrop-filter:blur(16px);'
        +'display:flex;align-items:center;gap:8px;box-shadow:0 8px 32px rgba(0,0,0,.5);';
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
    list.innerHTML='<div style="padding:24px;text-align:center;"><i class="fa-solid fa-comments" style="font-size:22px;display:block;margin-bottom:10px;opacity:.12;color:#7DD3FC;"></i>'
      +'<div style="font-size:10px;color:rgba(255,255,255,.2);">Aucune conversation</div></div>';return;
  }
  var ZC6={saine:'#10b981',vigilance:'#f59e0b',risque:'#f97316',critique:'#ef4444'};
  list.innerHTML=S.analyses.map(function(a){
    var zone=a.zone||(window.zoneFromScore?window.zoneFromScore(a.score||0):'vigilance');
    var c=ZC6[zone]||'#f59e0b';
    var isCur=S.currentAnalyse&&S.currentAnalyse.id===a.id;
    var dt=a.createdAt?(typeof a.createdAt.toDate==='function'?a.createdAt.toDate():new Date(a.createdAt)):new Date();
    var ds=dt&&!isNaN(dt)?dt.toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}):'—';
    return '<div data-aid="'+a.id+'" class="_chi" style="padding:10px 14px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.04);background:'+(isCur?'rgba(125,211,252,.07)':'transparent')+';border-left:'+(isCur?'2px solid #7DD3FC':'2px solid transparent')+';transition:background .15s;">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:3px;">'
      +'<div style="font-family:Syne,sans-serif;font-size:10px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:155px;">'+(a.entreprise||'Sans nom')+'</div>'
      +'<div style="font-size:7.5px;color:rgba(255,255,255,.22);flex-shrink:0;">'+ds+'</div></div>'
      +'<div style="display:flex;align-items:center;gap:5px;">'
      +'<span style="font-size:8px;font-weight:800;color:'+c+';background:'+c+'18;padding:2px 7px;border-radius:4px;">'+(zone.charAt(0).toUpperCase()+zone.slice(1))+'</span>'
      +'<span style="font-size:8px;color:rgba(255,255,255,.28);">'+a.score+'</span></div></div>';
  }).join('');
  list.querySelectorAll('._chi').forEach(function(item){
    item.addEventListener('mouseenter',function(){var S2=window.S||{};if(!(S2.currentAnalyse&&S2.currentAnalyse.id===item.dataset.aid))item.style.background='rgba(125,211,252,.04)';});
    item.addEventListener('mouseleave',function(){var S2=window.S||{};item.style.background=S2.currentAnalyse&&S2.currentAnalyse.id===item.dataset.aid?'rgba(125,211,252,.07)':'transparent';});
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
    +'#chat-history-list::-webkit-scrollbar{width:3px;}#chat-history-list::-webkit-scrollbar-thumb{background:rgba(125,211,252,.18);border-radius:2px;}'
    +'._dscb{pointer-events:all!important;}';
  document.head.appendChild(s);
}

function _patchAvatar(){
  var av=document.getElementById('nav-avatar');
  if(av){av.onclick=function(e){e.stopPropagation();showProfileDrawer();};av.title='Mon profil';}
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
};

(function(){
  function init(){_injectCSS();_patchAvatar();console.log('%c[DS Extra v5] ✅ OK','color:#7DD3FC;font-weight:bold');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();