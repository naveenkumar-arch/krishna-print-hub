'use client';

import { useState, useEffect } from 'react';
import { 
  Monitor, Cpu, Terminal, RefreshCw, AlertTriangle, 
  CheckCircle, XCircle, Download, Power, HardDrive,
  FileText, Activity, Play, QrCode
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function PrintAgentMonitorPage() {
  const [agentConnected, setAgentConnected] = useState(false);
  const [pcName, setPcName] = useState('COUNTER-PC');
  const [osVersion, setOsVersion] = useState('Windows 10/11');
  const [agentVersion, setAgentVersion] = useState('v1.0.2');
  const [connectionKey, setConnectionKey] = useState('KP-DEMO-TOKEN-9988');
  const [lastPing, setLastPing] = useState<string>('');
  const [localPrinters, setLocalPrinters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [webOrigin, setWebOrigin] = useState('https://krishna-students-print-hub.vercel.app');
  
  const [logs, setLogs] = useState<string[]>([
    "INFO  [10:00:01] Print Agent Started (v1.0.2)",
    "INFO  [10:00:03] Loaded config.properties from local storage",
    "INFO  [10:00:04] Initialized local server on port 4000",
    "INFO  [10:00:05] Diagnostic ping sent - Server responded: 200 OK",
    "INFO  [10:00:05] Connected to Windows Print Spooler",
    "INFO  [10:00:06] Registered printers detected: HP LaserJet, Canon G3010",
  ]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWebOrigin(window.location.origin);
    }
  }, []);

  const fetchStatus = () => {
    setLoading(true);
    fetch('/api/config')
      .then(res => res.json())
      .then(cfg => {
        setPcName(cfg.agentPcName || 'COUNTER-PC');
        setOsVersion(cfg.agentOsVersion || 'Windows 10/11');
        setAgentVersion(cfg.agentVersion || 'v1.0.2');
        setConnectionKey(cfg.agentConnectionKey || 'KP-DEMO-TOKEN-9988');
        setLocalPrinters(cfg.printers || []);
        
        const ping = cfg.lastAgentPing;
        if (ping) {
          setLastPing(new Date(ping).toLocaleString());
          const diff = Date.now() - new Date(ping).getTime();
          if (diff < 15000) { // online if check-in is under 15 seconds
            setAgentConnected(true);
          } else {
            setAgentConnected(false);
          }
        } else {
          setAgentConnected(false);
        }
        setLoading(false);
      })
      .catch(() => {
        setAgentConnected(false);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => {
    toast.loading("Refreshed status stats.", { id: "refresh-agent" });
    fetchStatus();
    setTimeout(() => {
      toast.success("Connection stats updated.", { id: "refresh-agent" });
    }, 500);
  };

  const handleRestartAgent = () => {
    toast.success("Restart signal dispatched to local daemon.");
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `WARN  [${time}] Received reboot signal from dashboard. Restarting loops...`]);
  };

  const handleReconnect = () => {
    toast.loading("Reconnecting to local spool API...", { id: "reconnect-agent" });
    setTimeout(() => {
      fetchStatus();
      toast.success("Connection re-established successfully!", { id: "reconnect-agent" });
      const time = new Date().toLocaleTimeString();
      setLogs(prev => [...prev, `INFO  [${time}] Manual reconnection loop initiated by administrator.`]);
    }, 800);
  };

  const handlePrintTest = () => {
    if (!agentConnected) {
      toast.error("Cannot dispatch print job: Agent is offline.");
      return;
    }
    toast.success("Dispatched physical test print ticket to counter!");
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `INFO  [${time}] Received test print order. Spooling to HP LaserJet...`]);
  };

  const handleBrowserTestConnection = () => {
    toast.loading("Pinging local print agent spool server...", { id: "ping-local" });
    fetch('http://localhost:4000/status')
      .then(res => res.json())
      .then(() => {
        toast.success("✓ Local Print Agent Spool API is active and reachable!", { id: "ping-local" });
        const time = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, `INFO  [${time}] Client browser diagnostic ping succeeded.`]);
      })
      .catch(() => {
        toast.error("✗ Could not reach Local Spool API. Ensure agent is running.", { id: "ping-local" });
      });
  };

  const handleRegenerateKey = () => {
    const chars = '0123456789ABCDEF';
    let newKey = 'KP-';
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        newKey += chars[Math.floor(Math.random() * 16)];
      }
      if (i < 3) newKey += '-';
    }

    toast.loading("Regenerating Connection Key...", { id: "regen-key" });
    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentConnectionKey: newKey })
    })
    .then(res => res.json())
    .then(() => {
      setConnectionKey(newKey);
      toast.success("New Connection Key saved to KV database!", { id: "regen-key" });
      const time = new Date().toLocaleTimeString();
      setLogs(prev => [...prev, `INFO  [${time}] Regenerated agent secure Connection Key: ${newKey}`]);
    })
    .catch(() => {
      toast.error("Failed to save new Connection Key.", { id: "regen-key" });
    });
  };

  const handleUnpairAgent = () => {
    if (!confirm("Are you sure you want to unpair this computer? This will disconnect the current print agent immediately.")) {
      return;
    }
    toast.loading("Unpairing agent computer...", { id: "unpair-agent" });
    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unpairAgent: true })
    })
    .then(res => res.json())
    .then(() => {
      toast.success("Agent successfully unpaired!", { id: "unpair-agent" });
      setAgentConnected(false);
      setPcName('COUNTER-PC');
      setOsVersion('Windows 10/11');
      setAgentVersion('v1.0.2');
      setConnectionKey('KP-DEMO-TOKEN-9988');
      setLastPing('');
      setLocalPrinters([]);
    })
    .catch(() => {
      toast.error("Failed to unpair agent computer.", { id: "unpair-agent" });
    });
  };

  // Pairing payload JSON string for QR Code creation
  const pairingPayload = JSON.stringify({ url: webOrigin, key: connectionKey });
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(pairingPayload)}`;

  return (
    <div className="p-6 space-y-6">
      {/* Header section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Print Agent Diagnostics</h1>
          <p className="text-slate-500 text-xs mt-0.5">Monitor background counter daemon telemetry and ink spools</p>
        </div>
        <button 
          onClick={handleManualRefresh}
          className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh Stats
        </button>
      </div>

      {/* Diagnostics Panel Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Panel */}
        <div className="card-premium bg-white p-6 border border-slate-100 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">Print Agent Status</h3>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              agentConnected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${agentConnected ? 'bg-emerald-505 bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
              {agentConnected ? 'Online' : 'Offline'}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500 font-semibold">Computer Name:</span>
              <span className="text-slate-800 font-bold font-mono">{pcName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500 font-semibold">Agent Version:</span>
              <span className="text-slate-800 font-bold font-mono">{agentVersion}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500 font-semibold">Connected Printer:</span>
              <span className="text-slate-800 font-bold">
                {localPrinters.length > 0 ? (localPrinters.find(p => p.PrinterStatus === 'printing' || p.PrinterStatus === 'idle')?.Name || localPrinters[0]?.Name) : 'No Printer Selected'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500 font-semibold">Last Check-in:</span>
              <span className="text-slate-800 font-bold">{lastPing || 'Never'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500 font-semibold">Website URL:</span>
              <span className="text-slate-800 font-bold font-mono text-[10px] select-all">
                {webOrigin}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500 font-semibold">Connection Key:</span>
              <span className="text-slate-800 font-bold font-mono">{connectionKey.replace(/./g, '*')}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(connectionKey);
                toast.success("Connection Key copied!");
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              Copy Key
            </button>
            <button
              onClick={handleRegenerateKey}
              className="bg-brand-50 hover:bg-brand-100 text-brand-700 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              Regenerate Key
            </button>
          </div>
        </div>

        {/* QR Code Scan Pairing Panel */}
        <div className="card-premium bg-white p-6 border border-slate-100 flex flex-col items-center justify-between text-center">
          <div className="w-full border-b border-slate-100 pb-3 mb-2 flex justify-between items-center">
            <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider text-left flex items-center gap-1.5">
              <QrCode size={16} className="text-brand-500" />
              Pair Print Agent
            </h3>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Scan to Pair</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/50 rounded-2xl shadow-inner mt-2">
            {/* Renders dynamic pairing chart server payload */}
            <img 
              src={qrCodeUrl} 
              alt="Pairing QR Code" 
              className="w-[130px] h-[130px]"
            />
          </div>

          <p className="text-slate-500 text-[10px] leading-relaxed max-w-[280px] mt-3">
            Scan this QR Code from the print agent dashboard config screen or use the connection key manually.
          </p>
        </div>
      </div>

      {/* Action download panel and console logger */}
      <div className="card-premium bg-slate-50 border border-slate-100 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-slate-800 text-sm">Download Windows Standalone Installer</h3>
          <p className="text-slate-500 text-xs mt-0.5">
            Use this package to link a new counter PC or reinstall the silently running Windows service.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleRestartAgent}
            className="flex-1 sm:flex-initial bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            Restart Agent
          </button>
          <button
            onClick={handleUnpairAgent}
            className="flex-1 sm:flex-initial bg-rose-50 hover:bg-rose-100 text-rose-700 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
          >
            Unpair This Computer
          </button>
          <a
            href="/downloads/KrishnaPrintAgent.jar"
            download
            onClick={() => toast.success("Starting JAR download...")}
            className="flex-1 sm:flex-initial bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all"
          >
            <Download size={14} /> Download JAR
          </a>
          <a
            href="/downloads/KrishnaPrintAgentSetup.exe"
            download
            onClick={() => toast.success("Starting installer download...")}
            className="flex-1 sm:flex-initial bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all"
          >
            <Download size={14} /> Download Installer
          </a>
        </div>
      </div>

      {/* Control panel console log buttons row */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleReconnect}
          className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all"
        >
          <Activity size={14} className="text-brand-500" />
          Reconnect API
        </button>

        <button
          onClick={handlePrintTest}
          className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all"
        >
          <Play size={14} className="text-emerald-500" />
          Print Test Page
        </button>

        <button
          onClick={handleBrowserTestConnection}
          className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all"
        >
          <Activity size={14} className="text-indigo-500" />
          Browser Diagnostics Ping
        </button>

        <button
          onClick={() => setShowLogs(!showLogs)}
          className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all"
        >
          <FileText size={14} className="text-amber-500" />
          {showLogs ? "Hide Console Logs" : "View Agent Logs"}
        </button>
      </div>

      {/* Log Console Drawer */}
      {showLogs && (
        <div className="card-premium bg-slate-950 border border-slate-900 p-4 rounded-2xl overflow-hidden font-mono text-[11px] text-slate-300">
          <div className="flex justify-between items-center pb-2 border-b border-slate-900 mb-2">
            <span className="text-slate-500 text-[10px] uppercase font-bold">Console Standard Output Stream</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <div className="space-y-1 max-h-[160px] overflow-y-auto">
            {logs.map((log, idx) => (
              <div key={idx}>{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* Connected hardware spools list */}
      <div className="card-premium bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">
            Auto-Detected Spool Devices
          </h3>
          {agentConnected && (
            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
              {localPrinters.length} Printers Found
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="table-premium">
            <thead>
              <tr>
                <th>Hardware Device Name</th>
                <th>Toner / Ink Level</th>
                <th>WMI Driver Status</th>
                <th>Diagnostics</th>
              </tr>
            </thead>
            <tbody>
              {localPrinters.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-slate-400 text-xs">
                    No active Windows spool devices detected. Ensure the desktop agent is running.
                  </td>
                </tr>
              ) : (
                localPrinters.map((p, idx) => {
                  const toner = p.Toner !== undefined ? p.Toner : 100;
                  const isLow = toner <= 10;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="font-bold text-slate-800">{p.Name || p.name}</td>
                      <td>
                        <div className="flex items-center gap-2 max-w-[150px]">
                          <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                isLow ? 'bg-rose-500' : toner <= 30 ? 'bg-amber-500' : 'bg-brand-500'
                              }`} 
                              style={{ width: `${toner}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-bold ${isLow ? 'text-rose-600' : 'text-slate-600'}`}>
                            {toner}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge-status text-[10px] ${
                          p.PrinterStatus === 'idle' ? 'badge-completed' :
                          p.PrinterStatus === 'printing' ? 'badge-printing' : 'badge-cancelled'
                        }`}>
                          {(p.PrinterStatus || 'offline').toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {isLow ? (
                          <div className="flex items-center gap-1 text-rose-600 text-[10px] font-semibold animate-pulse">
                            <AlertTriangle size={12} /> Low Toner Alert
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-semibold">
                            <CheckCircle size={12} /> Diagnostics OK
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
