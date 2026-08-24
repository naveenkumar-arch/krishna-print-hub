'use client';

import { useState, useEffect } from 'react';
import { 
  Search, Filter, CheckCircle, XCircle, 
  RotateCcw, Trash2, ArrowLeft, RefreshCw, Edit2
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [printers, setPrinters] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const formatOrderDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Modal Editing States
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [editPaperSize, setEditPaperSize] = useState<string>('A4');
  const [editColorMode, setEditColorMode] = useState<string>('bw');
  const [editDuplex, setEditDuplex] = useState<string>('simplex');
  const [editCopies, setEditCopies] = useState<number>(1);
  const [editPages, setEditPages] = useState<number>(1);
  const [editAssignedPrinterId, setEditAssignedPrinterId] = useState<string>('');

  const fetchOrders = () => {
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => {
        if (data && data.orders) {
          setOrders(data.orders);
          localStorage.setItem('printOrders', JSON.stringify(data.orders));
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
  };

  const fetchPrinters = () => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data && data.printers) {
          setPrinters(data.printers);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchOrders();
    fetchPrinters();
    const interval = setInterval(fetchOrders, 4000);
    return () => clearInterval(interval);
  }, []);

  const updateOrderInDb = async (id: string, updatedFields: any) => {
    const next = orders.map(o => o.id === id ? { ...o, ...updatedFields } : o);
    setOrders(next);
    localStorage.setItem('printOrders', JSON.stringify(next));

    if (updatedFields.status !== undefined || updatedFields.assignedPrinterId !== undefined) {
      try {
        await fetch('/api/orders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...updatedFields })
        });
      } catch(e) {}
    }
  };

  const handleOpenEdit = (order: any) => {
    setEditingOrder(order);
    setEditPaperSize(order.paperSize);
    setEditColorMode(order.colorMode);
    setEditDuplex(order.duplex);
    setEditCopies(order.copies);
    setEditPages(order.pages);
    setEditAssignedPrinterId(order.assignedPrinterId || '');
  };

  const handleSaveEdit = async () => {
    if (!editingOrder) return;
    toast.loading("Saving changes...", { id: "edit-order" });
    try {
      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingOrder.id,
          paperSize: editPaperSize,
          colorMode: editColorMode,
          duplex: editDuplex,
          copies: editCopies,
          pages: editPages,
          assignedPrinterId: editAssignedPrinterId
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Order details updated successfully!", { id: "edit-order" });
        setEditingOrder(null);
        fetchOrders();
      } else {
        toast.error(data.error || "Failed to update order.", { id: "edit-order" });
      }
    } catch (e) {
      toast.error("Network error during update.", { id: "edit-order" });
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (!confirm(`Are you sure you want to permanently delete order ${id}? This action cannot be undone.`)) {
      return;
    }
    toast.loading("Deleting order...", { id: "delete-order" });
    try {
      const res = await fetch(`/api/orders?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Order ${id} deleted successfully!`, { id: "delete-order" });
        fetchOrders();
      } else {
        toast.error(data.error || "Failed to delete order.", { id: "delete-order" });
      }
    } catch (e) {
      toast.error("Network error during deletion.", { id: "delete-order" });
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.customerName.toLowerCase().includes(search.toLowerCase()) || 
                          o.id.toLowerCase().includes(search.toLowerCase()) ||
                          o.customerPhone.includes(search);
    const matchesFilter = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const handleApprove = (id: string) => {
    updateOrderInDb(id, { status: 'queued' });
    toast.success(`Order ${id} approved & added to print queue.`);
  };

  const handleReject = (id: string) => {
    updateOrderInDb(id, { status: 'cancelled' });
    toast.error(`Order ${id} rejected.`);
  };

  const handleReprint = (order: any) => {
    // FIX: Keep assignedPrinterId so the job reprints on the same printer
    updateOrderInDb(order.id, { status: 'queued', assignedPrinterId: order.assignedPrinterId || '' });
    toast.success(`Order ${order.id} re-queued for reprint.`);
  };

  const handleRefund = (id: string) => {
    updateOrderInDb(id, { status: 'cancelled' });
    toast.success(`Refund initiated for Order ${id}.`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Order Management</h1>
          <p className="text-slate-500 text-xs mt-0.5">Filter, search, approve or reprint jobs</p>
        </div>
      </div>

      {/* Filter and Search Bar row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input 
            type="text"
            placeholder="Search by ID, name, or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9 py-2 text-xs"
          />
        </div>

        <select 
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="input-field py-2 text-xs sm:w-48 bg-white"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Unpaid</option>
          <option value="paid">Payment Verified</option>
          <option value="waiting_cash">💰 Waiting Cash Payment</option>
          <option value="queued">Queued</option>
          <option value="printing">Printing Now</option>
          <option value="completed">Completed / Ready</option>
          <option value="error">❌ Error / Failed</option>
          <option value="cancelled">Cancelled / Refunded</option>
          <option value="waiting_approval">Waiting Approval</option>
        </select>
      </div>

      {/* Main orders table */}
      <div className="card-premium bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-premium">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer Details</th>
                <th>Document Name</th>
                <th>Configuration</th>
                <th>Target Printer</th>
                <th>Cost</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400 text-xs">
                    No orders matching criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(o => {
                  const targetName = printers.find(p => p.id === o.assignedPrinterId)?.name || 'Auto capabilities routing';
                  return (
                    <tr key={o.id} className="hover:bg-slate-50/50">
                      <td className="font-extrabold text-brand-600">{o.id}</td>
                      <td>
                        <div className="font-semibold text-slate-800">{o.customerName}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{o.customerPhone}</div>
                        <div className="text-[9px] text-slate-400 font-medium mt-0.5">{formatOrderDate(o.createdAt)}</div>
                      </td>
                      <td>
                        <div className="truncate max-w-[160px] font-medium text-slate-700">{o.fileName}</div>
                        <div className="text-[10px] text-slate-400">{o.fileSize} MB · {o.pages} pages</div>
                      </td>
                      <td>
                        <div className="text-slate-800">{o.paperSize} · {o.colorMode === 'bw' ? 'B&W' : 'Color'}</div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {o.copies} copies · {o.duplex === 'duplex' ? 'Double-Sided' : 'Single-Sided'}
                        </div>
                      </td>
                      <td className="font-semibold text-slate-700">
                        {o.assignedPrinterId ? (
                          <span className="text-brand-700 bg-brand-50 border border-brand-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            {targetName}
                          </span>
                        ) : (
                          <span className="text-slate-550 text-[10px] px-2 py-0.5 rounded-full border border-slate-200">
                            Auto Select
                          </span>
                        )}
                      </td>
                      <td className="font-bold text-slate-800">₹{o.amount}</td>
                      <td>
                        <span className={`badge-status text-[10px] ${
                          o.status === 'completed' ? 'badge-completed' :
                          o.status === 'printing' ? 'badge-printing' :
                          o.status === 'waiting_approval' ? 'badge-waiting' : 
                          o.status === 'waiting_cash' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          o.status === 'paid' ? 'badge-paid' : 
                          o.status === 'error' ? 'bg-rose-100 text-rose-800 border border-rose-300 font-bold' : 'badge-cancelled'
                        }`}>
                          {o.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex gap-1.5 justify-end">
                          {/* Approval Actions */}
                          {(o.status === 'waiting_approval' || o.status === 'waiting_cash' || o.status === 'pending') && (
                            <>
                              <button 
                                onClick={() => handleApprove(o.id)}
                                className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100/70 p-1.5 rounded-lg text-xs flex items-center gap-1 font-semibold"
                                title={o.status === 'pending' || o.status === 'waiting_cash' ? "Approve & Collect Cash" : "Approve Print"}
                              >
                                <CheckCircle size={14} />
                                {(o.status === 'waiting_cash' || o.status === 'pending') && <span>Collect Cash</span>}
                              </button>
                              <button 
                                onClick={() => handleReject(o.id)}
                                className="bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100/70 p-1.5 rounded-lg text-xs"
                                title="Reject Print"
                              >
                                <XCircle size={14} />
                              </button>
                            </>
                          )}

                          {/* Retry failed print jobs */}
                          {o.status === 'error' && (
                            <button 
                              onClick={() => handleReprint(o)}
                              className="bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 p-1.5 rounded-lg text-xs flex items-center gap-1 font-bold"
                              title="Retry Printing this Order"
                            >
                              <RotateCcw size={13} /> Retry Print
                            </button>
                          )}

                          {/* Edit Settings Actions */}
                          {(o.status === 'pending' || o.status === 'waiting_approval' || o.status === 'waiting_cash' || o.status === 'paid' || o.status === 'queued' || o.status === 'error') && (
                            <button 
                              onClick={() => handleOpenEdit(o)}
                              className="bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100/70 p-1.5 rounded-lg text-xs"
                              title="Edit Print Settings / Assign Printer"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          {/* Reprint — only for today's completed orders */}
                          {o.status === 'completed' && (() => {
                            if (!o.createdAt) return false;
                            const d = new Date(o.createdAt);
                            const now = new Date();
                            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
                          })() && (
                            <button 
                              onClick={() => handleReprint(o)}
                              className="bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100/70 p-1.5 rounded-lg text-xs flex items-center gap-1 font-semibold"
                              title="Reprint Job (same-day only)"
                            >
                              <RotateCcw size={12} /> Reprint
                            </button>
                          )}
                          {o.status === 'paid' && (
                            <button 
                              onClick={() => handleRefund(o.id)}
                              className="bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 p-1.5 rounded-lg text-xs"
                              title="Initiate Refund"
                            >
                              Refund
                            </button>
                          )}
                          
                          {/* Admin manual delete button */}
                          <button 
                            onClick={() => handleDeleteOrder(o.id)}
                            className="bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100/70 p-1.5 rounded-lg text-xs"
                            title="Delete Order Permanently"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide">
                Edit Print Configuration
              </h3>
              <p className="text-slate-400 text-[10px] mt-0.5">Adjust settings for Order {editingOrder.id}</p>
            </div>
            
            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Paper Size */}
              <div>
                <label className="text-slate-500 font-semibold block mb-1">Paper Size</label>
                <select 
                  value={editPaperSize} 
                  onChange={e => setEditPaperSize(e.target.value)}
                  className="input-field py-2 bg-white"
                >
                  <option value="A4">A4</option>
                  <option value="A3">A3</option>
                  <option value="Letter">Letter</option>
                  <option value="Legal">Legal</option>
                </select>
              </div>

              {/* Color Mode */}
              <div>
                <label className="text-slate-500 font-semibold block mb-1">Color Mode</label>
                <div className="flex gap-2">
                  {['bw', 'color'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setEditColorMode(m)}
                      className={`flex-1 py-2 px-3 border rounded-lg text-xs font-semibold transition-all ${
                        editColorMode === m 
                          ? 'bg-brand-50 border-brand-300 text-brand-700' 
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {m === 'bw' ? 'Black & White' : 'Color'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duplex Mode */}
              <div>
                <label className="text-slate-500 font-semibold block mb-1">Print Layout</label>
                <div className="flex gap-2">
                  {[
                    { val: 'simplex', label: 'Single-Sided' },
                    { val: 'duplex', label: 'Double-Sided' }
                  ].map(d => (
                    <button
                      key={d.val}
                      type="button"
                      onClick={() => setEditDuplex(d.val)}
                      className={`flex-1 py-2 px-3 border rounded-lg text-xs font-semibold transition-all ${
                        editDuplex === d.val 
                          ? 'bg-brand-50 border-brand-300 text-brand-700' 
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Copies & Pages (if editable) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-500 font-semibold block mb-1">Copies</label>
                  <input 
                    type="number" 
                    min={1} 
                    max={100}
                    value={editCopies} 
                    onChange={e => setEditCopies(parseInt(e.target.value) || 1)}
                    className="input-field py-2 text-center"
                  />
                </div>
                <div>
                  <label className="text-slate-500 font-semibold block mb-1">Pages</label>
                  <input 
                    type="number" 
                    min={1} 
                    max={1000}
                    value={editPages} 
                    onChange={e => setEditPages(parseInt(e.target.value) || 1)}
                    className="input-field py-2 text-center"
                  />
                </div>
              </div>

              {/* Printer Override Selection */}
              <div>
                <label className="text-slate-500 font-semibold block mb-1">Target Printer Selection (Override)</label>
                <select 
                  value={editAssignedPrinterId} 
                  onChange={e => setEditAssignedPrinterId(e.target.value)}
                  className="input-field py-2 bg-white"
                >
                  <option value="">Automatic Printer Selection (Default)</option>
                  {printers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.isDefault ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex gap-2 justify-end">
              <button 
                type="button"
                onClick={() => setEditingOrder(null)}
                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleSaveEdit}
                className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
