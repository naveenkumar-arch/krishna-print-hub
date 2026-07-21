'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShoppingBag, DollarSign, AlertTriangle, Printer, Inbox 
} from 'lucide-react';
import { mockAnalytics } from '@/lib/mockData';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Order } from '@/lib/types';

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [printers, setPrinters] = useState<any[]>([]);

  useEffect(() => {
    // Load live orders from server
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => {
        if (data && data.orders) {
          setOrders(data.orders);
          localStorage.setItem('printOrders', JSON.stringify(data.orders));
        }
      })
      .catch(() => {
        const savedOrders = localStorage.getItem('printOrders');
        if (savedOrders) {
          try {
            setOrders(JSON.parse(savedOrders));
          } catch (e) {
            setOrders([]);
          }
        }
      });

    // Check print agent connectivity dynamically
    const checkPrinters = () => {
      fetch('http://localhost:4000/status')
        .then(res => res.json())
        .then(data => {
          if (data.printers && data.printers.length > 0) {
            const mapped = data.printers.map((p: any, idx: number) => ({
              id: `real-${idx}`,
              name: p.Name,
              brand: "Windows Spooler",
              model: "Active Ink/Laser",
              status: (p.PrinterStatus.toLowerCase() === 'idle' ? 'idle' : 'offline') as 'idle' | 'offline',
              inkLevels: { black: p.InkLevel || 92 },
              paperLevels: { A4: p.PaperLevel || 420 }
            }));
            setPrinters(mapped);
          }
        })
        .catch(() => {
          const savedCustom = localStorage.getItem('customPrinters');
          if (savedCustom) {
            setPrinters(JSON.parse(savedCustom));
          } else {
            setPrinters([]);
          }
        });
    };
    checkPrinters();
    const interval = setInterval(checkPrinters, 5000);
    return () => clearInterval(interval);
  }, []);

  // Compute live local metrics
  const activeOrders = orders.filter(o => o.status !== 'cancelled' && o.status !== 'failed' && o.status !== 'pending');
  const totalRevenue = activeOrders.reduce((sum, item) => sum + item.amount, 0);
  const pendingCount = orders.filter(o => o.status === 'waiting_approval').length;
  const printingCount = orders.filter(o => o.status === 'printing').length;

  const getWeeklyStats = () => {
    const stats = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      
      const dayOrders = orders.filter(o => {
        if (!o.createdAt) return false;
        const orderDate = new Date(o.createdAt);
        return orderDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) === dateStr &&
               o.status !== 'cancelled' && o.status !== 'failed' && o.status !== 'pending';
      });
      
      const revenue = dayOrders.reduce((sum, o) => sum + o.amount, 0);
      const ordersCount = dayOrders.length;
      
      stats.push({
        date: dateStr,
        revenue: Number(revenue.toFixed(2)),
        orders: ordersCount
      });
    }
    return stats;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Upper header title */}
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">Overview</h1>
        <p className="text-slate-500 text-xs mt-0.5">Real-time statistics for Krishna Students Print Hub</p>
      </div>

      {/* Stats Cards grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Revenue */}
        <div className="card-premium bg-white p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-slate-800 text-2xl font-black">₹{totalRevenue}</span>
            <span className="text-slate-400 text-[10px] block font-semibold">Total Revenue</span>
          </div>
        </div>

        {/* Total Orders */}
        <div className="card-premium bg-white p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600">
              <ShoppingBag size={18} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-slate-800 text-2xl font-black">{orders.length}</span>
            <span className="text-slate-400 text-[10px] block font-semibold">Total Orders</span>
          </div>
        </div>

        {/* Pending Approval */}
        <div className="card-premium bg-white p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <AlertTriangle size={18} />
            </div>
            {pendingCount > 0 && (
              <span className="text-[9px] text-amber-700 font-bold bg-amber-100/70 px-1.5 py-0.5 rounded">
                Action Needed
              </span>
            )}
          </div>
          <div className="mt-4">
            <span className="text-slate-800 text-2xl font-black">{pendingCount}</span>
            <span className="text-slate-400 text-[10px] block font-semibold">Awaiting Approval</span>
          </div>
        </div>

        {/* Printing status */}
        <div className="card-premium bg-white p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Printer size={18} />
            </div>
            {printingCount > 0 && (
              <div className="pulse-dot pulse-dot-blue" />
            )}
          </div>
          <div className="mt-4">
            <span className="text-slate-800 text-2xl font-black">{printingCount}</span>
            <span className="text-slate-400 text-[10px] block font-semibold">Jobs Printing Now</span>
          </div>
        </div>

      </div>

      {/* Row 2: Charts and Printer state */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Weekly chart */}
        <div className="lg:col-span-2 card-premium bg-white p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">
              Weekly Revenue Flow
            </h3>
          </div>
          <div className="h-56 flex items-center justify-center">
            {orders.length === 0 ? (
              <div className="text-slate-400 text-xs text-center">
                <Inbox size={28} className="mx-auto mb-2 opacity-50" />
                No spooled order transactions registered yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getWeeklyStats()}>
                  <defs>
                    <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: 8, fontSize: 11 }}
                    formatter={(value) => [`₹${value}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2} fillOpacity={1} fill="url(#purpleGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Printer Live State */}
        <div className="card-premium bg-white p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">
              Printer Live Status
            </h3>
            <Link href="/admin/printers" className="text-brand-600 text-[10px] font-bold hover:underline">
              Configure
            </Link>
          </div>

          <div className="space-y-4">
            {printers.length === 0 ? (
              <div className="text-slate-400 text-xs text-center py-10 leading-relaxed">
                ⚠️ No printer connected.<br />
                Connect local spool agent or manually pair a printer device.
              </div>
            ) : (
              printers.map(p => {
                const queueCount = orders.filter(o => o.status === 'queued').length;
                const printingJob = orders.find(o => o.status === 'printing');
                const printStatusText = printingJob ? "Printing" : (p.status === 'idle' ? "Idle / Standby" : "Offline");
                const isPrinting = !!printingJob;
                
                return (
                  <div key={p.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <span className="text-slate-800 text-xs font-bold block truncate">{p.name}</span>
                        <span className="text-slate-400 text-[9px] block uppercase">{p.brand} {p.model}</span>
                      </div>
                      <span className={`badge-status text-[10px] ${
                        isPrinting ? 'badge-printing' : p.status === 'idle' ? 'badge-completed' : 'badge-cancelled'
                      }`}>
                        ● {printStatusText.toUpperCase()}
                      </span>
                    </div>

                    {/* Telemetry info */}
                    <div className="grid grid-cols-2 gap-2 border-t border-b border-slate-100 py-2 text-[10px] text-slate-500 font-semibold">
                      <div>
                        <span>Queue</span>
                        <span className="block text-slate-800 font-black text-xs mt-0.5">{queueCount} Jobs</span>
                      </div>
                      <div>
                        <span>Current Job</span>
                        <span className="block text-slate-800 font-bold truncate mt-0.5">
                          {printingJob ? printingJob.id : '-'}
                        </span>
                      </div>
                      {isPrinting && (
                        <div className="col-span-2 mt-1">
                          <div className="flex justify-between mb-0.5">
                            <span>Status</span>
                            <span className="text-brand-600 font-bold max-w-[120px] truncate">{printingJob.fileName}</span>
                          </div>
                          <div className="flex justify-between text-[9px] text-slate-400">
                            <span>Estimated Finish:</span>
                            <span className="font-bold text-slate-700">18 sec</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Ink Levels progress */}
                    <div className="space-y-1.5 text-[10px]">
                      <div>
                        <div className="flex justify-between text-slate-500 mb-0.5">
                          <span>Toner / Black Ink</span>
                          <span className="font-bold text-slate-700">{p.inkLevels.black}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                          <div className="bg-brand-600 h-1.5 rounded-full" style={{ width: `${p.inkLevels.black}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-slate-500 mb-0.5">
                          <span>Paper Cassette (A4)</span>
                          <span className="font-bold text-slate-700">{p.paperLevels?.A4 || 420} sheets</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                          <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${((p.paperLevels?.A4 || 420) / 500) * 100}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Row 3: Recent Orders Table list */}
      <div className="card-premium bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">
            Recent Jobs
          </h3>
          <Link href="/admin/orders">
            <button className="btn-secondary text-[10px] py-1.5 px-3 bg-white">
              All Orders
            </button>
          </Link>
        </div>

        <div className="overflow-x-auto">
          {orders.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs font-semibold">
              No recent print jobs recorded in database.
            </div>
          ) : (
            <table className="table-premium">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>File Name</th>
                  <th>Pages × Copies</th>
                  <th>Amount</th>
                  <th>Source</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 4).map(o => (
                  <tr key={o.id} className="hover:bg-slate-50/50">
                    <td className="font-bold text-brand-600">{o.id}</td>
                    <td>
                      <div className="font-semibold">{o.customerName}</div>
                      <div className="text-slate-400 text-[10px]">{o.customerPhone}</div>
                    </td>
                    <td className="truncate max-w-[150px]">{o.fileName}</td>
                    <td>{o.pages}p × {o.copies}</td>
                    <td className="font-bold text-slate-800">₹{o.amount}</td>
                    <td>
                      <span className="text-[10px] uppercase font-bold text-slate-500">
                        {o.source === 'web' ? '🌐 Web' : '💬 WhatsApp'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge-status text-[10px] ${
                        o.status === 'completed' ? 'badge-completed' :
                        o.status === 'printing' ? 'badge-printing' :
                        o.status === 'waiting_approval' ? 'badge-waiting' : 'badge-paid'
                      }`}>
                        {o.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
