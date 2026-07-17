'use client';

import { useState, useEffect } from 'react';
import { 
  Search, Shield, ShieldOff, Edit2, 
  Phone, ShoppingBag, FileText, IndianRupee,
  Calendar, CheckCircle, Notebook
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const formatDateTime = (dateStr?: string) => {
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

  // Customer Editor States
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const fetchCustomers = () => {
    fetch('/api/customers')
      .then(res => res.json())
      .then(data => {
        if (data && data.customers) {
          setCustomers(data.customers);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(c => 
    (c.name || '').toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search) ||
    (c.notes || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleBlock = async (phone: string, name: string) => {
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (data.success) {
        toast[data.isBlocked ? 'error' : 'success'](
          `Customer ${name || phone} ${data.isBlocked ? 'blocked' : 'unblocked'}`
        );
        fetchCustomers();
      } else {
        toast.error("Failed to toggle block status.");
      }
    } catch (e) {
      toast.error("Network error during block toggle.");
    }
  };

  const handleOpenEdit = (customer: any) => {
    setEditingCustomer(customer);
    setEditName(customer.name || '');
    setEditPhone(customer.phone);
    setEditNotes(customer.notes || '');
  };

  const handleSaveEdit = async () => {
    if (!editingCustomer) return;
    toast.loading("Saving changes...", { id: "edit-customer" });
    try {
      const res = await fetch('/api/customers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalPhone: editingCustomer.phone,
          name: editName,
          phone: editPhone,
          notes: editNotes
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Customer details updated successfully!", { id: "edit-customer" });
        setEditingCustomer(null);
        fetchCustomers();
      } else {
        toast.error(data.error || "Failed to update customer.", { id: "edit-customer" });
      }
    } catch (e) {
      toast.error("Network error during update.", { id: "edit-customer" });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Customer Management</h1>
          <p className="text-slate-500 text-xs mt-0.5">Manage accounts, view spent statistics or toggle user blocklist</p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card-premium bg-white p-4">
          <span className="text-slate-800 text-xl font-black">{customers.length}</span>
          <span className="text-slate-400 text-[10px] block font-semibold">Total Customer Profiles</span>
        </div>
        <div className="card-premium bg-white p-4">
          <span className="text-emerald-600 text-xl font-black">
            {customers.filter(c => !c.isBlocked).length}
          </span>
          <span className="text-slate-400 text-[10px] block font-semibold">Active Profiles</span>
        </div>
        <div className="card-premium bg-white p-4">
          <span className="text-rose-600 text-xl font-black">
            {customers.filter(c => c.isBlocked).length}
          </span>
          <span className="text-slate-400 text-[10px] block font-semibold">Blocked Profiles</span>
        </div>
      </div>

      {/* Search tool */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
        <input 
          type="text"
          placeholder="Search by customer name, phone, or notes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field pl-9 py-2 text-xs bg-white"
        />
      </div>

      {/* Table list */}
      <div className="card-premium bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-premium">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone Number</th>
                <th>Total Orders</th>
                <th>Total Pages</th>
                <th>Total Spent</th>
                <th>Last Visit</th>
                <th>Last Pay Type</th>
                <th>Fav Type</th>
                <th>Notes</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-6 text-slate-400 text-xs">
                    No customers found matching search.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(c => (
                  <tr key={c.id} className={`hover:bg-slate-50/50 ${c.isBlocked ? 'opacity-65' : ''}`}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">
                          {c.name ? c.name[0].toUpperCase() : 'C'}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">{c.name || 'Anonymous User'}</div>
                          <div className="text-[9px] text-slate-400">Created {formatDateTime(c.createdAt)}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-slate-700 flex items-center gap-1 font-medium">
                        <Phone size={12} className="text-slate-400" />
                        {c.phone}
                      </span>
                    </td>
                    <td className="font-semibold text-slate-800">
                      <span className="flex items-center gap-1">
                        <ShoppingBag size={12} className="text-slate-400" />
                        {c.totalOrders}
                      </span>
                    </td>
                    <td className="font-semibold text-slate-800">
                      <span className="flex items-center gap-1">
                        <FileText size={12} className="text-slate-400" />
                        {c.totalPages}
                      </span>
                    </td>
                    <td className="font-extrabold text-slate-800">₹{c.totalSpent}</td>
                    <td className="text-slate-500 font-medium">
                      <span className="flex items-center gap-1 text-[10px]">
                        <Calendar size={12} className="text-slate-400" />
                        {formatDateTime(c.lastOrderAt)}
                      </span>
                    </td>
                    <td className="text-slate-600 font-semibold text-[10px]">{c.lastPaymentMethod}</td>
                    <td className="text-slate-700">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        c.favouritePrintType === 'Color' 
                          ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {c.favouritePrintType}
                      </span>
                    </td>
                    <td>
                      {c.notes ? (
                        <div className="max-w-[120px] truncate text-[10px] text-slate-500 font-medium" title={c.notes}>
                          {c.notes}
                        </div>
                      ) : (
                        <span className="text-slate-350 text-[10px] italic">No notes</span>
                      )}
                    </td>
                    <td>
                      {c.isBlocked ? (
                        <span className="badge-status badge-cancelled">🚫 Blocked</span>
                      ) : (
                        <span className="badge-status badge-completed">✓ Active</span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="flex gap-1.5 justify-end">
                        <button 
                          onClick={() => handleToggleBlock(c.phone, c.name || '')}
                          className={`p-1.5 rounded-lg border text-xs ${
                            c.isBlocked 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          }`}
                          title={c.isBlocked ? 'Unblock user' : 'Block user'}
                        >
                          {c.isBlocked ? <ShieldOff size={14} /> : <Shield size={14} />}
                        </button>
                        <button 
                          onClick={() => handleOpenEdit(c)}
                          className="bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 p-1.5 rounded-lg text-xs"
                          title="Edit Details"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100 flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide">
                Edit Customer Details
              </h3>
              <p className="text-slate-400 text-[10px] mt-0.5">Modify information for user profile</p>
            </div>
            
            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="text-slate-500 font-semibold block mb-1">Customer Name</label>
                <input 
                  type="text"
                  required
                  placeholder="Enter customer name"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="input-field py-2 bg-white"
                />
              </div>

              <div>
                <label className="text-slate-500 font-semibold block mb-1">Phone Number (Unique Key)</label>
                <input 
                  type="tel"
                  required
                  placeholder="e.g. +91 9876543210"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  className="input-field py-2 bg-white"
                />
              </div>

              <div>
                <label className="text-slate-500 font-semibold block mb-1">Customer Notes (For Shop Owner Reference)</label>
                <textarea 
                  placeholder="Add notes about user e.g. regular student, prefers card payment, etc."
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  rows={3}
                  className="input-field py-2 bg-white resize-none"
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex gap-3 justify-end text-xs font-bold">
              <button 
                type="button" 
                onClick={() => setEditingCustomer(null)}
                className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleSaveEdit}
                className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl"
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
