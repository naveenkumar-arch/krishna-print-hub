'use client';

import { useState, useEffect } from 'react';
import { 
  mockPricing 
} from '@/lib/mockData';
import { Save, Info, RefreshCw, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminPricingPage() {
  const [pricing, setPricing] = useState(mockPricing);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
          setPricing(JSON.parse(saved));
        }
      });
  }, []);

  const handleUpdate = (field: keyof typeof pricing, val: number) => {
    setPricing(prev => ({
      ...prev,
      [field]: val
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pricingConfig: pricing })
    })
      .then(res => res.json())
      .then(() => {
        setLoading(false);
        localStorage.setItem('pricingConfig', JSON.stringify(pricing));
        toast.success("Pricing configurations saved server-side!");
      })
      .catch(() => {
        setLoading(false);
        localStorage.setItem('pricingConfig', JSON.stringify(pricing));
        toast.success("Saved configuration locally.");
      });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">Pricing Setup</h1>
        <p className="text-slate-500 text-xs mt-0.5">Configure per-page paper print rates and minimum thresholds</p>
      </div>

      <div className="bg-brand-50 border border-brand-200 text-brand-800 p-4 rounded-xl text-xs flex gap-2.5">
        <Info size={16} className="text-brand-600 flex-shrink-0 mt-0.5" />
        <span>
          These configurations determine client-side calculations instantly during file configuration. Ensure values conform to the student body expectations.
        </span>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-xl">
        <div className="card-premium bg-white p-6 space-y-4">
          <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide border-b border-slate-100 pb-3 mb-2">
            Per-Page Print Rates
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-slate-500 text-xs font-semibold mb-1 block">A4 Black & White (₹)</label>
              <input 
                type="number" 
                step="0.1"
                min="0"
                value={pricing.A4_BW}
                onChange={e => handleUpdate('A4_BW', parseFloat(e.target.value) || 0)}
                className="input-field text-xs py-2"
              />
            </div>
            <div>
              <label className="text-slate-500 text-xs font-semibold mb-1 block">A4 Color (₹)</label>
              <input 
                type="number" 
                step="0.1"
                min="0"
                value={pricing.A4_Color}
                onChange={e => handleUpdate('A4_Color', parseFloat(e.target.value) || 0)}
                className="input-field text-xs py-2"
              />
            </div>
            <div>
              <label className="text-slate-500 text-xs font-semibold mb-1 block">A3 Black & White (₹)</label>
              <input 
                type="number" 
                step="0.1"
                min="0"
                value={pricing.A3_BW}
                onChange={e => handleUpdate('A3_BW', parseFloat(e.target.value) || 0)}
                className="input-field text-xs py-2"
              />
            </div>
            <div>
              <label className="text-slate-500 text-xs font-semibold mb-1 block">A3 Color (₹)</label>
              <input 
                type="number" 
                step="0.1"
                min="0"
                value={pricing.A3_Color}
                onChange={e => handleUpdate('A3_Color', parseFloat(e.target.value) || 0)}
                className="input-field text-xs py-2"
              />
            </div>
            <div>
              <label className="text-slate-500 text-xs font-semibold mb-1 block">Letter Size (₹)</label>
              <input 
                type="number" 
                step="0.1"
                min="0"
                value={pricing.Letter_BW}
                onChange={e => handleUpdate('Letter_BW', parseFloat(e.target.value) || 0)}
                className="input-field text-xs py-2"
              />
            </div>
            <div>
              <label className="text-slate-500 text-xs font-semibold mb-1 block">Legal Size (₹)</label>
              <input 
                type="number" 
                step="0.1"
                min="0"
                value={pricing.Legal_BW}
                onChange={e => handleUpdate('Legal_BW', parseFloat(e.target.value) || 0)}
                className="input-field text-xs py-2"
              />
            </div>
          </div>
        </div>


        <button 
          type="submit" 
          disabled={loading}
          className="btn-primary text-xs py-2.5 px-6 rounded-xl font-bold shadow-md disabled:opacity-50"
        >
          <Save size={14} />
          {loading ? "Saving changes..." : "Save Pricing Sheets"}
        </button>
      </form>
    </div>
  );
}
