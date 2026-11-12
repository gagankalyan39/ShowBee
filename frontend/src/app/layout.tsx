import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { LocationProvider } from '@/context/LocationContext';
import { Navbar } from '@/components/Navbar';
import { NavTabs } from '@/components/NavTabs';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'SHOWBEE – Modern Online Movie Ticket Booking Platform',
  description: 'Book movie tickets online with real-time seat locking, dynamic cinema layouts, and instant digital QR ticketing.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col justify-between text-slate-100 antialiased selection:bg-rose-500/80 selection:text-white">
        <AuthProvider>
          <LocationProvider>
            <NotificationProvider>
              <div>
                <Navbar />
                <NavTabs />
                <main className="min-h-[calc(100vh-250px)]">{children}</main>
              </div>

            {/* CINEMA FOOTER WITH 4-MEMBER PROJECT ATTRIBUTION */}
            <footer className="w-full mt-20 pt-14 pb-10 px-4 sm:px-8" style={{ background: 'rgba(5,3,12,0.95)', borderTop: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}>
              {/* Ambient glow top */}
              <div className="relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8 w-96 h-32 rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(225,29,72,0.08) 0%, transparent 70%)' }} />
              </div>

              <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-10 pb-10" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {/* Brand */}
                <div className="space-y-4 max-w-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white text-sm shadow-lg" style={{ background: 'linear-gradient(135deg, #e11d48, #9f1239)', boxShadow: '0 6px 20px rgba(225,29,72,0.4)' }}>
                      SB
                    </div>
                    <span className="text-xl font-black tracking-tight" style={{ background: 'linear-gradient(135deg, #ffffff, #fecdd3, #f43f5e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontFamily: 'Outfit, Inter, sans-serif' }}>
                      SHOWBEE
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Full-stack cinema ticketing with real-time seat locking, PostgreSQL ACID transactions, Socket.IO live updates, and a premium glassmorphic UI.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] text-emerald-400 font-semibold">Live Cinema Engine Active</span>
                  </div>
                </div>

                {/* Links */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs">
                  <div>
                    <h4 className="font-black text-white uppercase tracking-widest text-[10px] mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>Navigate</h4>
                    <ul className="space-y-2.5">
                      {[['/', 'Movies Catalog'], ['/my-bookings', 'My Bookings'], ['/theatres', 'Theatres'], ['/offers', 'Offers']].map(([href, label]) => (
                        <li key={href}><Link href={href} className="text-gray-500 hover:text-rose-400 transition-colors duration-200 font-medium">{label}</Link></li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-black uppercase tracking-widest text-[10px] mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>Experience</h4>
                    <ul className="space-y-2.5 text-gray-500">
                      {['IMAX 3D Laser', 'Dolby Atmos 64CH', 'VIP Recliners', 'Instant QR Tickets'].map(item => (
                        <li key={item} className="font-medium">{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-black uppercase tracking-widest text-[10px] mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>Portals</h4>
                    <ul className="space-y-2.5">
                      {[['/auth/login', 'Customer Login'], ['/admin', 'Admin Console'], ['/team', '🔒 Team Portal']].map(([href, label]) => (
                        <li key={href}><Link href={href} className="text-gray-500 hover:text-rose-400 transition-colors duration-200 font-medium">{label}</Link></li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Bottom row */}
              <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] gap-3" style={{ color: 'rgba(255,255,255,0.2)' }}>
                <p>© 2026 SHOWBEE — Premium Cinema Ticketing Platform. Built with PostgreSQL 15 &amp; Next.js 14.</p>
                <span className="text-blue-400/70 font-medium">Pessimistic Locking Active</span>
              </div>
            </footer>
            </NotificationProvider>
          </LocationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
