'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin, Mail, Phone, Clock, Send } from 'lucide-react';
import { mockShopSettings } from '@/lib/mockData';
import toast from 'react-hot-toast';

export default function ContactPage() {
  const [shop, setShop] = useState(mockShopSettings);

  useEffect(() => {
    const saved = localStorage.getItem('shopSettings');
    if (saved) {
      try {
        setShop(JSON.parse(saved));
      } catch (e) {
        setShop(mockShopSettings);
      }
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Thank you! Your message has been sent to our shop owner.");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-slate-500 hover:text-slate-800 flex items-center gap-1">
            <ArrowLeft size={16} />
            <span className="text-xs font-bold">Back to Home</span>
          </Link>
          <span className="font-extrabold text-sm text-slate-800 uppercase">Contact Us</span>
          <div className="w-12"></div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 grid md:grid-cols-2 gap-8">
        {/* Info panel */}
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Get in touch</h1>
            <p className="text-slate-500 text-xs mt-1">Have pricing queries, custom requests, or print questions? Connect with our desk directly.</p>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <MapPin size={18} className="text-brand-600 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-800">Our Address</h4>
                <p className="text-slate-500 text-xs mt-0.5">{shop.address}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Phone size={18} className="text-brand-600 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-800">Phone & WhatsApp</h4>
                <p className="text-slate-500 text-xs mt-0.5">{shop.phone}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Mail size={18} className="text-brand-600 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-800">Email Address</h4>
                <p className="text-slate-500 text-xs mt-0.5">{shop.email}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Clock size={18} className="text-brand-600 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-800">Working Hours</h4>
                <p className="text-slate-500 text-xs mt-0.5">{shop.workingHoursText || shop.workingHoursText}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Panel */}
        <div className="card-premium bg-white p-6">
          <h3 className="font-extrabold text-slate-800 text-xs tracking-wide uppercase border-b border-slate-100 pb-3 mb-4">
            Send a Message
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="text-slate-500 text-xs font-semibold mb-1 block">Your Name</label>
              <input type="text" required placeholder="Enter name" className="input-field text-xs py-2" />
            </div>
            <div>
              <label className="text-slate-500 text-xs font-semibold mb-1 block">Email</label>
              <input type="email" required placeholder="Enter email" className="input-field text-xs py-2" />
            </div>
            <div>
              <label className="text-slate-500 text-xs font-semibold mb-1 block">Query / Custom requirements</label>
              <textarea rows={3} required placeholder="Enter details of your message..." className="input-field text-xs py-2 resize-none"></textarea>
            </div>
            <button type="submit" className="w-full btn-primary text-xs py-2.5 flex items-center justify-center gap-1.5 rounded-xl font-bold shadow-md">
              <Send size={13} />
              Submit Query
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
