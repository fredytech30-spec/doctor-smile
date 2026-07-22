'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

const testimonials = [
  {
    name: 'Marie Kouassi',
    role: 'Analyste Financière',
    company: 'BNP Paribas Cameroun',
    initials: 'MK',
    content: 'Doctor Smile a transformé notre processus d\'analyse. Ce qui prenait des heures ne prend plus que 0.3 secondes. La précision SHAP nous permet d\'expliquer chaque décision à nos clients.',
    rating: 5,
    country: 'Cameroun',
    color: 'var(--violet)',
  },
  {
    name: 'Jean-Pierre Martin',
    role: 'Expert-Comptable ONECCA',
    company: 'Cabinet Martin & Associés',
    initials: 'JM',
    content: 'L\'explicabilité SHAP est un game-changer. Je peux maintenant justifier chaque recommandation avec des données factuelles. Mes clients me font encore plus confiance.',
    rating: 5,
    country: "Côte d'Ivoire",
    color: 'var(--gold-strong)',
  },
  {
    name: 'Fatou Diop',
    role: 'Directrice des Risques',
    company: 'Société Générale Sénégal',
    initials: 'FD',
    content: 'La marketplace Experts ONECCA nous a permis de tripler notre capacité à traiter les dossiers complexes. Le matching IA est d\'une précision remarquable.',
    rating: 5,
    country: 'Sénégal',
    color: 'var(--success)',
  },
  {
    name: 'Amadou Diallo',
    role: 'CFO',
    company: 'TechCorp Africa',
    initials: 'AD',
    content: 'L\'analyse temps réel de nos indicateurs nous a permis de détecter une anomalie critique trois mois avant que les auditeurs ne la voient. ROI immédiat.',
    rating: 5,
    country: 'Burkina Faso',
    color: 'var(--violet)',
  },
  {
    name: 'Sarah Mensah',
    role: 'Senior Auditor',
    company: 'PwC Ghana',
    initials: 'SM',
    content: 'La conformité OHADA/SYSCOHADA est automatisée à 100%. Nous avons réduit de 80% le temps de vérification réglementaire. Outil indispensable pour toute équipe d\'audit africaine.',
    rating: 5,
    country: 'Ghana',
    color: 'var(--gold-strong)',
  },
  {
    name: 'Kofi Asante',
    role: 'Fondateur & CEO',
    company: 'AgriTech Solutions',
    initials: 'KA',
    content: 'Doctor Smile nous a aidés à obtenir un financement de 500M FCFA grâce à des rapports financiers impeccables et des prévisions ML que les banquiers ont immédiatement compris.',
    rating: 5,
    country: 'Ghana',
    color: 'var(--success)',
  },
];

export function Testimonials() {
  const [current, setCurrent] = useState(0);
  const [dir, setDir] = useState(1);

  const next = useCallback(() => {
    setDir(1);
    setCurrent((p) => (p + 1) % testimonials.length);
  }, []);

  const prev = useCallback(() => {
    setDir(-1);
    setCurrent((p) => (p - 1 + testimonials.length) % testimonials.length);
  }, []);

  useEffect(() => {
    const id = setInterval(next, 5500);
    return () => clearInterval(id);
  }, [next]);

  const t = testimonials[current];

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d * 40 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d * -40 }),
  };

  return (
    <section
      className="py-24 sm:py-32 relative overflow-hidden"
      id="testimonials"
      style={{ background: 'var(--bg)' }}
    >
      {/* Ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(124,58,237,0.07) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-[1160px] mx-auto px-4 sm:px-7 relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6"
            style={{
              background: 'var(--violet-soft)',
              border: '1px solid var(--violet-border)',
              color: 'var(--violet)',
            }}
          >
            <Star className="w-3 h-3 fill-current" />
            Témoignages
          </span>
          <h2 className="font-display font-bold text-4xl sm:text-5xl text-[var(--text)] mb-4 tracking-tight">
            Ils font confiance à{' '}
            <span className="gradient-gold">Doctor Smile</span>
          </h2>
          <p className="text-[var(--text-2)] max-w-xl mx-auto text-lg">
            +120 analystes, CFOs et experts-comptables à travers la zone OHADA.
          </p>
        </motion.div>

        {/* Testimonial card */}
        <div className="max-w-3xl mx-auto">
          <div
            className="relative rounded-3xl overflow-hidden p-10 sm:p-14"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            {/* Decorative quote icon */}
            <Quote
              className="absolute top-8 right-8 opacity-[0.06] pointer-events-none"
              style={{ width: 80, height: 80, color: 'var(--violet)' }}
            />

            {/* Stars */}
            <div className="flex gap-1.5 mb-8">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-current text-[var(--gold)]" />
              ))}
            </div>

            {/* Content with animation */}
            <div className="relative overflow-hidden" style={{ minHeight: 130 }}>
              <AnimatePresence custom={dir} mode="wait">
                <motion.div
                  key={current}
                  custom={dir}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                >
                  <p className="text-xl sm:text-2xl text-[var(--text)] leading-relaxed font-light mb-10">
                    &ldquo;{t.content}&rdquo;
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-4">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center font-display font-bold text-xl shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${(t as any).color || 'var(--violet-deep)'}, var(--violet))`,
                        color: '#fff',
                      }}
                    >
                      {t.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-display font-bold" style={{ color: 'var(--text)' }}>{t.name}</span>
                        <span
                          className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{
                            background: 'var(--bg-muted)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-muted)'
                          }}
                        >
                          {t.country}
                        </span>
                      </div>
                      <div className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>{t.role}</div>
                      <div className="text-xs font-semibold mt-0.5" style={{ color: (t as any).color || 'var(--violet)' }}>{t.company}</div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={prev}
              className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-2)',
              }}
              aria-label="Précédent"
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--violet-border)';
                (e.currentTarget as HTMLElement).style.color = 'var(--violet)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-2)';
              }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Dots */}
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setDir(i > current ? 1 : -1); setCurrent(i); }}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === current ? 28 : 8,
                    height: 8,
                    background: i === current ? 'var(--violet)' : 'var(--border)',
                  }}
                  aria-label={`Témoignage ${i + 1}`}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-2)',
              }}
              aria-label="Suivant"
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--violet-border)';
                (e.currentTarget as HTMLElement).style.color = 'var(--violet)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-2)';
              }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
