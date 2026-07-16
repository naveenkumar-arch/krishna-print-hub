'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-slate-500 hover:text-slate-800 flex items-center gap-1">
            <ArrowLeft size={16} />
            <span className="text-xs font-bold">Back to Home</span>
          </Link>
          <span className="font-extrabold text-sm text-slate-800 uppercase">Terms of Service</span>
          <div className="w-12"></div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <div className="card-premium bg-white p-6 space-y-4 text-xs text-slate-600 leading-relaxed">
          <h1 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-2">Terms of Service</h1>
          <p>By uploading files and making payment, you agree to comply with the terms of service of Krishna Students Print Hub.</p>
          
          <h3 className="font-bold text-slate-800 uppercase tracking-wide">1. Acceptable Use</h3>
          <p>Users must only upload academic records, assignments, projects, or documents for which they have printing privileges. Uploading copyrighted textbooks, illegal materials, or offensive content is strictly prohibited.</p>

          <h3 className="font-bold text-slate-800 uppercase tracking-wide">2. Payments & Pickup</h3>
          <p>Print jobs are spooled instantly upon verification of payment. Once spooled, orders cannot be cancelled or refunded unless print hardware failure prevents fulfillment.</p>

          <h3 className="font-bold text-slate-800 uppercase tracking-wide">3. Order Expiry</h3>
          <p>Printed documents not picked up from the counter within 7 days of completion may be recycled. No refunds will be provided for uncollected items.</p>
        </div>
      </main>
    </div>
  );
}
