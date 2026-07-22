// Performance Optimization Utilities
// Lazy loading, code splitting, and asset optimization

import dynamic from 'next/dynamic';

// Lazy load heavy components
export const LazyHero3D = dynamic(
  () => import('@/components/landing/Hero3D').then(mod => ({ default: mod.Hero3D })),
  {
    ssr: false, // Disable SSR for 3D components
  }
);

export const LazyInteractiveSimulation = dynamic(
  () => import('@/components/landing/InteractiveSimulation').then(mod => ({ default: mod.InteractiveSimulation })),
  {
    ssr: true,
  }
);

// Image optimization constants
export const imageConfig = {
  // Maximum width for responsive images
  maxWidths: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  
  // Image quality (0-100)
  quality: 85,
  
  // Enable blur placeholder
  placeholder: 'blur',
  
  // Format priority
  formats: ['image/avif', 'image/webp'],
  
  // Lazy load threshold (pixels)
  lazyThreshold: 200,
};

// Performance monitoring
export const performanceMetrics = {
  // Core Web Vitals targets
  LCP: 2500, // Largest Contentful Paint (ms)
  FID: 100, // First Input Delay (ms)
  CLS: 0.1, // Cumulative Layout Shift
  
  // Custom targets
  TTI: 3500, // Time to Interactive (ms)
  TBT: 300, // Total Blocking Time (ms)
};

// Code splitting strategy
export const codeSplitting = {
  // Split by route
  routes: true,
  
  // Split by component size (KB)
  componentSizeThreshold: 150,
  
  // Preload critical components
  preload: [
    '@/components/landing/Stats',
    '@/components/landing/Features',
    '@/components/landing/HowItWorks',
  ],
  
  // Lazy load non-critical components
  lazy: [
    '@/components/landing/DashboardPreview',
    '@/components/landing/InteractiveSimulation',
    '@/components/landing/Hero3D',
  ],
};

// Animation performance
export const animationPerformance = {
  // Reduce motion for users who prefer it
  respectReducedMotion: true,
  
  // Disable animations on low-end devices
  disableOnLowEnd: true,
  
  // Use GPU acceleration for transforms
  useGPU: true,
  
  // Fallback for unsupported features
  fallback: true,
};

// Memory management
export const memoryManagement = {
  // Cleanup animations on unmount
  cleanupAnimations: true,
  
  // Limit concurrent animations
  maxConcurrentAnimations: 5,
  
  // Debounce scroll events
  scrollDebounceMs: 100,
  
  // Throttle resize events
  resizeThrottleMs: 200,
};
