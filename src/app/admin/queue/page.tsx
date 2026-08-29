'use client';

import { useState, useEffect } from 'react';
import { 
  Printer, X, Pause, Play, Zap, CheckCircle,
  RefreshCw, AlertTriangle, RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';

function isToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

export default function AdminQueuePage() {
  const [queuedJobs, setQueuedJobs] = useState<any[]>([]);
  const [printingJob, setPrintingJob] = useState<any | null>(null);
  const [completedTodayJobs, setCompletedTodayJobs] = useState<any[]>([]);
  const [printers, setPrinters] = useState<any[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [progressVal] = useState(55);
  const [agentConnected, setAgentConnected] = useState(false);
  const [pcName, setPcName] = useState('');
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [editingJob, setEditingJob] = useState<any | null>(null);

  const loadOrders = () => {
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => {
        if (data && data.orders) {
          setQueuedJobs(data.orders.filter((o: any) => ['queued', 'paid', 'waiting_approval', 'waiting_cash'].includes(o.status)));
          setPrintingJob(data.orders.find((o: any) => o.status === 'printing') || null);
          setCompletedTodayJobs(
            data.orders.filter((o: any) => o.status === 'completed' && isToday(o.createdAt))
          );
          localStorage.setItem('printOrders', JSON.stringify(data.orders));
        }
      })
      .catch(() => {
        const saved = localStorage.getItem('printOrders');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setQueuedJobs(parsed.filter((o: any) => ['queued', 'paid', 'waiting_approval', 'waiting_cash'].includes(o.status)));
            setPrintingJob(parsed.find((o: any) => o.status === 'printing') || null);
            setCompletedTodayJobs(
              parsed.filter((o: any) => o.status === 'completed' && isToday(o.createdAt))
            );
          } catch (e) {}
        }
      });
  };

  const loadPrinters = () => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => { if (data && data.printers) setPrinters(data.printers); })
      .catch(() => {});
  };

  useEffect(() => {
    loadOrders();
    loadPrinters();
    const interval = setInterval(loadOrders, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkAgent = () => {
      fetch('http://localhost:4000/status')
        .then(res => res.json())
        .then(data => { setAgentConnected(true); setPcName(data.pcName); })
        .catch(() => setAgentConnected(false));
    };
    checkAgent();
    const interval = setInterval(checkAgent, 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePauseToggle = async () => {
    const nextState = !isPaused;
    setIsPaused(nextState);
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoPrintEnabled: !nextState })
      });
      toast.success(nextState ? 'Print agent queue paused.' : 'Print agent queue resumed.');
    } catch {
      toast.error('Failed to sync pause state.');
    }
  };

  const handleSaveEditedJob = async () => {
    if (!editingJob) return;
    const toastId = toast.loading(`Saving changes for ${editingJob.id}...`);
    try {
      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingJob.id,
          copies: editingJob.copies,
          colorMode: editingJob.colorMode,
          duplex: editingJob.duplex,
          paperSize: editingJob.paperSize,
          assignedPrinterId: editingJob.assignedPrinterId ?? ''
        })
      });
      if (res.ok) {
        toast.success(`Settings saved for Order ${editingJob.id}`, { id: toastId });
        setEditingJob(null);
        loadOrders();
      } else {
        toast.error('Failed to save order settings.', { id: toastId });
      }
    } catch {
      toast.error('Error saving order settings.', { id: toastId });
    }
  };

  const handleCancelConfirm = async (mode: 'requeue' | 'discard') => {
    if (!cancelTarget) return;
    const id = cancelTarget.id;
    setCancelTarget(null);
    const newStatus = mode === 'requeue' ? 'cancel_requested' : 'cancelled';
    const label = mode === 'requeue' ? 'Re-queued for retry' : 'Discarded permanently';
    try {
      await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });
      setPrintingJob(null);
      toast.success(`Order ${id} — ${label}.`);
      loadOrders();
    } catch {
      toast.error('Failed to cancel order.');
    }
  };

  const handleReprint = async (job: any) => {
    const toastId = toast.loading(`Re-queuing ${job.id} for reprint...`);
    try {
      await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: job.id, status: 'queued' })
      });
      toast.success(`Order ${job.id} sent back to print queue!`, { id: toastId });
      loadOrders();
    } catch {
      toast.error('Failed to re-queue order.', { id: toastId });
    }
  };

  const getPrinterName = (printerId?: string) => {
    if (!printerId) return 'Auto Select';
    return printers.find(p => p.id === printerId)?.name || 'Auto Select';
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">Live Print Queue</h1>
        <p className="text-slate-500 text-xs mt-0.5">Active session synced with Windows Print Spooler</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">

          {/* Currently Printing */}
          {printingJob ? (
            <div className="card-premium border-brand-300 bg-brand-50/15 p-5 relative overflow-hidden">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600">
                  <Printer size={18} />
                </div>
                <div>
                  <span className="text-[10px] text-brand-600 font-bold uppercase tracking-wider block">Currently Printing</span>
                  <h3 className="text-slate-900 font-black text-sm">{printingJob.id}</h3>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <div className="pulse-dot pulse-dot-blue" />
                  <span className="text-brand-600 text-xs font-bold uppercase">Spooling</span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs mb-4">
                <div><span className="text-slate-400 font-medium block">File</span><span className="text-slate-800 font-semibold truncate block max-w-[150px]">{printingJob.fileName}</span></div>
                <div><span className="text-slate-400 font-medium block">Format</span><span className="text-slate-800 font-semibold block uppercase">{printingJob.paperSize} · {printingJob.colorMode}</span></div>
                <div><span className="text-slate-400 font-medium block">Pages</span><span className="text-slate-800 font-semibold block">{printingJob.pages}p × {printingJob.copies}</span></div>
                <div className="col-span-2 sm:col-span-3">
                  <span className="text-slate-400 font-medium block mb-0.5">Active Printer</span>
                  <span className="text-brand-700 font-bold text-[11px] bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full inline-block">
                    🖨 {getPrinterName(printingJob.assignedPrinterId)}
                  </span>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1.5 font-medium">
                  <span>Spooling Progress</span><span>{progressVal}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="bg-brand-600 h-2 rounded-full transition-all duration-300 animate-pulse" style={{ width: `${progressVal}%` }} />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button onClick={handlePauseToggle} className="btn-secondary text-[10px] py-1.5 px-3 flex items-center gap-1">
                  {isPaused ? <Play size={12} /> : <Pause size={12} />}
                  {isPaused ? 'Resume' : 'Pause Queue'}
                </button>
                <button
                  onClick={() => setCancelTarget(printingJob)}
                  className="bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100/50 text-[10px] py-1.5 px-3 rounded-lg font-bold flex items-center gap-1"
                >
                  <X size={12} /> Stop Print Job
                </button>
              </div>
            </div>
          ) : (
            <div className="card-premium p-10 text-center bg-white">
              <Printer size={32} className="text-slate-300 mx-auto mb-2" />
              <h3 className="font-bold text-slate-800 text-sm">No Jobs Active</h3>
              <p className="text-slate-500 text-xs mt-1">Waiting for incoming paid orders.</p>
            </div>
          )}

          {/* Waiting in Spooler */}
          <div className="card-premium bg-white overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-amber-500" />
                <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">Waiting in Spooler</h3>
              </div>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{queuedJobs.length} Job(s)</span>
            </div>
            <div className="divide-y divide-slate-100">
              {queuedJobs.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">No jobs in queue.</div>
              ) : (
                queuedJobs.map((job, idx) => (
                  <div key={job.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-slate-100 text-slate-700 font-bold rounded-full flex items-center justify-center text-[10px]">{idx + 1}</span>
                      <div>
                        <span className="font-bold text-brand-600 block">{job.id}</span>
                        <span className="text-[10px] text-slate-500 block truncate max-w-[160px]">{job.customerName} · {job.fileName}</span>
                        <span className="text-[9px] text-brand-500 font-semibold">🖨 {getPrinterName(job.assignedPrinterId)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-slate-500 font-medium">
                        <span>{job.pages}p × {job.copies}</span>
                        <span className="block text-[9px] uppercase font-bold text-slate-400">{job.paperSize} · {job.colorMode} · {job.duplex}</span>
                      </div>
                      <button onClick={() => setEditingJob({ ...job })} className="bg-brand-50 hover:bg-brand-100 text-brand-700 text-[10px] font-bold px-2.5 py-1 rounded border border-brand-200">
                        Edit Options
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Completed Today */}
          <div className="card-premium bg-white overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-500" />
                <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">Completed Today</h3>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{completedTodayJobs.length} Job(s)</span>
            </div>
            <div className="divide-y divide-slate-100">
              {completedTodayJobs.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">No prints completed today yet.</div>
              ) : (
                completedTodayJobs.map(job => (
                  <div key={job.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50/30">
                    <div>
                      <span className="font-bold text-slate-700 block">{job.id}</span>
                      <span className="text-[10px] text-slate-400 block">{job.fileName}</span>
                      <span className="text-[9px] text-slate-400">{job.pages}p · {job.copies} copies · {getPrinterName(job.assignedPrinterId)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">Printed ✓</span>
                      <button
                        onClick={() => handleReprint(job)}
                        className="bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 text-[10px] font-bold px-2.5 py-1 rounded flex items-center gap-1"
                        title="Reprint this job"
                      >
                        <RefreshCw size={10} /> Reprint
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <div className="card-premium bg-white p-5">
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide border-b border-slate-100 pb-3 mb-4">Agent Connection</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Connection</span>
                <span className={`badge-status ${agentConnected ? 'badge-paid' : 'bg-rose-100 text-rose-700'}`}>{agentConnected ? '🟢 Connected' : '🔴 Offline'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Queue State</span>
                <span className={`font-bold text-xs ${isPaused ? 'text-amber-600' : 'text-emerald-600'}`}>{isPaused ? '⏸ Paused' : '▶ Running'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">OS Hostname</span>
                <span className="font-bold text-slate-700">{agentConnected ? pcName : '—'}</span>
              </div>
            </div>
            {!agentConnected && (
              <p className="text-[10px] text-slate-400 mt-3 leading-relaxed border-t border-slate-100 pt-3">
                ⚠️ Run <code className="bg-slate-100 text-slate-700 px-1 rounded font-mono font-bold text-[9px]">java -jar KrishnaPrintAgent.jar</code> on the shop PC.
              </p>
            )}
          </div>
          <div className="card-premium bg-white p-5">
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide border-b border-slate-100 pb-3 mb-4">Queue Controls Guide</h3>
            <div className="space-y-2 text-[11px] text-slate-500 leading-relaxed">
              <p>• <strong className="text-slate-700">Edit Options</strong> — Change printer, copies, color, duplex before printing.</p>
              <p>• <strong className="text-slate-700">Stop Print Job</strong> — Re-queue for retry (change printer) or discard.</p>
              <p>• <strong className="text-slate-700">Reprint</strong> — Re-queues a same-day completed order immediately.</p>
              <p>• <strong className="text-slate-700">Pause Queue</strong> — Halts agent from picking up new jobs.</p>
            </div>
          </div>
        </div>
      </div>

      {/* EDIT JOB MODAL */}
      {editingJob && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Edit Print Options</h3>
                <p className="text-slate-400 text-[10px] mt-0.5">Order {editingJob.id}</p>
              </div>
              <button onClick={() => setEditingJob(null)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Copies</label>
                <input type="number" min={1} max={50} value={editingJob.copies || 1}
                  onChange={e => setEditingJob({ ...editingJob, copies: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full border border-slate-200 rounded-lg p-2 font-bold text-slate-800" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Color Mode</label>
                <select value={editingJob.colorMode || 'bw'} onChange={e => setEditingJob({ ...editingJob, colorMode: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 font-bold text-slate-800">
                  <option value="bw">Black &amp; White (Monochrome)</option>
                  <option value="color">Color</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Sides</label>
                <select value={editingJob.duplex || 'simplex'} onChange={e => setEditingJob({ ...editingJob, duplex: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 font-bold text-slate-800">
                  <option value="simplex">Single-sided (Simplex)</option>
                  <option value="duplex">Double-sided (Duplex)</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Paper Size</label>
                <select value={editingJob.paperSize || 'A4'} onChange={e => setEditingJob({ ...editingJob, paperSize: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 font-bold text-slate-800">
                  <option value="A4">A4</option>
                  <option value="A3">A3</option>
                  <option value="Letter">Letter</option>
                  <option value="Legal">Legal</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  🖨 Target Printer
                  <span className="text-slate-400 font-normal ml-1 text-[10px]">(reassign if wrong printer)</span>
                </label>
                <select value={editingJob.assignedPrinterId || ''} onChange={e => setEditingJob({ ...editingJob, assignedPrinterId: e.target.value })} className="w-full border border-brand-200 bg-brand-50/30 rounded-lg p-2 font-bold text-slate-800">
                  <option value="">Auto — Capability Routing</option>
                  {printers.map(p => (
                    <option key={p.id} value={p.id}>{p.name}{p.isDefault ? ' ★ Default' : ''}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-3 border-t">
              <button onClick={() => setEditingJob(null)} className="flex-1 btn-secondary text-xs py-2">Cancel</button>
              <button onClick={handleSaveEditedJob} className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs py-2 rounded-xl">Save &amp; Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL CONFIRMATION MODAL */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Stop Print Job?</h3>
                <p className="text-slate-400 text-[10px] mt-0.5">Order {cancelTarget.id} · {cancelTarget.fileName}</p>
              </div>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed">The job is currently printing. What would you like to do?</p>
            <div className="space-y-2">
              <button onClick={() => handleCancelConfirm('requeue')} className="w-full flex items-center gap-3 p-3 border-2 border-brand-200 bg-brand-50 hover:bg-brand-100 rounded-xl text-left transition-all">
                <RotateCcw size={18} className="text-brand-600 flex-shrink-0" />
                <div>
                  <span className="font-bold text-brand-700 text-xs block">Re-queue for Retry</span>
                  <span className="text-slate-500 text-[10px]">Stop current print, return job to queue. Change the printer before it prints again.</span>
                </div>
              </button>
              <button onClick={() => handleCancelConfirm('discard')} className="w-full flex items-center gap-3 p-3 border-2 border-rose-200 bg-rose-50 hover:bg-rose-100 rounded-xl text-left transition-all">
                <X size={18} className="text-rose-600 flex-shrink-0" />
                <div>
                  <span className="font-bold text-rose-700 text-xs block">Discard Permanently</span>
                  <span className="text-slate-500 text-[10px]">Cancel this job completely. Marked as cancelled and removed from queue.</span>
                </div>
              </button>
            </div>
            <button onClick={() => setCancelTarget(null)} className="w-full btn-secondary text-xs py-2">Keep Printing</button>
          </div>
        </div>
      )}
    </div>
  );
}
