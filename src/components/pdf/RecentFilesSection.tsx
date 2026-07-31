'use client';

import React, { useEffect, useState } from 'react';
import { History, FileText, Download, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export interface RecentFileRecord {
  id: string;
  name: string;
  toolName: string;
  timestamp: number;
  sizeFormatted: string;
}

export const RecentFilesSection: React.FC = () => {
  const [records, setRecords] = useState<RecentFileRecord[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('recent_pdf_operations');
    if (saved) {
      try {
        setRecords(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse recent PDF records');
      }
    }
  }, []);

  const handleClearHistory = () => {
    localStorage.removeItem('recent_pdf_operations');
    setRecords([]);
    toast.success('Recent operations cleared.');
  };

  if (records.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-12">
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <History size={18} className="text-brand-600" />
          <h3 className="font-extrabold text-sm text-slate-900 tracking-tight uppercase">Recent Operations</h3>
        </div>
        <button
          onClick={handleClearHistory}
          className="text-slate-400 hover:text-red-600 text-xs flex items-center gap-1 font-semibold transition-colors"
        >
          <Trash2 size={13} /> Clear
        </button>
      </div>

      <div className="divide-y divide-slate-100">
        {records.slice(0, 5).map((rec) => (
          <div key={rec.id} className="py-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                <FileText size={16} />
              </div>
              <div>
                <p className="font-bold text-slate-800 truncate max-w-xs">{rec.name}</p>
                <p className="text-[10px] text-slate-400">
                  {rec.toolName} • {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {rec.sizeFormatted}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              Processed
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const saveRecentOperation = (name: string, toolName: string, sizeBytes: number) => {
  try {
    const existing: RecentFileRecord[] = JSON.parse(localStorage.getItem('recent_pdf_operations') || '[]');
    const formatted = (sizeBytes / (1024 * 1024)).toFixed(2) + ' MB';
    const newRecord: RecentFileRecord = {
      id: Date.now().toString(),
      name,
      toolName,
      timestamp: Date.now(),
      sizeFormatted: formatted,
    };
    const updated = [newRecord, ...existing.filter((r) => r.name !== name)].slice(0, 10);
    localStorage.setItem('recent_pdf_operations', JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving recent operation:', e);
  }
};

export default RecentFilesSection;
