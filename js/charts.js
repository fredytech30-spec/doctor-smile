// charts.js — Doctor Smile · Graphes Plotly
// Code exact de la source originale + window.load pour stabilité CSS

window.addEventListener('load', function() {
  const dark = '#03060D';
  const plotBg = 'rgba(0,0,0,0)';
  const grid = 'rgba(255,255,255,0.05)';
  const font = { family: 'Syne, sans-serif', color: '#8899BB' };

  const baseLayout = {
    paper_bgcolor: plotBg, plot_bgcolor: plotBg,
    font, margin: {t:10,b:40,l:50,r:10},
    xaxis: {gridcolor:grid,zerolinecolor:grid,tickfont:font},
    yaxis: {gridcolor:grid,zerolinecolor:grid,tickfont:font},
    showlegend: false
  };

  // ── HERO 3D Surface ──
  const heroEl = document.getElementById('hero-plot');
  if(heroEl) {
    const n=40, x=[], y=[], z=[];
    for(let i=0;i<n;i++){
      x.push(-3+i*6/n); y.push(-3+i*6/n);
    }
    for(let i=0;i<n;i++){
      z.push([]);
      for(let j=0;j<n;j++){
        const xi=x[j], yi=y[i];
        z[i].push(Math.exp(-(xi*xi+yi*yi)/4)*Math.sin(xi*2)+Math.exp(-((xi-1.5)**2+(yi-1.5)**2)/2)*0.7);
      }
    }
    Plotly.newPlot('hero-plot',[{
      type:'surface',x,y,z,
      colorscale:[[0,'rgba(5,8,15,1)'],[0.3,'rgba(139,127,240,0.7)'],[0.7,'rgba(255,215,0,0.8)'],[1,'rgba(255,255,255,1)']],
      showscale:false,opacity:0.95,
      contours:{z:{show:true,usecolormap:true,highlightcolor:'rgba(255,215,0,0.6)',project:{z:true}}}
    }],{
      ...baseLayout,
      scene:{
        bgcolor:'rgba(0,0,0,0)',
        xaxis:{showgrid:false,zeroline:false,showticklabels:false,title:''},
        yaxis:{showgrid:false,zeroline:false,showticklabels:false,title:''},
        zaxis:{showgrid:true,zeroline:false,showticklabels:false,title:'',gridcolor:'rgba(139,127,240,0.08)'},
        camera:{eye:{x:1.6,y:1.6,z:0.8}},
        aspectmode:'cube'
      },
      margin:{t:0,b:0,l:0,r:0}
    },{responsive:true,displayModeBar:false,useResizeHandler:true});

    // Auto-rotate
    let angle=0;
    setInterval(()=>{
      angle+=0.4;
      const r=1.8, hh=1.0;
      Plotly.relayout('hero-plot',{
        'scene.camera.eye':{
          x:r*Math.cos(angle*Math.PI/180),
          y:r*Math.sin(angle*Math.PI/180),
          z:hh
        }
      });
    },60);
  }

  // ── ROC CURVE ──
  const rocEl = document.getElementById('roc-plot');
  if(rocEl) {
    const fpr=[0,0.01,0.02,0.04,0.07,0.1,0.15,0.2,0.3,0.5,0.7,0.9,1];
    const tpr=[0,0.42,0.60,0.74,0.82,0.87,0.91,0.94,0.96,0.98,0.99,1,1];
    Plotly.newPlot('roc-plot',[
      {x:[0,1],y:[0,1],mode:'lines',line:{color:'rgba(255,255,255,0.1)',dash:'dot',width:1}},
      {x:fpr,y:tpr,mode:'lines',fill:'tozeroy',
        line:{color:'#8B7FF0',width:2.5},
        fillcolor:'rgba(139,127,240,0.07)',
        name:'AUC=0.97'
      }
    ],{
      ...baseLayout,
      xaxis:{...baseLayout.xaxis,title:{text:'Taux de faux positifs',font:{size:11,...font}},range:[0,1]},
      yaxis:{...baseLayout.yaxis,title:{text:'Taux de vrais positifs',font:{size:11,...font}},range:[0,1]}
    },{responsive:true,displayModeBar:false,useResizeHandler:true});
  }

  // ── SCATTER PORTFOLIO ──
  const scEl = document.getElementById('scatter-plot');
  if(scEl) {
    const n=148;
    const riskScores=Array.from({length:n},()=>Math.random()*100);
    const debtEq=riskScores.map(s=>s/100*3+Math.random()*0.8);
    const isRisk=riskScores.map(s=>s>55);
    Plotly.newPlot('scatter-plot',[
      {
        x:riskScores.filter((_,i)=>!isRisk[i]),
        y:debtEq.filter((_,i)=>!isRisk[i]),
        mode:'markers',type:'scatter',
        marker:{color:'#10b981',size:6,opacity:0.7,line:{color:'rgba(16,185,129,0.3)',width:1}},
        name:'Sain'
      },{
        x:riskScores.filter((_,i)=>isRisk[i]),
        y:debtEq.filter((_,i)=>isRisk[i]),
        mode:'markers',type:'scatter',
        marker:{color:'#ef4444',size:7,opacity:0.75,line:{color:'rgba(239,68,68,0.3)',width:1}},
        name:'À risque'
      }
    ],{
      ...baseLayout,
      showlegend:true,
      legend:{font:{family:'Syne',size:11,color:'#8899BB'},bgcolor:'rgba(0,0,0,0)'},
      xaxis:{...baseLayout.xaxis,title:{text:'Score de risque (0-100)',font:{size:11,...font}}},
      yaxis:{...baseLayout.yaxis,title:{text:'Ratio Debt/Equity',font:{size:11,...font}}}
    },{responsive:true,displayModeBar:false,useResizeHandler:true});
  }

  // ── 3D SCATTER ──
  const s3El = document.getElementById('scatter3d-plot');
  if(s3El) {
    const n=120;
    const groups=[
      {color:'#10b981',label:'Sain'},
      {color:'#FFD700',label:'Vigilance'},
      {color:'#ef4444',label:'Risque élevé'}
    ];
    const traces=groups.map((g,gi)=>{
      const cnt=gi===0?60:gi===1?40:20;
      const cx=[2.0,1.2,0.6][gi], cy=[0.3,0.8,1.8][gi], cz=[0.12,0.04,-0.06][gi];
      return {
        x:Array.from({length:cnt},()=>cx+(Math.random()-0.5)*0.8),
        y:Array.from({length:cnt},()=>cy+(Math.random()-0.5)*0.6),
        z:Array.from({length:cnt},()=>cz+(Math.random()-0.5)*0.15),
        mode:'markers',type:'scatter3d',
        marker:{color:g.color,size:4,opacity:0.8,
          line:{color:'rgba(255,255,255,0.2)',width:0.5}},
        name:g.label
      };
    });
    Plotly.newPlot('scatter3d-plot',traces,{
      paper_bgcolor:plotBg,plot_bgcolor:plotBg,
      font,margin:{t:0,b:0,l:0,r:0},
      scene:{
        bgcolor:'rgba(0,0,0,0)',
        xaxis:{title:'Current Ratio',gridcolor:'rgba(255,255,255,0.04)',showbackground:false,tickfont:font},
        yaxis:{title:'Debt/Equity',gridcolor:'rgba(255,255,255,0.04)',showbackground:false,tickfont:font},
        zaxis:{title:'ROA',gridcolor:'rgba(255,255,255,0.04)',showbackground:false,tickfont:font},
        camera:{eye:{x:1.5,y:1.5,z:0.9}}
      },
      showlegend:true,
      legend:{font:{family:'Syne',size:11,color:'#8899BB'},bgcolor:'rgba(0,0,0,0)'}
    },{responsive:true,displayModeBar:false,useResizeHandler:true});
  }

  // ── SHAP WATERFALL ──
  const shapEl = document.getElementById('shap-plot');
  if(shapEl) {
    const features=['Debt/Equity','Current Ratio','ROA','Cash Flow','Working Cap.','Revenue Growth','Quick Ratio'];
    const values=[-12.3,8.7,-6.1,5.4,-3.8,4.2,2.1];
    const colors=values.map(v=>v<0?'rgba(139,127,240,0.8)':'rgba(240,208,120,0.8)');
    Plotly.newPlot('shap-plot',[{
      type:'bar',orientation:'h',
      x:values,y:features,
      marker:{color:colors,line:{width:0}},
      text:values.map(v=>(v>0?'+':'')+v.toFixed(1)),
      textposition:'outside',
      textfont:{family:'Syne',size:11,color:'#8899BB'}
    }],{
      ...baseLayout,
      margin:{t:10,b:20,l:120,r:60},
      xaxis:{...baseLayout.xaxis,title:'',zeroline:true,zerolinecolor:'rgba(255,255,255,0.15)'},
      yaxis:{...baseLayout.yaxis,title:'',tickfont:{...font,size:11}}
    },{responsive:true,displayModeBar:false,useResizeHandler:true});
  }

  // ── Resize global robuste (mobile + orientation) ──
  var _rt;
  var PLOT_IDS = ['hero-plot','roc-plot','scatter-plot','scatter3d-plot','shap-plot'];

  function resizeAll() {
    PLOT_IDS.forEach(function(id) {
      var el = document.getElementById(id);
      if (!el) return;
      // Forcer la visibilité avant le resize
      el.style.visibility = 'visible';
      el.style.display = 'block';
      // Resize si Plotly l'a initialisé
      if (el._fullLayout) {
        try { Plotly.Plots.resize(el); } catch(e) {}
      }
    });
  }

  window.addEventListener('resize', function() {
    clearTimeout(_rt);
    _rt = setTimeout(function() {
      resizeAll();
      // Second pass pour les 3D (plus lents)
      setTimeout(resizeAll, 350);
    }, 120);
  });

  // Gérer le changement d'orientation mobile
  window.addEventListener('orientationchange', function() {
    setTimeout(resizeAll, 300);
    setTimeout(resizeAll, 700);
  });

  // Gérer les cas où le CSS retarde la visibilité (scroll/reveal)
  if (window.IntersectionObserver) {
    var obs = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting && entry.target._fullLayout) {
          try { Plotly.Plots.resize(entry.target); } catch(e) {}
        }
      });
    }, { threshold: 0.1 });
    PLOT_IDS.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) obs.observe(el);
    });
  }

  // ── ARCH DIAGRAM removed — replaced with HTML layers ──
});