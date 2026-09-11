import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Performance Dashboard — 10k+ points at 60fps',
  description:
    'High-performance real-time dashboard: canvas charts, virtualized tables, and live metrics built with Next.js App Router + TypeScript.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
