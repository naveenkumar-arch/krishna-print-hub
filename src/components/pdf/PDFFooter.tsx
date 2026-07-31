'use client';

import React from 'react';
import Link from 'next/link';

interface PDFFooterProps {
  shopName?: string;
}

export const PDFFooter: React.FC<PDFFooterProps> = ({ shopName = 'Krishna Students Print Hub' }) => {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto py-6">
      <div className="max-w-5xl mx-auto px-4 text-xs text-slate-400 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>© {new Date().getFullYear()} {shopName}. All rights reserved. 100% Free Client-side PDF Suite.</div>
        <div className="flex gap-4">
          <Link href="/privacy" className="hover:text-slate-600 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-slate-600 transition-colors">Terms of Service</Link>
          <Link href="/tools" className="hover:text-slate-600 font-semibold text-brand-600 transition-colors">PDF Tools</Link>
          <Link href="/admin/login" className="hover:text-slate-600 font-semibold text-brand-600 transition-colors">Admin Login</Link>
        </div>
      </div>
    </footer>
  );
};

export default PDFFooter;
