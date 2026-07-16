'use client';

import Link from 'next/link';
import { ArrowLeft, HelpCircle } from 'lucide-react';

export default function FAQPage() {
  const faqs = [
    {
      q: "How does automatic printing work?",
      a: "Our website connects to a Java Print Agent running on the shop owner's local computer. The moment you verify payment, the print queue sends the file down to the spooler automatically. It is ready for pickup by the time you reach the counter."
    },
    {
      q: "Can I upload MS Word or PowerPoint presentation slides?",
      a: "Yes! We support PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, and standard image files (JPG, PNG). The system auto-calculates total pages accordingly."
    },
    {
      q: "What is the maximum file upload size?",
      a: "The limit configured by the administrator is currently 100MB per file."
    },
    {
      q: "Where is my print job collected?",
      a: "You can pick up your print job at Krishna Students Print Hub near the SRM Valliammai College campus. Just show your pickup code to our desk assistant."
    },
    {
      q: "Are the payments secure?",
      a: "Yes. All transactions are handled securely by Razorpay using direct payment integration. We do not store or capture card or UPI PIN credentials."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-slate-500 hover:text-slate-800 flex items-center gap-1">
            <ArrowLeft size={16} />
            <span className="text-xs font-bold">Back to Home</span>
          </Link>
          <span className="font-extrabold text-sm text-slate-800 uppercase">Frequently Asked</span>
          <div className="w-12"></div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">FAQ</h1>
          <p className="text-slate-500 text-xs mt-1">Answers to common questions about our automatic college print services.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="card-premium bg-white p-5">
              <div className="flex gap-2.5 items-start">
                <HelpCircle size={16} className="text-brand-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">{faq.q}</h4>
                  <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">{faq.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
