import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  allowedDevOrigins: ['127.0.0.1'],
  turbopack: {
    root: __dirname,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }],
  },
  experimental: {
    optimizeCss: false,
    optimizePackageImports: ['lucide-react', 'framer-motion', 'recharts'],
  },
  async rewrites() {
    const API_URL = 'http://127.0.0.1:8000';
    console.log('🔗 [NEXT.JS] API_URL hardcoded to:', API_URL);
    return [
      { source: '/auth/2fa/:path*', destination: `${API_URL}/auth/2fa/:path*` },
      { source: '/api/backend/scores/:path*', destination: `${API_URL}/scores/:path*` },
      { source: '/api/backend/analyses/:path*', destination: `${API_URL}/analyses/:path*` },
      { source: '/api/backend/analyses/v5/:path*', destination: `${API_URL}/analyses/v5/:path*` },
      { source: '/api/backend/monitoring/:path*', destination: `${API_URL}/monitoring/:path*` },
      { source: '/api/backend/notifications/:path*', destination: `${API_URL}/notifications/:path*` },
      { source: '/api/backend/hyperactive/:path*', destination: `${API_URL}/hyperactive/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
