'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Lock, Mail, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setErrorMessage(null);
      await login(email, password);
      router.push(redirect);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (role: 'ADMIN' | 'USER') => {
    if (role === 'ADMIN') {
      setEmail('admin@showbee.com');
      setPassword('Admin@123');
    } else {
      setEmail('user@showbee.com');
      setPassword('Admin@123');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto my-12 px-4">
      <div className="p-8 rounded-3xl glass-panel space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/30">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">
            Sign In to SHOWBEE
          </h1>
          <p className="text-xs text-gray-400">
            Access real-time seat locking, bookings, and digital tickets
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1-Click Demo Login Shortcuts */}
        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
            ⚡ Quick Demo Fill (1-Click)
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillCredentials('ADMIN')}
              className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-[11px] font-bold text-purple-300 transition-colors"
            >
              Admin Demo
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('USER')}
              className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-[11px] font-bold text-rose-300 transition-colors"
            >
              Customer Demo
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-rose-400" /> Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-rose-400" /> Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-2xl brand-btn text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-rose-600/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-gray-400 pt-2 border-t border-white/[0.06]">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="text-rose-400 font-bold hover:underline">
            Register now
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-gray-400">Loading login...</div>}>
      <LoginContent />
    </Suspense>
  );
}
