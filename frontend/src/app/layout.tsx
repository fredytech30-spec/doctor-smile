import type { Metadata } from 'next';
import { AppProviders } from '@/components/providers/AppProviders';
import './globals.css';

export const metadata: Metadata = {
  title: 'Doctor Smile — Diagnostic financier IA pour PME OHADA',
  description:
    'Analysez la santé financière de votre PME en 0.3s. Précision 95%+, normes OHADA/SYSCOHADA.',
  robots: 'index, follow',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning className="h-full" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
