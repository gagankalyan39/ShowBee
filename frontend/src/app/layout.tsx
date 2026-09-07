import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';
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
      <body className="min-h-screen flex flex-col justify-between text-slate-100 antialiased selection:bg-rose-500 selection:text-white">
        <AuthProvider>
          <NotificationProvider>
            <div>
              <Navbar />
              <NavTabs />
              <main className="min-h-[calc(100vh-250px)]">{children}</main>
            </div>

            {/* CINEMA FOOTER WITH 4-MEMBER PROJECT ATTRIBUTION */}
            <footer className="w-full bg-[#080511] border-t border-white/[0.08] mt-16 pt-12 pb-8 px-4 sm:px-8">
              <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-8 pb-10 border-b border-white/[0.06]">
                <div className="space-y-3 max-w-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center font-black text-white text-sm">
                      SB
                    </div>
                    <span className="text-xl font-black text-white tracking-wider">
                      SHOW<span className="text-rose-500">BEE</span>
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    SHOWBEE is a full-stack cinema ticketing system featuring real-time pessimistic seat locking, PostgreSQL ACID transactions, Socket.IO updates, and a glassmorphic cinema UI.
                  </p>
                </div>

                {/* Quick Links */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs">
                  <div>
                    <h4 className="font-bold text-white uppercase tracking-wider mb-3">Navigation</h4>
                    <ul className="space-y-2 text-gray-400">
                      <li><Link href="/" className="hover:text-rose-400 transition-colors">Movies Catalog</Link></li>
                      <li><Link href="/my-bookings" className="hover:text-rose-400 transition-colors">My Bookings</Link></li>
                      <li><Link href="/theatres" className="hover:text-rose-400 transition-colors">Theatres</Link></li>
                      <li><Link href="/offers" className="hover:text-rose-400 transition-colors">Offers</Link></li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-white uppercase tracking-wider mb-3">Cinema Experience</h4>
                    <ul className="space-y-2 text-gray-400">
                      <li><span className="text-gray-400">IMAX 3D Laser Projection</span></li>
                      <li><span className="text-gray-400">Dolby Atmos 64-Channel Sound</span></li>
                      <li><span className="text-gray-400">VIP Lounges &amp; Recliners</span></li>
                      <li><span className="text-gray-400">Instant Contactless QR Scan</span></li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-white uppercase tracking-wider mb-3">Portals</h4>
                    <ul className="space-y-2 text-gray-400">
                      <li><Link href="/auth/login" className="hover:text-rose-400 transition-colors">Customer Login</Link></li>
                      <li><Link href="/admin" className="hover:text-rose-400 transition-colors">Admin Console</Link></li>
                      <li><Link href="/team" className="hover:text-rose-400 transition-colors text-gray-400 flex items-center gap-1.5"><span>🔒 Team &amp; Faculty Portal</span></Link></li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Bottom Copyright */}
              <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-400 gap-3">
                <p>© 2026 SHOWBEE – Premium Cinema Ticketing Platform. Built with PostgreSQL 15 &amp; Next.js 14.</p>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Live Cinema Engine
                  </span>
                  <span>•</span>
                  <span className="text-blue-400">Pessimistic Locking Active</span>
                </div>
              </div>
            </footer>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
