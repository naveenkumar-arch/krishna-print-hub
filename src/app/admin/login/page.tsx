'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Printer, Lock, Mail, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    setTimeout(() => {
      setLoading(false);
      const savedEmail = localStorage.getItem('adminEmail') || 'admin@nksmartprint.com';
      const savedPassword = localStorage.getItem('adminPassword') || 'admin123';

      if (email.toLowerCase().trim() === savedEmail.toLowerCase().trim() && password === savedPassword) {
        localStorage.setItem('isAdminAuth', 'true');
        toast.success("Welcome back! Owner Session Authenticated.");
        router.push('/admin');
      } else {
        toast.error("Invalid credentials.");
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 mb-4 text-slate-500 hover:text-slate-800 text-xs font-bold">
          <ArrowLeft size={14} /> Back to main portal
        </Link>
        <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center text-white mx-auto shadow-md">
          <Printer size={24} />
        </div>
        <h2 className="mt-4 text-center text-xl font-black text-slate-900 tracking-tight">
          Krishna Students Print Hub
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 uppercase tracking-wider font-semibold">
          Owner Admin Console
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 border border-slate-200 shadow-sm rounded-2xl sm:px-10">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-slate-500 text-xs font-semibold mb-1.5 block">Owner Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="email" 
                  required
                  placeholder="e.g. owner@printhub.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input-field pl-9 py-2 text-xs" 
                />
              </div>
            </div>

            <div>
              <label className="text-slate-500 text-xs font-semibold mb-1.5 block">Secure Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pl-9 py-2 text-xs" 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full btn-primary py-2.5 text-xs font-bold justify-center rounded-xl shadow-md disabled:opacity-50"
            >
              {loading ? "Verifying credentials..." : "Sign In to Dashboard"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
