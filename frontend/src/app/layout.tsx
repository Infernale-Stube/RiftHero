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
      <body className="relative flex min-h-screen flex-col bg-[#07090c] text-slate-100 antialiased selection:bg-orange-500 selection:text-white">
        {/* Global Atmospheric Background Wallpaper */}
        <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.14] filter blur-[0.5px] scale-105"
            style={{
              backgroundImage: `url('https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-match-history/global/default/background.jpg')`,
            }}
          />
          {/* Dark gradient overlay & subtle ambient glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#07090c]/70 via-[#07090c]/85 to-[#07090c]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(249,115,22,0.06),transparent_70%)]" />
        </div>

        <LanguageProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
