'use client';

import { useState, useEffect } from 'react';
import { 
  mockShopSettings 
} from '@/lib/mockData';
import { Save, Store, MapPin, Phone, Mail, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminShopSettingsPage() {
  const [shop, setShop] = useState(mockShopSettings);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.shopSettings) {
          setShop(data.shopSettings);
          localStorage.setItem('shopSettings', JSON.stringify(data.shopSettings));
        }
      })
      .catch(() => {
        const saved = localStorage.getItem('shopSettings');
        if (saved) {
          setShop(JSON.parse(saved));
        }
      });
  }, []);

  const handleUpdate = (field: keyof typeof shop, val: string) => {
    setShop(prev => ({
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
      body: JSON.stringify({ shopSettings: shop })
    })
      .then(res => res.json())
      .then(() => {
        setLoading(false);
        localStorage.setItem('shopSettings', JSON.stringify(shop));
        toast.success("Shop branding updated server-side!");
      })
      .catch(() => {
        setLoading(false);
        localStorage.setItem('shopSettings', JSON.stringify(shop));
        toast.success("Shop branding updated locally.");
      });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">Shop Settings</h1>
        <p className="text-slate-500 text-xs mt-0.5">Customize public profile contact listings, location markers, and tags</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-xl">
        <div className="card-premium bg-white p-6 space-y-4">
          <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide border-b border-slate-100 pb-3 mb-2 flex items-center gap-2">
            <Store size={15} className="text-brand-600" /> General Shop Info
          </h3>

          <div className="space-y-3.5">
            <div>
              <label className="text-slate-500 text-xs font-semibold mb-1 block">Shop Name</label>
              <input 
                type="text"
                required
                value={shop.name}
                onChange={e => handleUpdate('name', e.target.value)}
                className="input-field text-xs py-2"
              />
            </div>

            <div>
              <label className="text-slate-500 text-xs font-semibold mb-1 block">Branding Tagline</label>
              <input 
                type="text"
                required
                value={shop.tagline}
                onChange={e => handleUpdate('tagline', e.target.value)}
                className="input-field text-xs py-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-500 text-xs font-semibold mb-1 block">Phone / WhatsApp updates</label>
                <input 
                  type="text"
                  required
                  value={shop.phone}
                  onChange={e => handleUpdate('phone', e.target.value)}
                  className="input-field text-xs py-2"
                />
              </div>
              <div>
                <label className="text-slate-500 text-xs font-semibold mb-1 block">Shop Email</label>
                <input 
                  type="email"
                  required
                  value={shop.email}
                  onChange={e => handleUpdate('email', e.target.value)}
                  className="input-field text-xs py-2"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-500 text-xs font-semibold mb-1 block">Physical Address</label>
              <textarea 
                rows={2}
                required
                value={shop.address}
                onChange={e => handleUpdate('address', e.target.value)}
                className="input-field text-xs py-2 resize-none"
              ></textarea>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-500 text-xs font-semibold mb-1 block">Working Hours Listing</label>
                <input 
                  type="text"
                  required
                  value={shop.workingHoursText}
                  onChange={e => handleUpdate('workingHoursText', e.target.value)}
                  className="input-field text-xs py-2"
                />
              </div>
              <div>
                <label className="text-slate-500 text-xs font-semibold mb-1 block">GSTIN Number</label>
                <input 
                  type="text"
                  value={shop.gstNumber || ''}
                  onChange={e => handleUpdate('gstNumber', e.target.value)}
                  className="input-field text-xs py-2"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-500 text-xs font-semibold mb-1 block">Google Maps Marker Location URL</label>
              <input 
                type="text"
                value={shop.googleMapsUrl || ''}
                onChange={e => handleUpdate('googleMapsUrl', e.target.value)}
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
          {loading ? "Saving branding..." : "Save branding updates"}
        </button>
      </form>
    </div>
  );
}
