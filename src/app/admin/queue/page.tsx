'use client';

import { useState, useEffect } from 'react';
import { 
  Printer, X, SkipForward, Pause, Play, Zap, CheckCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminQueuePage() {
  const [queuedJobs, setQueuedJobs] = useState<any[]>([]);
  const [printingJob, setPrintingJob] = useState<any | null>(null);
  const [completedJobs, setCompletedJobs] = useState<any[]>([]);
  
  const [isPaused, setIsPaused] = useState(false);
  const [progressVal, setProgressVal] = useState(30);

  const [agentConnected, setAgentConnected] = useState(false);
  const [pcName, setPcName] = useState('');

  useEffect(() => {
    const loadOrders = () => {
      fetch('/api/orders')
        .then(res => res.json())
        .then(data => {
          if (data && data.orders) {
            setQueuedJobs(data.orders.filter((o: any) => o.status === 'queued'));
            setPrintingJob(data.orders.find((o: any) => o.status === 'printing') || null);
            setCompletedJobs(data.orders.filter((o: any) => o.status === 'completed'));
            localStorage.setItem('printOrders', JSON.stringify(data.orders));
          }
        })
        .catch(() => {
          const saved = localStorage.getItem('printOrders');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              setQueuedJobs(parsed.filter((o: any) => o.status === 'queued'));
              setPrintingJob(parsed.find((o: any) => o.status === 'printing') || null);
              setCompletedJobs(parsed.filter((o: any) => o.status === 'completed'));
            } catch (e) {}
          }
        });
    };

    loadOrders();
    const interval = setInterval(loadOrders, 3000);
    return () => clearInterval(interval);
  }, []);

  const syncQueueToDb = async (activePrint: any, pending: any[], done: any[]) => {
    const saved = localStorage.getItem('printOrders');
    if (saved) {
      try {
        const allOrders = JSON.parse(saved) as any[];
        const next = allOrders.map(o => {
          if (activePrint && o.id === activePrint.id) return { ...o, status: 'printing' };
          if (pending.some(p => p.id === o.id)) return { ...o, status: 'queued' };
          if (done.some(d => d.id === o.id)) return { ...o, status: 'completed' };
          return o;
        });
        localStorage.setItem('printOrders', JSON.stringify(next));
      } catch(err) {}
    }

    try {
      if (activePrint) {
        await fetch('/api/orders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: activePrint.id, status: 'printing' })
        });
      }
      if (done.length > 0) {
        await fetch('/api/orders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: done[0].id, status: 'completed' })
        });
      }
    } catch (e) {}
  };

  useEffect(() => {
    const checkAgent = () => {
      fetch('http://localhost:4000/status')
        .then(res => res.json())
        .then(data => {
          setAgentConnected(true);
          setPcName(data.pcName);
        })
        .catch(() => {
          setAgentConnected(false);
        });
    };

    checkAgent();
    const interval = setInterval(checkAgent, 5000);
    return () => clearInterval(interval);
  }, []);

  // Automated printing progression simulation disabled to prevent fake status overrides

  const [editingJob, setEditingJob] = useState<any | null>(null);

  const handlePauseToggle = async () => {
    const nextState = !isPaused;
    setIsPaused(nextState);
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoPrintEnabled: !nextState })
      });
      toast.success(nextState ? "Print agent queue paused." : "Print agent queue resumed.");
    } catch (err) {
      toast.error("Failed to sync pause state.");
    }
  };

  const handleSaveEditedJob = async () => {
    if (!editingJob) return;
    try {
      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingJob)
      });
      if (res.ok) {
        toast.success(`Updated settings for Order ${editingJob.id}`);
        setEditingJob(null);
        // Refresh queue
        fetch('/api/orders')
          .then(r => r.json())
          .then(data => {
            if (data?.orders) {
              setQueuedJobs(data.orders.filter((o: any) => o.status === 'queued'));
            }
          });
      } else {
        toast.error("Failed to save order settings.");
      }
    } catch (e) {
      toast.error("Error saving order settings.");
    }
  };

  const handleCancelJob = () => {
    if (!printingJob) return;
    toast.error(`Cancelled Job: Order ${printingJob.id}`);
    
    // Sync with backend API
    fetch('/api/orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: printingJob.id, status: 'cancelled' })
    }).catch(() => {});

    setPrintingJob(null);
    setProgressVal(0);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">Live Print Queue</h1>
        <p className="text-slate-500 text-xs mt-0.5">Active WebSocket session synced with Windows Print Spooler</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Live queue list */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Active printing order card */}
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

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs mb-4">
                <div>
                  <span className="text-slate-400 font-medium block">File Uploaded</span>
                  <span className="text-slate-800 font-semibold truncate block max-w-[150px]">{printingJob.fileName}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Format Configuration</span>
                  <span className="text-slate-800 font-semibold block uppercase">{printingJob.paperSize} · {printingJob.colorMode}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Pages Total</span>
                  <span className="text-slate-800 font-semibold block">{printingJob.pages}p × {printingJob.copies} copies</span>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1.5 font-medium">
                  <span>Printing Job Progress</span>
                  <span>{progressVal}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className="bg-brand-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${progressVal}%` }}
                  ></div>
                </div>
              </div>

              {/* Action tools inside card */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button 
                  onClick={handlePauseToggle}
                  className="btn-secondary text-[10px] py-1.5 px-3 flex items-center gap-1"
                >
                  {isPaused ? <Play size={12} /> : <Pause size={12} />}
                  {isPaused ? "Resume" : "Pause Queue"}
                </button>
                <button 
                  onClick={handleCancelJob}
                  className="bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100/50 text-[10px] py-1.5 px-3 rounded-lg font-bold"
                >
                  Cancel Spool
                </button>
              </div>
            </div>
          ) : (
            <div className="card-premium p-10 text-center bg-white">
              <Printer size={32} className="text-slate-300 mx-auto mb-2" />
              <h3 className="font-bold text-slate-800 text-sm">No Jobs Active</h3>
              <p className="text-slate-500 text-xs mt-1">Wait for incoming online orders.</p>
            </div>
          )}

          {/* Pending Queue */}
          <div className="card-premium bg-white overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-amber-500" />
                <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">Waiting in Spooler</h3>
              </div>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {queuedJobs.length} Job(s)
              </span>
            </div>
            
            <div className="divide-y divide-slate-100">
              {queuedJobs.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">No jobs in queue.</div>
              ) : (
                queuedJobs.map((job, idx) => (
                  <div key={job.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-slate-100 text-slate-700 font-bold rounded-full flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-bold text-brand-600 block">{job.id}</span>
                        <span className="text-[10px] text-slate-500 block truncate max-w-[180px]">
                          {job.customerName} · {job.fileName}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-slate-500 font-medium">
                        <span>{job.pages}p × {job.copies}</span>
                        <span className="block text-[9px] uppercase font-bold text-slate-400">{job.paperSize} · {job.colorMode} · {job.duplex}</span>
                      </div>
                      <button
                        onClick={() => setEditingJob({ ...job })}
                        className="bg-brand-50 hover:bg-brand-100 text-brand-700 text-[10px] font-bold px-2.5 py-1 rounded border border-brand-200"
                      >
                        Edit Options
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Edit Order Options Modal */}
          {editingJob && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-extrabold text-slate-900 text-sm">Edit Print Options ({editingJob.id})</h3>
                  <button onClick={() => setEditingJob(null)} className="text-slate-400 hover:text-slate-600">
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Copies</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={editingJob.copies || 1}
                      onChange={e => setEditingJob({ ...editingJob, copies: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-full border rounded-lg p-2 font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Color Mode</label>
                    <select
                      value={editingJob.colorMode || 'bw'}
                      onChange={e => setEditingJob({ ...editingJob, colorMode: e.target.value })}
                      className="w-full border rounded-lg p-2 font-bold"
                    >
                      <option value="bw">Black & White (Monochrome)</option>
                      <option value="color">Color</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Duplex (Sides)</label>
                    <select
                      value={editingJob.duplex || 'simplex'}
                      onChange={e => setEditingJob({ ...editingJob, duplex: e.target.value })}
                      className="w-full border rounded-lg p-2 font-bold"
                    >
                      <option value="simplex">Single-sided (Simplex)</option>
                      <option value="duplex">Double-sided (Duplex)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Paper Size</label>
                    <select
                      value={editingJob.paperSize || 'A4'}
                      onChange={e => setEditingJob({ ...editingJob, paperSize: e.target.value })}
                      className="w-full border rounded-lg p-2 font-bold"
                    >
                      <option value="A4">A4</option>
                      <option value="A3">A3</option>
                      <option value="Letter">Letter</option>
                      <option value="Legal">Legal</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t">
                  <button
                    onClick={() => setEditingJob(null)}
                    className="flex-1 btn-secondary text-xs py-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEditedJob}
                    className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs py-2 rounded-xl"
                  >
                    Save & Apply
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Completed Jobs today */}
          <div className="card-premium bg-white overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-500" />
                <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">Completed Today</h3>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {completedJobs.length} Job(s)
              </span>
            </div>
            
            <div className="divide-y divide-slate-100">
              {completedJobs.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">No prints completed yet.</div>
              ) : (
                completedJobs.map(job => (
                  <div key={job.id} className="p-4 flex items-center justify-between text-xs opacity-80">
                    <div>
                      <span className="font-bold text-slate-700 block">{job.id}</span>
                      <span className="text-[10px] text-slate-400 block">{job.fileName}</span>
                    </div>
                    <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                      Printed
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Info panel bar */}
        <div className="space-y-4">
          
          {/* Agent connection state */}
          <div className="card-premium bg-white p-5">
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide border-b border-slate-100 pb-3 mb-4">
              Agent Connection
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Connection State</span>
                <span className={`badge-status ${agentConnected ? 'badge-paid' : 'bg-rose-100 text-rose-700'}`}>
                  {agentConnected ? 'Connected' : 'Offline'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Session Type</span>
                <span className="font-bold text-slate-700">{agentConnected ? 'Active Poll (CORS)' : '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Node Agent ver.</span>
                <span className="font-bold text-slate-700">1.0.0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">OS Hostname</span>
                <span className="font-bold text-slate-700">{agentConnected ? pcName : '-'}</span>
              </div>
            </div>
            {!agentConnected && (
              <p className="text-[10px] text-slate-400 mt-3 leading-relaxed border-t border-slate-100 pt-3">
                ⚠️ Connect desktop print agent to sync spooled documents dynamically. Run <code className="bg-slate-100 text-slate-700 px-1 rounded font-mono font-bold text-[9px]">node print-agent.js</code> in folder.
              </p>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
