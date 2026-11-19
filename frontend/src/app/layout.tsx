import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { LanguageProvider } from '@/i18n/LanguageContext';

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
        <LanguageProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
