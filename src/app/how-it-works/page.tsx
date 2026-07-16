'use client';

import Link from 'next/link';
import { ArrowLeft, Printer, FileText, CreditCard, Clock, CheckCircle } from 'lucide-react';

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-slate-500 hover:text-slate-800 flex items-center gap-1">
            <ArrowLeft size={16} />
            <span className="text-xs font-bold">Back to Home</span>
          </Link>
          <span className="font-extrabold text-sm text-slate-800 uppercase">Process Workflow</span>
          <div className="w-12"></div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">How It Works</h1>
          <p className="text-slate-500 text-xs mt-1">A simple guide to our completely automated print-on-demand system.</p>
        </div>

        <div className="space-y-8 relative before:absolute before:left-5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {[
            {
              step: '1',
              title: 'Upload Document',
              desc: 'Select a PDF, DOCX, or Image file from your phone or PC. Alternatively, drop a file on our official WhatsApp number.',
              icon: FileText
            },
            {
              step: '2',
              title: 'Dynamic Configuration',
              desc: 'Select paper size, copies, duplex state, B&W or color. The pricing is computed dynamically based on pages detected.',
              icon: Printer
            },
            {
              step: '3',
              title: 'Secure Online Payment',
              desc: 'Pay using the integrated UPI apps, card, or wallet. The payment goes directly to our shop owner account.',
              icon: CreditCard
            },
            {
              step: '4',
              title: 'Instant Automated Print',
              desc: 'The Java Print Agent installed on our shop PC detects the paid order and triggers automatic spooling to our laser printer. Zero wait time!',
              icon: CheckCircle
            }
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex gap-4 relative z-10">
                <div className="w-10 h-10 rounded-full bg-brand-600 border border-brand-700 text-white flex items-center justify-center font-extrabold text-sm flex-shrink-0">
                  {item.step}
                </div>
                <div className="card-premium bg-white p-5 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={16} className="text-brand-600" />
                    <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">{item.title}</h3>
                  </div>
                  <p className="text-slate-500 text-xs leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
