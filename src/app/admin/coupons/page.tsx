'use client';

import { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, Power, PowerOff, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface Coupon {
  code: string;
  discountPercent: number;
  isActive: boolean;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New coupon form state
  const [newCode, setNewCode] = useState('');
  const [newPercent, setNewPercent] = useState<number>(10);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchCoupons = () => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.coupons) {
          setCoupons(data.coupons);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const saveCouponsOnServer = async (updatedCoupons: Coupon[]) => {
    setSaving(true);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coupons: updatedCoupons })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Coupons successfully synced with cloud config!");
      } else {
        toast.error("Failed to sync coupons with cloud.");
      }
    } catch (e) {
      toast.error("Network error saving coupons.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedCode = newCode.trim().toUpperCase();
    if (!formattedCode) {
      toast.error("Please enter a valid coupon code.");
      return;
    }

    if (coupons.some(c => c.code === formattedCode)) {
      toast.error(`Coupon code ${formattedCode} already exists.`);
      return;
    }

    if (newPercent < 1 || newPercent > 100) {
      toast.error("Discount percentage must be between 1 and 100.");
      return;
    }

    const updated = [...coupons, { code: formattedCode, discountPercent: newPercent, isActive: true }];
    setCoupons(updated);
    saveCouponsOnServer(updated);
    
    // Reset modal
    setNewCode('');
    setNewPercent(10);
    setShowAddModal(false);
  };

  const handleDelete = (code: string) => {
    const updated = coupons.filter(c => c.code !== code);
    setCoupons(updated);
    saveCouponsOnServer(updated);
    toast.success(`Coupon ${code} deleted.`);
  };

  const handleToggleActive = (code: string) => {
    const updated = coupons.map(c => 
      c.code === code ? { ...c, isActive: !c.isActive } : c
    );
    setCoupons(updated);
    saveCouponsOnServer(updated);
    const item = updated.find(c => c.code === code);
    toast[item?.isActive ? 'success' : 'error'](
      `Coupon ${code} is now ${item?.isActive ? 'ACTIVE' : 'INACTIVE'}.`
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Discount Coupons</h1>
          <p className="text-slate-500 text-xs mt-0.5">Configure codes, toggle activations, or run promotion campaigns</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary text-xs py-2 px-4 rounded-xl font-bold flex items-center gap-1.5 shadow-md"
        >
          <Plus size={15} /> Add Coupon
        </button>
      </div>

      {/* Coupons grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs font-semibold">
            Loading coupon configurations...
          </div>
        ) : coupons.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 border border-dashed border-slate-200 bg-white rounded-2xl">
            <Tag size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-semibold">No promotional coupons configured yet.</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Click "Add Coupon" to create one.</p>
          </div>
        ) : (
          coupons.map(coupon => (
            <div 
              key={coupon.code} 
              className={`card-premium p-5 bg-white relative flex flex-col justify-between transition-all duration-200 ${
                !coupon.isActive ? 'border-dashed border-slate-200 opacity-65 bg-slate-50/50' : 'border-slate-100'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-brand-50 border border-brand-100 text-brand-700 flex items-center justify-center">
                      <Tag size={16} />
                    </span>
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm tracking-tight">{coupon.code}</h4>
                      <span className={`badge-status text-[9px] mt-0.5 ${
                        coupon.isActive ? 'badge-completed' : 'badge-cancelled'
                      }`}>
                        {coupon.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pb-2">
                  <span className="text-slate-800 text-3xl font-black">{coupon.discountPercent}%</span>
                  <span className="text-slate-400 text-[10px] block font-semibold">Discount Discounted</span>
                </div>
              </div>

              <div className="flex gap-2 justify-end border-t border-slate-100 pt-4 mt-4">
                <button
                  onClick={() => handleToggleActive(coupon.code)}
                  className={`p-1.5 rounded-lg border text-xs flex items-center justify-center transition-all ${
                    coupon.isActive 
                      ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' 
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  }`}
                  title={coupon.isActive ? "Deactivate Coupon" : "Activate Coupon"}
                >
                  {coupon.isActive ? <PowerOff size={14} /> : <Power size={14} />}
                </button>
                <button
                  onClick={() => handleDelete(coupon.code)}
                  className="bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 p-1.5 rounded-lg text-xs flex items-center justify-center"
                  title="Delete Coupon"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Coupon Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden border border-slate-100">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide">
                Create Promotion Coupon
              </h3>
            </div>
            
            <form onSubmit={handleAddCoupon}>
              <div className="p-5 space-y-4 text-xs">
                <div>
                  <label className="text-slate-500 font-semibold block mb-1">Coupon Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SRM50, FESTIVE10"
                    value={newCode}
                    onChange={e => setNewCode(e.target.value)}
                    className="input-field py-2 text-xs font-bold tracking-widest uppercase"
                  />
                </div>

                <div>
                  <label className="text-slate-500 font-semibold block mb-1">Discount Percent (%)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={newPercent}
                    onChange={e => setNewPercent(parseInt(e.target.value) || 1)}
                    className="input-field py-2 text-xs text-center font-bold"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm"
                >
                  Create Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
