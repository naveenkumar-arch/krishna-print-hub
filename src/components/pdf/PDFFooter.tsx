'use client';

import React from 'react';
import Link from 'next/link';
import { Printer, MapPin, Phone, Clock, Mail, ShieldCheck } from 'lucide-react';

interface PDFFooterProps {
  shopName?: string;
}

export const PDFFooter: React.FC<PDFFooterProps> = ({ shopName = 'Krishna Students Print Hub' }) => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-auto pt-12 pb-8 text-xs font-sans">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
        {/* Column 1: Store Brand & Contact Details */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold">
              <Printer size={16} />
            </div>
            <span className="font-black text-sm text-white tracking-tight uppercase">
              {shopName}
            </span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Fast & Reliable Student Printing. Upload & Pay Online, We Print Automatically! Located near SRM Valliammai College.
          </p>

          <div className="space-y-2 pt-1 text-slate-400 text-[11px]">
            <div className="flex items-start gap-2">
              <MapPin size={14} className="text-brand-400 flex-shrink-0 mt-0.5" />
              <span>No.12, College Road, Near SRM Valliammai College, Chengalpattu, TN - 603203</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-emerald-400 flex-shrink-0" />
              <span>+91 7845162168</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-amber-400 flex-shrink-0" />
              <span>8:00 AM - 9:00 PM (Mon - Sun)</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-indigo-400 flex-shrink-0" />
              <span>admin@nksmartprint.com</span>
            </div>
          </div>
        </div>

        {/* Column 2: Customer Quick Links */}
        <div className="space-y-3">
          <h4 className="font-extrabold text-white text-xs uppercase tracking-wider border-b border-slate-800 pb-2">
            Quick Navigation
          </h4>
          <ul className="space-y-2 text-slate-400 text-[11px]">
            <li>
              <Link href="/" className="hover:text-white transition-colors">Home Landing Page</Link>
            </li>
            <li>
              <Link href="/upload" className="hover:text-white transition-colors">Upload & Pay Online</Link>
            </li>
            <li>
              <Link href="/track" className="hover:text-white transition-colors">Track Order Progress</Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-white transition-colors">Print Pricing Guide</Link>
            </li>
            <li>
              <Link href="/how-it-works" className="hover:text-white transition-colors">How It Works Workflow</Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-white transition-colors">Contact Shop & Map</Link>
            </li>
            <li>
              <Link href="/faq" className="hover:text-white transition-colors">Frequently Asked Questions</Link>
            </li>
          </ul>
        </div>

        {/* Column 3: 16 Free PDF Utilities */}
        <div className="space-y-3">
          <h4 className="font-extrabold text-white text-xs uppercase tracking-wider border-b border-slate-800 pb-2">
            Free PDF Utilities
          </h4>
          <ul className="space-y-2 text-slate-400 text-[11px]">
            <li>
              <Link href="/tools/merge-pdf" className="hover:text-brand-400 transition-colors">📄 Merge PDF Files</Link>
            </li>
            <li>
              <Link href="/tools/split-pdf" className="hover:text-brand-400 transition-colors">✂️ Split PDF Pages</Link>
            </li>
            <li>
              <Link href="/tools/compress-pdf" className="hover:text-brand-400 transition-colors">📉 Compress PDF Size</Link>
            </li>
            <li>
              <Link href="/tools/pdf-to-images" className="hover:text-brand-400 transition-colors">🖼 PDF to Images (PNG/JPG)</Link>
            </li>
            <li>
              <Link href="/tools/images-to-pdf" className="hover:text-brand-400 transition-colors">🖼 Images to PDF Converter</Link>
            </li>
            <li>
              <Link href="/tools/add-watermark" className="hover:text-brand-400 transition-colors">📝 Add PDF Watermark</Link>
            </li>
            <li>
              <Link href="/tools/protect-pdf" className="hover:text-brand-400 transition-colors">🔐 Password Protect PDF</Link>
            </li>
            <li>
              <Link href="/tools" className="text-brand-400 font-bold hover:underline">➔ View All 16 PDF Tools</Link>
            </li>
          </ul>
        </div>

        {/* Column 4: Security & Owner Access */}
        <div className="space-y-3">
          <h4 className="font-extrabold text-white text-xs uppercase tracking-wider border-b border-slate-800 pb-2">
            Privacy & Owner Console
          </h4>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            100% browser-based client-side processing. Zero file uploads to external third-party servers.
          </p>

          <div className="pt-2 space-y-2">
            <Link href="/admin/login">
              <button className="w-full btn-primary bg-brand-600 hover:bg-brand-700 text-white text-[11px] py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 shadow-sm">
                <ShieldCheck size={14} /> Shop Owner Login
              </button>
            </Link>
          </div>

          <div className="pt-2 flex flex-col gap-1 text-[11px] text-slate-500">
            <Link href="/privacy" className="hover:text-slate-300">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-slate-300">Terms of Service</Link>
          </div>
        </div>
      </div>

      {/* Bottom Footer Bar */}
      <div className="max-w-6xl mx-auto px-4 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-[11px] text-slate-500">
        <div>© {new Date().getFullYear()} {shopName}. All rights reserved.</div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
            ● Shop System Online
          </span>
          <span>•</span>
          <span>100% Browser Client-Side Engine</span>
        </div>
      </div>
    </footer>
  );
};

export default PDFFooter;
