'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Printer, ArrowLeft, Search, Clock, CheckCircle, 
  AlertTriangle, Phone, FileText, ShoppingBag, 
  HelpCircle 
} from 'lucide-react';
import { mockOrders } from '@/lib/mockData';
import toast from 'react-hot-toast';

function TrackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialId = searchParams.get('id') || '';

  const [searchVal, setSearchVal] = useState(initialId);
  const [orders, setOrders] = useState<any[]>(mockOrders);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const matchOrder = (order: any, query: string) => {
    if (!query || !order) return false;
    const q = query.trim().toLowerCase();
    const qDigits = query.replace(/\D/g, '');
    const orderId = (order.id || '').toLowerCase();
    const phone = (order.customerPhone || '');
    const phoneDigits = phone.replace(/\D/g, '');
    const name = (order.customerName || '').toLowerCase();
    const pickup = (order.pickupCode || '').toLowerCase();

    if (orderId === q || orderId.includes(q)) return true;
    if (pickup && (pickup === q || pickup.includes(q))) return true;
    if (name && name.includes(q)) return true;
    if (qDigits && qDigits.length >= 4 && (phoneDigits.includes(qDigits) || qDigits.includes(phoneDigits))) return true;
    return false;
  };

  const executeSearch = (term: string, orderList: any[]) => {
    if (!term.trim()) return;
    const results = orderList.filter(o => matchOrder(o, term));
    setSearchResults(results);
    setHasSearched(true);
    return results;
  };

  useEffect(() => {
    // Initial local read for instant display
    let combinedOrders = [...mockOrders];
    try {
      const saved = localStorage.getItem('printOrders');
      const myOrders = localStorage.getItem('myOrders');
      const lastPlaced = localStorage.getItem('lastPlacedOrder');
      
      const localList: any[] = [];
      if (lastPlaced) localList.push(JSON.parse(lastPlaced));
      if (myOrders) localList.push(...JSON.parse(myOrders));
      if (saved) localList.push(...JSON.parse(saved));

      if (localList.length > 0) {
        const unique = Array.from(new Map(localList.map(o => [o.id, o])).values());
        setOrders(unique);
        combinedOrders = unique;
        if (initialId) {
          executeSearch(initialId, unique);
        }
      }
    } catch (e) {}

    // Fetch fresh database orders
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.orders)) {
          // Merge server orders with local recent orders
          const serverOrders = data.orders;
          const merged = Array.from(new Map([...serverOrders, ...combinedOrders].map((o: any) => [o.id, o])).values());
          setOrders(merged);
          localStorage.setItem('printOrders', JSON.stringify(merged));
          if (initialId) {
            const results = executeSearch(initialId, merged);
            if (results && results.length === 0 && initialId) {
              setHasSearched(true);
            }
          }
        }
      })
      .catch((err) => {
        console.warn("Could not fetch fresh orders, using local cache:", err);
      });
  }, [initialId]);

  const handleSearch = (term: string) => {
    if (!term.trim()) return;
    const results = executeSearch(term, orders);
    if (results && results.length > 0) {
      toast.success(`Found ${results.length} order(s)`);
    } else {
      toast.error("No orders found matching this search.");
    }
  };

  const getStatusBadge = (status: string) => {
    const labels: Record<string, { label: string; class: string }> = {
      pending: { label: '💳 Unpaid', class: 'badge-pending' },
      paid: { label: '✅ Payment Verified', class: 'badge-paid' },
      failed: { label: '⚠️ Payment Failed', class: 'badge-cancelled' },
      queued: { label: '⚡ Waiting in Queue', class: 'badge-waiting' },
      printing: { label: '🖨️ Printing Auto', class: 'badge-printing' },
      completed: { label: '🎉 Ready for Pickup', class: 'badge-completed' },
      cancelled: { label: '❌ Cancelled', class: 'badge-cancelled' },
      waiting_approval: { label: '⏳ Waiting for Review', class: 'badge-waiting' },
      waiting_cash: { label: '💵 Pay Cash at Counter', class: 'badge-waiting' },
      error: { label: '⚠️ Print Error / Retrying', class: 'badge-cancelled' }
    };

    const data = labels[status] || { label: status, class: 'bg-slate-100 text-slate-700' };
    return <span className={`badge-status ${data.class}`}>{data.label}</span>;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-slate-500 hover:text-slate-800 flex items-center gap-1">
              <ArrowLeft size={16} />
              <span className="text-xs font-bold">Back to Home</span>
            </Link>
          </div>
          <span className="font-extrabold text-sm text-slate-800 tracking-wider uppercase">
            Order Status Tracking
          </span>
          <div className="w-12"></div>
        </div>
      </header>

      {/* Main Search Area */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Track Your Print Jobs</h1>
          <p className="text-slate-500 text-xs mt-1">Enter your Order ID (e.g. KP-1001) or registered WhatsApp phone number</p>
        </div>

        <div className="flex gap-2 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="e.g. KP-1001 or +91 99887 76655"
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch(searchVal)}
              className="input-field pl-10 py-2.5 text-sm"
            />
          </div>
          <button 
            onClick={() => handleSearch(searchVal)}
            className="btn-primary py-2.5 px-6 text-sm"
          >
            Track
          </button>
        </div>

        {/* Results display */}
        {hasSearched ? (
          <div className="space-y-6">
            {searchResults.length === 0 ? (
              <div className="card-premium p-8 text-center bg-white">
                <AlertTriangle size={36} className="text-amber-500 mx-auto mb-2" />
                <h3 className="font-bold text-slate-800 text-sm">No Orders Found</h3>
                <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
                  We couldn't find any print records matching "{searchVal}". Double check spelling, or make sure your phone format matches your input.
                </p>
              </div>
            ) : (
              searchResults.map(order => (
                <div key={order.id} className="card-premium bg-white p-5 space-y-4">
                  {/* Title Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">Order ID</span>
                      <span className="text-slate-800 font-black text-sm">{order.id}</span>
                    </div>
                    <div>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>

                  {/* Print specifications grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium block">File Info</span>
                      <span className="text-slate-800 font-semibold truncate block max-w-[150px]">{order.fileName}</span>
                      <span className="text-[10px] text-slate-500">{order.fileSize} MB</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Configuration</span>
                      <span className="text-slate-800 font-semibold block capitalize">{order.paperSize} · {order.colorMode === 'bw' ? 'B&W' : 'Color'}</span>
                      <span className="text-[10px] text-slate-500">{order.duplex === 'duplex' ? 'Double Sided' : 'Single Sided'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Copies & Pages</span>
                      <span className="text-slate-800 font-semibold block">{order.copies} copies</span>
                      <span className="text-[10px] text-slate-500">{order.pages} pages per copy</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Total Price</span>
                      <span className="text-brand-600 font-black text-base">₹{order.amount}</span>
                    </div>
                  </div>

                  {/* Pickup Code Display (Only if verified and ready/completed) */}
                  {order.status === 'completed' && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex justify-between items-center">
                      <div>
                        <span className="text-emerald-800 font-bold text-xs block">Ready for Pickup!</span>
                        <span className="text-slate-500 text-[10px]">Show this code at the print counter to collect your pages.</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-semibold block uppercase">Pickup Code</span>
                        <span className="text-emerald-700 font-extrabold text-base tracking-wider">{order.pickupCode}</span>
                      </div>
                    </div>
                  )}

                  {/* Waiting approval info */}
                  {order.status === 'waiting_approval' && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 text-xs flex gap-2">
                      <Clock size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                      <span>
                        This document has been flagged for approval because it exceeds the standard automatic printing page limit. The shop owner is reviewing it. You will receive updates on WhatsApp once approved.
                      </span>
                    </div>
                  )}

                  {/* Bottom timestamps */}
                  <div className="flex justify-between items-center text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                    <span>Source: {order.source === 'web' ? '🌐 Web Portal' : '💬 WhatsApp Bot'}</span>
                    <span>Received: {new Date(order.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="card-premium p-6 text-center bg-white border border-slate-200">
            <ShoppingBag size={28} className="text-slate-300 mx-auto mb-2" />
            <h3 className="font-bold text-slate-800 text-xs">Waiting to Search</h3>
            <p className="text-slate-500 text-xs mt-1">Enter your details to track orders live.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 text-xs font-semibold">Loading print tracker...</div>
      </div>
    }>
      <TrackContent />
    </Suspense>
  );
}
