'use client';

import dynamic from 'next/dynamic';
import { PremiumNavigation } from '@/components/landing/PremiumNavigation';
import { PremiumHero } from '@/components/landing/PremiumHero';
import { MetricsBand } from '@/components/landing/MetricsBand';
import { SecurityTrust } from '@/components/landing/SecurityTrust';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { InteractiveSimulation } from '@/components/landing/InteractiveSimulation';
import { DashboardPreview } from '@/components/landing/DashboardPreview';
import { Features } from '@/components/landing/Features';
import { EnhancedStatsSection } from '@/components/landing/EnhancedStatsSection';
import { FeatureshowCase } from '@/components/landing/FeatureshowCase';
import { VisualShowcase } from '@/components/landing/VisualShowcase';
import { Testimonials } from '@/components/landing/Testimonials';
import { Pricing } from '@/components/landing/Pricing';
import { FAQ } from '@/components/landing/FAQ';
import { CTA } from '@/components/landing/CTA';
import { Footer } from '@/components/landing/Footer';
import { ScrollProgressBar } from '@/components/landing/ScrollProgressBar';
import { MeshGradient } from '@/components/landing/MeshGradient';
import { BackgroundOrbs } from '@/components/landing/BackgroundOrbs';

const Hero3D = dynamic(
  () => import('@/components/landing/Hero3D').then((m) => m.Hero3D),
  { ssr: false, loading: () => null }
);

const IntegrationPartners = dynamic(
  () => import('@/components/landing/IntegrationPartners').then((m) => m.IntegrationPartners),
  { ssr: false }
);

export function LandingPage() {
  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ background: 'var(--bg)' }}>
      <ScrollProgressBar />
      <MeshGradient />

      <div className="relative z-10">
        <PremiumNavigation />
        <main>
          <PremiumHero />
          <EnhancedStatsSection />
          <MetricsBand />
          <SecurityTrust />
          <FeatureshowCase />
          <IntegrationPartners />
          <HowItWorks />
          <InteractiveSimulation />
          <DashboardPreview />
          <Features />
          <VisualShowcase />
          <Testimonials />
          <Pricing />
          <FAQ />
          <CTA />
        </main>
        <Footer />
      </div>
    </div>
  );
}
