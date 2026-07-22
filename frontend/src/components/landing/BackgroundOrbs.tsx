export function BackgroundOrbs() {
  return (
    <>
      <div className="orb orb-1 fixed w-[640px] h-[640px] rounded-full blur-[160px] pointer-events-none z-0 will-change-transform" 
           style={{
             top: '-160px',
             left: '-120px',
             background: 'radial-gradient(circle, rgba(139,127,240,0.18), transparent 70%)',
             animation: 'floatOrb1 20s ease-in-out infinite'
           }} />
      <div className="orb orb-2 fixed w-[560px] h-[560px] rounded-full blur-[160px] pointer-events-none z-0 will-change-transform"
           style={{
             top: '35%',
             right: '-160px',
             background: 'radial-gradient(circle, rgba(91,75,209,0.14), transparent 70%)',
             animation: 'floatOrb2 26s ease-in-out infinite'
           }} />
      <div className="orb orb-3 fixed w-[700px] h-[700px] rounded-full blur-[160px] pointer-events-none z-0 will-change-transform"
           style={{
             bottom: '-220px',
             left: '18%',
             background: 'radial-gradient(circle, rgba(139,127,240,0.12), transparent 70%)',
             animation: 'floatOrb3 22s ease-in-out infinite'
           }} />
      
      <style jsx global>{`
        @keyframes floatOrb1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, -20px); }
        }
        @keyframes floatOrb2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-20px, 30px); }
        }
        @keyframes floatOrb3 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, 20px); }
        }
        .dark .orb { opacity: 1; }
        .light .orb { opacity: 0.18; }
      `}</style>
    </>
  );
}
