'use client';

import { useState, useEffect } from 'react';
import { Save, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminAccountSettingsPage() {
  const [currentEmailInput, setCurrentEmailInput] = useState('');
  const [newEmailInput, setNewEmailInput] = useState('');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [activeEmail, setActiveEmail] = useState('');

  useEffect(() => {
    const savedEmail = localStorage.getItem('adminEmail') || 'admin@nksmartprint.com';
    setActiveEmail(savedEmail);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentEmailInput) {
      toast.error("Please enter your current login email to verify changes.");
      return;
    }

    const savedEmail = localStorage.getItem('adminEmail') || 'admin@nksmartprint.com';
    if (currentEmailInput.toLowerCase().trim() !== savedEmail.toLowerCase().trim()) {
      toast.error("Current login email ID is incorrect.");
      return;
    }

    if (!currentPassword) {
      toast.error("Please enter your current password to verify identity.");
      return;
    }

    const savedPassword = localStorage.getItem('adminPassword') || 'admin123';
    if (currentPassword !== savedPassword) {
      toast.error("Current password incorrect.");
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match.");
      return;
    }

    if (!newEmailInput && !newPassword) {
      toast.error("Please configure either a new email ID or new password to update.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      
      if (newEmailInput) {
        localStorage.setItem('adminEmail', newEmailInput.toLowerCase().trim());
        setActiveEmail(newEmailInput.toLowerCase().trim());
      }
      if (newPassword) {
        localStorage.setItem('adminPassword', newPassword);
      }
      
      toast.success("Security credentials updated! Next login will require new inputs.");
      
      setCurrentEmailInput('');
      setNewEmailInput('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }, 1200);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">Account & Credentials</h1>
        <p className="text-slate-500 text-xs mt-0.5">Manage owner login mail ID and password credentials securely. These are never shown publicly.</p>
      </div>

      <div className="bg-brand-50 border border-brand-200 text-brand-800 p-4 rounded-xl text-xs">
        ℹ️ Currently active login email: <strong>{activeEmail}</strong>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-xl">
        <div className="card-premium bg-white p-6 space-y-4">
          <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide border-b border-slate-100 pb-3 mb-2 flex items-center gap-2">
            <Lock size={15} className="text-brand-600" /> Verify Identity
          </h3>

          <div className="space-y-4 text-xs">
            {/* Current Email Input */}
            <div>
              <label className="text-slate-500 font-semibold mb-1 block">Current Login Email ID</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="email"
                  required
                  placeholder="Enter current login email"
                  value={currentEmailInput}
                  onChange={e => setCurrentEmailInput(e.target.value)}
                  className="input-field pl-9 py-2"
                />
              </div>
            </div>

            {/* Current Password */}
            <div>
              <label className="text-slate-500 font-semibold mb-1 block">Current Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type={showCurrent ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="input-field pl-9 py-2 font-mono"
                />
                <button 
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <h4 className="font-bold text-slate-800 mb-3 uppercase text-[10px] tracking-wider">Configure New Credentials</h4>
            </div>

            {/* New Email */}
            <div>
              <label className="text-slate-500 font-semibold mb-1 block">New Login Email ID (optional)</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="email"
                  placeholder="Enter new email if changing"
                  value={newEmailInput}
                  onChange={e => setNewEmailInput(e.target.value)}
                  className="input-field pl-9 py-2"
                />
              </div>
            </div>

            {/* New Password */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-500 font-semibold mb-1 block">New Password (optional)</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type={showNew ? "text" : "password"}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="input-field pl-9 py-2 font-mono"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-slate-500 font-semibold mb-1 block">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="input-field pl-9 py-2 font-mono"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="btn-primary text-xs py-2.5 px-6 rounded-xl font-bold shadow-md disabled:opacity-50"
        >
          <Save size={14} />
          {loading ? "Updating credentials..." : "Update Security Settings"}
        </button>
      </form>
    </div>
  );
}
