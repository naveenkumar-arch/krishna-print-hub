'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer, ShoppingBag, HelpCircle, FileText, CheckCircle2 } from 'lucide-react';
import { mockPricing } from '@/lib/mockData';

export default function PricingPage() {
  const [pricing, setPricing] = useState(mockPricing);

  useEffect(() => {
    // Fetch live config from server
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.pricingConfig) {
          setPricing(data.pricingConfig);
          localStorage.setItem('pricingConfig', JSON.stringify(data.pricingConfig));
        }
      })
      .catch(() => {
        const saved = localStorage.getItem('pricingConfig');
        if (saved) {
          try {
            setPricing(JSON.parse(saved));
          } catch (e) {
            setPricing(mockPricing);
          }
        }
      });
  }, []);

  const formatPrice = (val: number | undefined) => {
    return typeof val === 'number' ? val.toFixed(2) : '0.00';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-slate-500 hover:text-slate-800 flex items-center gap-1">
            <ArrowLeft size={16} />
            <span className="text-xs font-bold">Back to Home</span>
          </Link>
          <span className="font-extrabold text-sm text-slate-800 uppercase">Pricing Guide</span>
          <div className="w-12"></div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Print Pricing Sheets</h1>
          <p className="text-slate-500 text-xs mt-1">Simple, transparent per-page printing rates tailored for SRM students.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Black & White rates */}
          <div className="card-premium bg-white p-6">
            <h3 className="text-sm font-extrabold text-slate-900 tracking-wide uppercase border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              ⚫ Black & White (LaserJet)
            </h3>
            <div className="space-y-3">
              {[
                { range: "1 - 10 Pages (A4)", price: `₹${formatPrice(pricing.A4_BW)}` },
                { range: "11 - 50 Pages", price: "₹1.80" },
                { range: "51 - 100 Pages", price: "₹1.50" },
                { range: "100+ Pages", price: "₹1.20" },
                { range: "Legal Size B&W", price: `₹${formatPrice(pricing.Legal_BW)}` },
                { range: "Letter Size B&W", price: `₹${formatPrice(pricing.Letter_BW)}` },
              ].map((rate, i) => (
                <div key={i} className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">{rate.range}</span>
                  <span className="text-slate-800 font-bold">{rate.price} <span className="text-[10px] text-slate-400 font-normal">/ page</span></span>
                </div>
              ))}
            </div>
          </div>

          {/* Color Rates */}
          <div className="card-premium bg-white p-6">
            <h3 className="text-sm font-extrabold text-slate-900 tracking-wide uppercase border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              🎨 High-Quality Color (InkJet)
            </h3>
            <div className="space-y-3">
              {[
                { range: "A4 Normal Text Color", price: `₹${formatPrice(pricing.A4_Color)}` },
                { range: "A4 Semi-Photo / Graphics", price: "₹15.00" },
                { range: "A4 Full Photo Glossy", price: "₹25.00" },
                { range: "A3 High-Quality Color", price: `₹${formatPrice(pricing.A3_Color)}` },
                { range: "A3 Full Photo", price: "₹40.00" },
              ].map((rate, i) => (
                <div key={i} className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">{rate.range}</span>
                  <span className="text-slate-800 font-bold">{rate.price} <span className="text-[10px] text-slate-400 font-normal">/ page</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card-premium bg-slate-900 text-white p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="space-y-1">
            <h4 className="font-bold text-sm">Need bulk printing? (e.g. Thesis, project guidelines)</h4>
            <p className="text-slate-400 text-xs">Contact the counter via WhatsApp for flat rate discounts on binding & color covers.</p>
          </div>
          <Link href="/">
            <button className="btn-primary bg-brand-600 text-white hover:bg-brand-700 py-2.5 px-6 rounded-xl font-bold text-xs flex items-center gap-1.5 flex-shrink-0">
              Start Print Upload
            </button>
          </Link>
        </div>
      </main>
    </div>
  );
}
