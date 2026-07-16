'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-slate-500 hover:text-slate-800 flex items-center gap-1">
            <ArrowLeft size={16} />
            <span className="text-xs font-bold">Back to Home</span>
          </Link>
          <span className="font-extrabold text-sm text-slate-800 uppercase">Privacy Policy</span>
          <div className="w-12"></div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <div className="card-premium bg-white p-6 space-y-4 text-xs text-slate-600 leading-relaxed">
          <h1 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-2">Privacy Policy</h1>
          <p>At Krishna Students Print Hub, we prioritize your privacy. This policy outlines how we handle data when you use our automated printing portal.</p>
          
          <h3 className="font-bold text-slate-800 uppercase tracking-wide">1. Information We Collect</h3>
          <p>We collect your file uploads, name, and registered WhatsApp phone number solely to process payments, track print status, and send WhatsApp notifications when your print is ready for pickup.</p>

          <h3 className="font-bold text-slate-800 uppercase tracking-wide">2. Document Storage & Security</h3>
          <p>Uploaded documents are spooled directly to the local Windows print queue. To protect confidentiality, files are automatically deleted from local storage immediately upon successful printing.</p>

          <h3 className="font-bold text-slate-800 uppercase tracking-wide">3. Payout & Payment Details</h3>
          <p>All online payments are processed through Razorpay. We do not store credit card credentials, UPI details, or authentication information on our servers.</p>
        </div>
      </main>
    </div>
  );
}
