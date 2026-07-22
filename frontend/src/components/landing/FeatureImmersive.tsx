export function FeatureImmersive() {
  return (
    <section className="feature-immersive grid grid-cols-2 gap-20 items-center mt-25 p-20 relative overflow-hidden" style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: '28px' }}>
      {/* Decorative Orb */}
      <div className="absolute top-[-80px] right-[-80px] w-[360px] h-[360px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, var(--violet-glow), transparent 70%)' }} />

      {/* Content */}
      <div className="feature-immersive-content relative z-10">
        <span className="section-tag st-green inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[100px] text-[10.5px] font-bold uppercase tracking-[1.5px] mb-4.5" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)', color: '#10b981' }}>
          <i className="fa-solid fa-brain" />
          IA Explicable
        </span>
        <h2 className="font-display font-extrabold tracking-tighter mb-4" style={{ fontSize: 'clamp(26px,3vw,40px)', color: 'var(--text)' }}>
          Comprenez chaque décision
        </h2>
        <p className="text-[15.5px] leading-relaxed mb-7" style={{ color: 'var(--text-2)' }}>
          Notre technologie SHAP vous permet de comprendre exactement pourquoi l'IA prend chaque décision. Transparence totale pour une confiance absolue.
        </p>

        <div className="feature-list flex flex-col gap-3.5 mb-8">
          {[
            'SHAP values pour chaque prédiction',
            'Visualisations interactives',
            'Rapports détaillés et exportables',
            'Explications en langage naturel'
          ].map((item, index) => (
            <div key={index} className="feature-list-item flex items-center gap-3 text-[13.5px]" style={{ color: 'var(--text-2)' }}>
              <i className="fa-solid fa-check text-[14px] w-4.5" style={{ color: 'var(--violet)' }} />
              {item}
            </div>
          ))}
        </div>

        <button className="px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300" style={{ background: 'var(--violet)', color: '#fff', boxShadow: '0 4px 20px var(--violet-glow)' }}>
          Découvrir SHAP
        </button>
      </div>

      {/* Image */}
      <div className="feature-immersive-img w-full h-[380px] rounded-[18px] overflow-hidden border relative" style={{ background: 'var(--bg-alt)', border: '1px solid var(--border)' }}>
        <img src="/assets/pictures/shap-explanation.png" alt="SHAP Explanation" className="w-full h-full object-cover" />
      </div>
    </section>
  );
}
