'use client';

import { useState, useEffect } from 'react';
import { 
  mockRules 
} from '@/lib/mockData';
import { Save, AlertTriangle, CheckSquare, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminRulesPage() {
  const [rules, setRules] = useState(mockRules);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.printRules) {
          setRules(data.printRules);
          localStorage.setItem('printRules', JSON.stringify(data.printRules));
        }
      })
      .catch(() => {
        const saved = localStorage.getItem('printRules');
        if (saved) {
          setRules(JSON.parse(saved));
        }
      });
  }, []);

  const handleUpdate = (field: keyof typeof rules, val: any) => {
    setRules(prev => ({
      ...prev,
      [field]: val
    }));
  };

  const handleToggleFileType = (type: string) => {
    const updated = rules.allowedFileTypes.includes(type)
      ? rules.allowedFileTypes.filter(t => t !== type)
      : [...rules.allowedFileTypes, type];
    handleUpdate('allowedFileTypes', updated);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ printRules: rules })
    })
      .then(res => res.json())
      .then(() => {
        setLoading(false);
        localStorage.setItem('printRules', JSON.stringify(rules));
        toast.success("Printing limits and approval boundaries saved server-side!");
      })
      .catch(() => {
        setLoading(false);
        localStorage.setItem('printRules', JSON.stringify(rules));
        toast.success("Saved configuration locally.");
      });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">Print Rules</h1>
        <p className="text-slate-500 text-xs mt-0.5">Control file bounds, allowed formats and manual check thresholds</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-xl">
        
        {/* Bounds */}
        <div className="card-premium bg-white p-6 space-y-4">
          <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide border-b border-slate-100 pb-3 mb-2">
            Upload Bounds
          </h3>

          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-semibold text-slate-700 block">Maximum Upload File Size (MB)</span>
                <span className="text-[10px] text-slate-400 block">Rejects larger files before uploading.</span>
              </div>
              <input 
                type="number"
                value={rules.maxUploadSizeMB}
                onChange={e => handleUpdate('maxUploadSizeMB', parseInt(e.target.value) || 1)}
                className="input-field w-24 text-center py-1.5"
              />
            </div>

            <div className="flex justify-between items-center">
              <div>
                <span className="font-semibold text-slate-700 block">Maximum Copies Per Document</span>
                <span className="text-[10px] text-slate-400 block">Prevents abuse by capping copies count.</span>
              </div>
              <input 
                type="number"
                value={rules.maxCopies}
                onChange={e => handleUpdate('maxCopies', parseInt(e.target.value) || 1)}
                className="input-field w-24 text-center py-1.5"
              />
            </div>

            <div className="flex justify-between items-center">
              <div>
                <span className="font-semibold text-slate-700 block">Maximum Pages Per Document</span>
                <span className="text-[10px] text-slate-400 block">Absolute limit on single print job size.</span>
              </div>
              <input 
                type="number"
                value={rules.maxPages}
                onChange={e => handleUpdate('maxPages', parseInt(e.target.value) || 1)}
                className="input-field w-24 text-center py-1.5"
              />
            </div>
          </div>
        </div>

        {/* Approval check limit threshold */}
        <div className="card-premium bg-white p-6 space-y-4 border border-amber-200 bg-amber-50/5">
          <div className="flex gap-2 items-center text-amber-800">
            <AlertTriangle size={16} />
            <h3 className="font-extrabold text-xs uppercase tracking-wide">
              Approval Queue Flag
            </h3>
          </div>
          <p className="text-slate-500 text-[11px] leading-relaxed">
            Jobs exceeding this page threshold will not print automatically. Instead, they require the owner's manual approval in the dashboard.
          </p>

          <div className="flex justify-between items-center text-xs mt-2">
            <div>
              <span className="font-semibold text-slate-700 block">Manual Check Threshold (Pages)</span>
              <span className="text-[10px] text-slate-400">Forces jobs of size &gt; threshold to wait for approval.</span>
            </div>
            <input 
              type="number"
              value={rules.autoApprovalPageLimit}
              onChange={e => handleUpdate('autoApprovalPageLimit', parseInt(e.target.value) || 1)}
              className="input-field w-24 text-center py-1.5 font-bold text-amber-700 border-amber-300"
            />
          </div>
        </div>

        {/* Print Mode Selection */}
        <div className="card-premium bg-white p-6 space-y-4">
          <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide border-b border-slate-100 pb-3 mb-2 flex items-center gap-1.5">
            <Settings size={15} className="text-brand-600" /> Print Mode
          </h3>
          <p className="text-slate-500 text-[11px] leading-relaxed">
            Choose how paid print jobs are processed: automatically printed or held for configuration verification.
          </p>

          <div className="space-y-3.5 text-xs mt-2">
            <label className={`border rounded-xl p-3 flex items-start gap-3 cursor-pointer transition-all ${
              (rules.printMode || 'self') === 'self' ? 'border-brand-500 bg-brand-50/10 font-bold' : 'border-slate-200'
            }`}>
              <input
                type="radio"
                name="printMode"
                checked={(rules.printMode || 'self') === 'self'}
                onChange={() => handleUpdate('printMode', 'self')}
                className="text-brand-600 focus:ring-brand-500 mt-0.5"
              />
              <div>
                <span className="text-slate-800 font-semibold block">Self Print Mode (Recommended)</span>
                <span className="text-slate-400 text-[10px] font-medium block mt-0.5">
                  Paid orders are automatically sent to the print agent instantly, unless they exceed the manual page threshold.
                </span>
              </div>
            </label>

            <label className={`border rounded-xl p-3 flex items-start gap-3 cursor-pointer transition-all ${
              rules.printMode === 'assisted' ? 'border-brand-500 bg-brand-50/10 font-bold' : 'border-slate-200'
            }`}>
              <input
                type="radio"
                name="printMode"
                checked={rules.printMode === 'assisted'}
                onChange={() => handleUpdate('printMode', 'assisted')}
                className="text-brand-600 focus:ring-brand-500 mt-0.5"
              />
              <div>
                <span className="text-slate-800 font-semibold block">Assisted Print Mode</span>
                <span className="text-slate-400 text-[10px] font-medium block mt-0.5">
                  All paid print jobs are held in the "Waiting Approval" queue. The admin must verify print options and click "Approve" manually.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* File extensions */}
        <div className="card-premium bg-white p-6 space-y-4">
          <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide border-b border-slate-100 pb-3 mb-2">
            Allowed Extensions
          </h3>

          <div className="flex flex-wrap gap-2">
            {['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'jpg', 'png', 'jpeg', 'zip'].map(ext => {
              const active = rules.allowedFileTypes.includes(ext);
              return (
                <button
                  type="button"
                  key={ext}
                  onClick={() => handleToggleFileType(ext)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase border transition-all ${
                    active 
                      ? 'bg-brand-50 border-brand-300 text-brand-700' 
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  .{ext}
                </button>
              );
            })}
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="btn-primary text-xs py-2.5 px-6 rounded-xl font-bold shadow-md disabled:opacity-50"
        >
          <Save size={14} />
          {loading ? "Saving limits..." : "Save Printing Rules"}
        </button>
      </form>
    </div>
  );
}
