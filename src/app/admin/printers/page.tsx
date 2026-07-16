'use client';

import { useState, useEffect } from 'react';
import { 
  mockPrinters 
} from '@/lib/mockData';
import { 
  Printer as PrinterIcon, TestTube, Plus, Info, Usb, Wifi, Monitor, Power, Settings2, RefreshCcw 
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PrinterConfig {
  id: string;
  name: string;
  brand: string;
  model: string;
  status: 'online' | 'offline' | 'printing' | 'idle' | 'error';
  connectionType: 'USB' | 'LAN' | 'WiFi';
  ipAddress?: string;
  inkLevels: {
    black: number;
    cyan?: number;
    magenta?: number;
    yellow?: number;
  };
  paperLevels: {
    A4: number;
    A3?: number;
  };
  isDefault: boolean;
  supportsColor?: boolean;
  supportsA3?: boolean;
  isHighSpeed?: boolean;
}

export default function AdminPrintersPage() {
  const [printers, setPrinters] = useState<PrinterConfig[]>(mockPrinters);
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(true);
  const [loadingTest, setLoadingTest] = useState<string | null>(null);
  
  const [agentConnected, setAgentConnected] = useState(false);
  const [pcName, setPcName] = useState('');

  // Modal setup
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newConnectionType, setNewConnectionType] = useState<'USB' | 'LAN' | 'WiFi'>('USB');
  const [newPortOrIp, setNewPortOrIp] = useState('USB001');
  const [newModel, setNewModel] = useState('');
  const [newSupportsColor, setNewSupportsColor] = useState(false);
  const [newSupportsA3, setNewSupportsA3] = useState(false);
  const [newIsHighSpeed, setNewIsHighSpeed] = useState(false);

  useEffect(() => {
    // 1. Load initial printer config states from database
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.hasOwnProperty('autoPrintEnabled')) setAutoPrintEnabled(data.autoPrintEnabled);
        if (data.printers && data.printers.length > 0) {
          setPrinters(data.printers);
        } else {
          setPrinters(mockPrinters);
        }
      })
      .catch(() => {
        const savedAuto = localStorage.getItem('autoPrintEnabled');
        if (savedAuto) setAutoPrintEnabled(savedAuto === 'true');
        const savedCustom = localStorage.getItem('customPrinters');
        if (savedCustom) setPrinters(JSON.parse(savedCustom));
      });

    const checkAgent = () => {
      fetch('/api/config')
        .then(res => res.json())
        .then(cfg => {
          const ping = cfg.lastAgentPing;
          if (ping) {
            const diff = Date.now() - new Date(ping).getTime();
            if (diff < 15000) { // last check-in within 15 seconds
              setAgentConnected(true);
              setPcName("Krishna Desktop Print Agent (Active)");
              if (cfg.printers && cfg.printers.length > 0) {
                setPrinters(cfg.printers);
              }
              return;
            }
          }
          setAgentConnected(false);
          if (cfg.printers && cfg.printers.length > 0) {
            setPrinters(cfg.printers);
          }
        })
        .catch(() => {
          setAgentConnected(false);
        });
    };

    checkAgent();
    const interval = setInterval(checkAgent, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleAutoPrint = async () => {
    const nextVal = !autoPrintEnabled;
    setAutoPrintEnabled(nextVal);
    localStorage.setItem('autoPrintEnabled', String(nextVal));

    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoPrintEnabled: nextVal })
      });
      toast.success(`Automatic printing is now ${nextVal ? 'ENABLED' : 'DISABLED'}.`);
    } catch (err) {
      toast.error("Failed to sync auto-print toggle with cloud.");
    }
  };

  const handleToggleCapability = async (id: string, capability: 'supportsColor' | 'supportsA3' | 'isHighSpeed') => {
    const updated = printers.map(p => {
      if (p.id === id) {
        return {
          ...p,
          [capability]: !p[capability]
        };
      }
      return p;
    });
    setPrinters(updated);
    localStorage.setItem('customPrinters', JSON.stringify(updated));

    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printers: updated })
      });
      toast.success("Printer capabilities updated successfully!");
    } catch (err) {
      toast.error("Failed to sync capabilities with cloud.");
    }
  };

  const handleAddPrinter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newModel) {
      toast.error("Please fill in the printer name and driver model.");
      return;
    }
    const newP: PrinterConfig = {
      id: `custom-${Math.random()}`,
      name: newName,
      brand: "Manual Connected",
      model: newModel,
      status: 'idle' as const,
      connectionType: newConnectionType,
      ipAddress: newConnectionType !== 'USB' ? newPortOrIp : undefined,
      inkLevels: { black: 100 },
      paperLevels: { A4: 500 },
      isDefault: printers.length === 0,
      supportsColor: newSupportsColor,
      supportsA3: newSupportsA3,
      isHighSpeed: newIsHighSpeed
    };
    
    const updated = [...printers, newP];
    setPrinters(updated);
    localStorage.setItem('customPrinters', JSON.stringify(updated));

    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printers: updated })
      });
      toast.success(`Successfully linked ${newName} via ${newConnectionType}!`);
    } catch (err) {
      toast.error("Saved locally, but failed to sync printer with Vercel config.");
    }
    
    setShowAddModal(false);
    setNewName('');
    setNewModel('');
    setNewSupportsColor(false);
    setNewSupportsA3(false);
    setNewIsHighSpeed(false);
  };

  const handleTestPrint = async (id: string) => {
    setLoadingTest(id);
    toast.loading("Sending test page spool command...", { id: "test-print" });

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: "System Diagnostics",
          customerPhone: "9100000000",
          fileName: "TEST_PAGE_PRINT.pdf",
          fileSize: 0.1,
          pages: 1,
          copies: 1,
          paperSize: "A4",
          colorMode: "bw",
          duplex: "simplex",
          orientation: "portrait",
          source: "web",
          id: `TEST-${Math.floor(1000 + Math.random() * 9000)}`
        })
      });

      const data = await res.json();
      if (data.success) {
        // Mark test order as paid so agent prints it
        await fetch('/api/orders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: data.order.id, status: 'paid' })
        });
        
        setTimeout(() => {
          setLoadingTest(null);
          toast.success("Test page successfully spooled to Print Agent!", { id: "test-print" });
        }, 1500);
      } else {
        toast.error("Failed to spool test page.", { id: "test-print" });
        setLoadingTest(null);
      }
    } catch (e) {
      toast.error("Communication error with server.", { id: "test-print" });
      setLoadingTest(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    const updated = printers.map(p => ({
      ...p,
      isDefault: p.id === id
    }));
    setPrinters(updated);

    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printers: updated })
      });
      toast.success("Default printer configured on cloud.");
    } catch (err) {
      toast.error("Failed to sync default printer configuration.");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Printer Configuration</h1>
          <p className="text-slate-500 text-xs mt-0.5">Connect local desktop printers, monitor statuses, or dispatch tests</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-primary text-xs py-2 px-4"
        >
          <Plus size={14} /> Add Printer
        </button>
      </div>

      {/* Local Agent Connection Status Banner */}
      {agentConnected ? (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs flex items-center gap-3 shadow-sm">
          <div className="pulse-dot pulse-dot-green flex-shrink-0" />
          <div className="flex-1">
            <span className="font-bold block">Connected to Local Print Agent</span>
            <span className="text-slate-500 text-[10px] block mt-0.5">Linked with PC: <strong>{pcName || "Local Host"}</strong> · WebSocket Spool active. Real-time printer status details loading.</span>
          </div>
        </div>
      ) : (
        <div className="bg-slate-100 border border-slate-200 text-slate-700 p-4 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex gap-2.5 items-start">
            <Monitor size={18} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-bold block text-slate-850">Local Print Agent Offline</span>
              <span className="text-slate-500 text-[10px] block mt-0.5">To connect your physical printers, run the Java desktop agent on your shop PC.</span>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => toast.error("Attempting to reconnect... Make sure the PrintAgent application is running.")}
            className="btn-secondary text-[10px] py-1.5 px-3 rounded-lg flex-shrink-0 font-bold self-end sm:self-center bg-white shadow-sm"
          >
            Reconnect
          </button>
        </div>
      )}

      {/* Auto print toggle notice bar */}
      <div className={`card-premium p-5 flex items-center justify-between gap-4 border ${
        autoPrintEnabled ? 'border-emerald-200 bg-emerald-50/15' : 'border-slate-200 bg-slate-50'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            autoPrintEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
          }`}>
            <Power size={18} />
          </div>
          <div>
            <h3 className={`font-bold text-sm ${autoPrintEnabled ? 'text-emerald-800' : 'text-slate-800'}`}>
              Automatic Printing is {autoPrintEnabled ? 'ON' : 'OFF'}
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">
              {autoPrintEnabled 
                ? 'Paid orders spool automatically to the default printer without user interaction.' 
                : 'Auto-spooling disabled. You must manually click Print inside Order management.'}
            </p>
          </div>
        </div>
        
        {/* Toggle switch */}
        <button 
          onClick={handleToggleAutoPrint}
          className={`w-12 h-6 rounded-full p-1 transition-all ${
            autoPrintEnabled ? 'bg-emerald-600 flex justify-end' : 'bg-slate-300 flex justify-start'
          }`}
        >
          <span className="w-4 h-4 bg-white rounded-full block shadow"></span>
        </button>
      </div>

      {/* Printers grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {printers.map(p => (
          <div key={p.id} className={`card-premium bg-white p-6 relative ${
            p.isDefault ? 'border-brand-300 ring-2 ring-brand-600/5' : ''
          }`}>
            {p.isDefault && (
              <span className="absolute top-4 right-4 bg-brand-50 text-brand-600 border border-brand-200 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full">
                Default Printer
              </span>
            )}

            <div className="flex gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                <PrinterIcon size={22} />
              </div>
              <div>
                <h3 className="text-slate-800 font-extrabold text-sm">{p.name}</h3>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">{p.brand} {p.model}</span>
                <span className="text-[10px] text-slate-500 font-mono mt-0.5 block flex items-center gap-1">
                  {p.connectionType === 'USB' ? <Usb size={11} /> : <Wifi size={11} />}
                  Connection Type: {p.connectionType} {p.ipAddress ? `(${p.ipAddress})` : ''}
                </span>
              </div>
            </div>

            {/* Consumables */}
            <div className="space-y-3.5 border-t border-slate-100 pt-4 mb-4">
              <h4 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Printer Consumables</h4>
              
              <div className="space-y-1 text-xs">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-600">Black Toner Level</span>
                  <span className="text-slate-800">{p.inkLevels?.black || 100}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full">
                  <div className="bg-slate-800 h-2 rounded-full" style={{ width: `${p.inkLevels?.black || 100}%` }}></div>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-600">A4 Cassette level</span>
                  <span className="text-slate-800">{p.paperLevels?.A4 || 500} / 500 sheets</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full">
                  <div className="bg-brand-600 h-2 rounded-full" style={{ width: `${((p.paperLevels?.A4 || 500) / 500) * 100}%` }}></div>
                </div>
              </div>
            </div>

            {/* Routing Capabilities */}
            <div className="space-y-2 border-t border-slate-100 pt-4 mb-4">
              <h4 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Capabilities & Auto Routing</h4>
              
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-650 font-medium">Supports Color Printing</span>
                <button 
                  onClick={() => handleToggleCapability(p.id, 'supportsColor')}
                  className={`w-9 h-5 rounded-full p-0.5 transition-all ${
                    p.supportsColor ? 'bg-brand-600 flex justify-end' : 'bg-slate-200 flex justify-start'
                  }`}
                >
                  <span className="w-4 h-4 bg-white rounded-full block shadow"></span>
                </button>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-650 font-medium">Supports A3 Printing</span>
                <button 
                  onClick={() => handleToggleCapability(p.id, 'supportsA3')}
                  className={`w-9 h-5 rounded-full p-0.5 transition-all ${
                    p.supportsA3 ? 'bg-brand-600 flex justify-end' : 'bg-slate-200 flex justify-start'
                  }`}
                >
                  <span className="w-4 h-4 bg-white rounded-full block shadow"></span>
                </button>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-655 font-medium">High Speed Printer</span>
                <button 
                  onClick={() => handleToggleCapability(p.id, 'isHighSpeed')}
                  className={`w-9 h-5 rounded-full p-0.5 transition-all ${
                    p.isHighSpeed ? 'bg-brand-600 flex justify-end' : 'bg-slate-200 flex justify-start'
                  }`}
                >
                  <span className="w-4 h-4 bg-white rounded-full block shadow"></span>
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 justify-end">
              {!p.isDefault && (
                <button 
                  onClick={() => handleSetDefault(p.id)}
                  className="bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 text-xs font-bold py-1.5 px-3 rounded-lg"
                >
                  Set Default
                </button>
              )}
              <button 
                onClick={() => handleTestPrint(p.id)}
                disabled={loadingTest === p.id}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
              >
                <TestTube size={13} />
                Test Print Page
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-xl space-y-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Pair Local Printer</h3>
              <p className="text-slate-500 text-[10px]">Configure connection options to route printed pages dynamically.</p>
            </div>
            
            <form onSubmit={handleAddPrinter} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-500 font-semibold mb-1 block">Printer Alias / Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Counter HP LaserJet"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="input-field py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 font-semibold mb-1 block">Connection Type</label>
                  <select 
                    value={newConnectionType} 
                    onChange={e => setNewConnectionType(e.target.value as any)}
                    className="input-field py-2"
                  >
                    <option value="USB">USB Cable</option>
                    <option value="LAN">LAN Ethernet</option>
                    <option value="WiFi">WiFi Wireless</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-500 font-semibold mb-1 block">Port / IP Address</label>
                  <input 
                    type="text" 
                    required
                    placeholder={newConnectionType === 'USB' ? 'e.g. USB001' : 'e.g. 192.168.1.100'}
                    value={newPortOrIp}
                    onChange={e => setNewPortOrIp(e.target.value)}
                    className="input-field py-2"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 font-semibold mb-1 block">Driver / Model</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. HP LaserJet Class Driver"
                  value={newModel}
                  onChange={e => setNewModel(e.target.value)}
                  className="input-field py-2"
                />
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3">
                <label className="text-slate-500 font-bold block mb-1">Default Capabilities</label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={newSupportsColor}
                    onChange={e => setNewSupportsColor(e.target.checked)}
                    className="rounded border-slate-350 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-slate-600">Supports Color Printing</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={newSupportsA3}
                    onChange={e => setNewSupportsA3(e.target.checked)}
                    className="rounded border-slate-350 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-slate-600">Supports A3 Paper size</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={newIsHighSpeed}
                    onChange={e => setNewIsHighSpeed(e.target.checked)}
                    className="rounded border-slate-350 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-slate-600">High-Speed printing capability</span>
                </label>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary text-[11px] py-2 px-4 bg-white"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn-primary text-[11px] py-2 px-4"
                >
                  Save Connection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
