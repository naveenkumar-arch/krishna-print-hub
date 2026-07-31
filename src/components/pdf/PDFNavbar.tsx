'use client';

import React from 'react';
import Link from 'next/link';
import { Printer, ShoppingBag } from 'lucide-react';

interface PDFNavbarProps {
  shopName?: string;
}

export const PDFNavbar: React.FC<PDFNavbarProps> = ({ shopName = 'KRISHNA STUDENTS PRINT HUB' }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center text-white shadow-sm">
            <Printer size={18} />
          </div>
          <span className="font-extrabold text-lg text-slate-900 tracking-tight uppercase">
            {shopName}
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
          <Link href="/" className="hover:text-brand-600 transition-colors">Home</Link>
          <Link href="/tools" className="text-brand-600 font-bold hover:text-brand-700 transition-colors">PDF Tools</Link>
          <Link href="/track" className="hover:text-brand-600 transition-colors">Track Order</Link>
          <Link href="/how-it-works" className="hover:text-brand-600 transition-colors">How It Works</Link>
          <Link href="/pricing" className="hover:text-brand-600 transition-colors">Pricing</Link>
          <Link href="/contact" className="hover:text-brand-600 transition-colors">Contact</Link>
        </nav>

        <div>
          <Link href="/track">
            <button className="btn-secondary text-xs py-2 px-4 flex items-center gap-1.5 shadow-sm">
              <ShoppingBag size={14} className="text-brand-600" />
              My Orders
            </button>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default PDFNavbar;
