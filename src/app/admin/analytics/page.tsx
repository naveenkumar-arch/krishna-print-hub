'use client';

import { useState, useEffect } from 'react';
import { 
  mockAnalytics 
} from '@/lib/mockData';
import { 
  BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, Tooltip, CartesianGrid, 
  ResponsiveContainer 
} from 'recharts';
import { DollarSign, ShoppingBag, FileText, Star, Inbox } from 'lucide-react';
import { Order } from '@/lib/types';

const COLORS = ['#7c3aed', '#10b981', '#f59e0b', '#3b82f6'];

export default function AdminAnalyticsPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => {
        if (data.orders) {
          setOrders(data.orders);
        }
      })
      .catch(() => {
        const saved = localStorage.getItem('printOrders');
        if (saved) {
          try {
            setOrders(JSON.parse(saved));
          } catch (e) {
            setOrders([]);
          }
        }
      });
  }, []);

  // Compute weekly/daily stats dynamically for the last 7 days
  const getWeeklyStats = () => {
    const dailyMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyMap[dateStr] = 0;
    }

    const paidOrders = orders.filter(o => o.status !== 'failed' && o.status !== 'cancelled' && o.status !== 'pending');
    paidOrders.forEach(o => {
      if (o.createdAt) {
        const dateStr = new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (dailyMap[dateStr] !== undefined) {
          dailyMap[dateStr] += 1;
        }
      }
    });

    return Object.entries(dailyMap).map(([date, ordersCount]) => ({
      date,
      orders: ordersCount
    }));
  };

  const weeklyStats = getWeeklyStats();

  // Compute live metrics from actual orders database
  const paidOrders = orders.filter(o => o.status !== 'failed' && o.status !== 'cancelled' && o.status !== 'pending');
  const totalRevenue = paidOrders.reduce((sum, o) => sum + o.amount, 0);
  const totalJobs = paidOrders.length;
  const totalSheets = paidOrders.reduce((sum, o) => sum + (o.pages * o.copies), 0);
  
  // Calculate unique student phone numbers
  const uniquePhones = new Set(paidOrders.map(o => o.customerPhone));
  const uniqueStudentsCount = uniquePhones.size;

  // Compute top spenders list dynamically
  const spendersMap: Record<string, { name: string; phone: string; spent: number; count: number }> = {};
  paidOrders.forEach(o => {
    if (!spendersMap[o.customerPhone]) {
      spendersMap[o.customerPhone] = { name: o.customerName, phone: o.customerPhone, spent: 0, count: 0 };
    }
    spendersMap[o.customerPhone].spent += o.amount;
    spendersMap[o.customerPhone].count += 1;
  });

  const topSpenders = Object.values(spendersMap)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 4);

  // Compute paper type breakdown dynamically
  const a4Count = paidOrders.filter(o => o.paperSize === 'A4').length;
  const a3Count = paidOrders.filter(o => o.paperSize === 'A3').length;
  const letterLegalCount = paidOrders.filter(o => o.paperSize === 'Letter' || o.paperSize === 'Legal').length;
  const totalPaperOrders = a4Count + a3Count + letterLegalCount || 1;

  const dynamicPaperUsage = [
    { name: "A4 Black & White/Color", value: Math.round((a4Count / totalPaperOrders) * 100) },
    { name: "A3 Large sheets", value: Math.round((a3Count / totalPaperOrders) * 100) },
    { name: "Letter / Legal sizes", value: Math.round((letterLegalCount / totalPaperOrders) * 100) }
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">Business Analytics</h1>
        <p className="text-slate-500 text-xs mt-0.5">Overview of store revenue streams, print volumes, and paper distributions</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-premium bg-white p-5">
          <div className="flex justify-between items-center text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold">Total Revenue</span>
            <DollarSign size={16} className="text-brand-600" />
          </div>
          <span className="text-slate-800 text-xl font-black">₹{totalRevenue.toLocaleString()}</span>
        </div>

        <div className="card-premium bg-white p-5">
          <div className="flex justify-between items-center text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold">Printed Jobs</span>
            <ShoppingBag size={16} className="text-brand-600" />
          </div>
          <span className="text-slate-800 text-xl font-black">{totalJobs}</span>
        </div>

        <div className="card-premium bg-white p-5">
          <div className="flex justify-between items-center text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold">Total Sheets Printed</span>
            <FileText size={16} className="text-brand-600" />
          </div>
          <span className="text-slate-800 text-xl font-black">{totalSheets}</span>
        </div>

        <div className="card-premium bg-white p-5">
          <div className="flex justify-between items-center text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold">Unique Students</span>
            <Star size={16} className="text-brand-600" />
          </div>
          <span className="text-slate-800 text-xl font-black">{uniqueStudentsCount}</span>
        </div>
      </div>

      {/* Graphs */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Daily order volume bar chart */}
        <div className="lg:col-span-2 card-premium bg-white p-5">
          <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide border-b border-slate-100 pb-3 mb-4">
            Daily Job Counts
          </h3>
          <div className="h-56 flex items-center justify-center">
            {totalJobs === 0 ? (
              <div className="text-slate-400 text-xs text-center">
                <Inbox size={28} className="mx-auto mb-2 opacity-50" />
                No daily spooled job statistics registered yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: 8, fontSize: 11 }}
                    formatter={(value) => [value, 'Orders']}
                  />
                  <Bar dataKey="orders" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Paper usage pie chart */}
        <div className="card-premium bg-white p-5 flex flex-col">
          <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide border-b border-slate-100 pb-3 mb-4">
            Paper Types Spooled
          </h3>
          <div className="h-44 flex-1 flex items-center justify-center">
            {totalJobs === 0 ? (
              <div className="text-slate-400 text-[10px] text-center">No spooled pages.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={dynamicPaperUsage}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {dynamicPaperUsage.map((entry, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="space-y-1.5 mt-3 text-[10px] text-slate-500 font-medium">
            {dynamicPaperUsage.map((entry, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full block" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  {entry.name}
                </span>
                <span className="font-bold text-slate-700">{totalJobs > 0 ? `${entry.value}%` : '0%'}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Row 3: Top customer spenders list */}
      <div className="card-premium bg-white p-5 max-w-xl">
        <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide border-b border-slate-100 pb-3 mb-4">
          Top Student Spenders
        </h3>
        <div className="space-y-3">
          {topSpenders.length === 0 ? (
            <div className="text-slate-400 text-xs py-4 text-center">No transaction records registered.</div>
          ) : (
            topSpenders.map((c, idx) => (
              <div key={c.phone} className="flex items-center justify-between text-xs border-b border-slate-50 pb-2 last:border-b-0">
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-400 font-bold w-4">{idx + 1}</span>
                  <div>
                    <span className="font-semibold text-slate-800 block">{c.name || 'Anonymous Student'}</span>
                    <span className="text-[10px] text-slate-400 block">{c.phone}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-800 block">₹{c.spent} spent</span>
                  <span className="text-[10px] text-slate-500 block">{c.count} order receipt(s)</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
