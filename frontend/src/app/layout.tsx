import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'RiftHero | League of Legends Stats & Match Analytics',
  description: 'High-performance League of Legends stats platform powered by Riot Production API, silent caching, and match analytics.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="dark">
      <body className="flex min-h-screen flex-col bg-rift-950 text-slate-100 antialiased selection:bg-hextech-blue selection:text-white">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-rift-700/60 bg-rift-950/80 py-8 text-center text-xs text-slate-500">
          <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>
              © {new Date().getFullYear()} RiftHero. Nicht affiliiert mit Riot Games. League of Legends und Riot Games sind Warenzeichen von Riot Games, Inc.
            </p>
            <div className="flex items-center gap-4 text-slate-400">
              <span>Production Key Enabled</span>
              <span>•</span>
              <span>10-Player Snowball Ingestion</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
