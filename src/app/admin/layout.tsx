'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, ShoppingBag, Users, Printer, 
  DollarSign, MessageSquare, CreditCard, 
  BarChart3, Bell, LogOut, Menu, X, 
  Zap, ClipboardList, Shield, Store, Tag, Monitor
} from 'lucide-react';
import toast from 'react-hot-toast';

const navItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Overview' },
  { href: '/admin/orders', icon: ShoppingBag, label: 'Manage Orders' },
  { href: '/admin/queue', icon: Zap, label: 'Print Queue' },
  { href: '/admin/customers', icon: Users, label: 'Customers' },
  { href: '/admin/printers', icon: Printer, label: 'Printers' },
  { href: '/admin/agent', icon: Monitor, label: 'Print Agent' },
  { href: '/admin/pricing', icon: DollarSign, label: 'Pricing Config' },
  { href: '/admin/rules', icon: ClipboardList, label: 'Print Rules' },
  { href: '/admin/coupons', icon: Tag, label: 'Discount Coupons' },
  { href: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/admin/settings/shop', icon: Store, label: 'Shop Details' },
  { href: '/admin/settings/razorpay', icon: CreditCard, label: 'Razorpay Config' },
  { href: '/admin/settings/whatsapp', icon: MessageSquare, label: 'WhatsApp Config' },
  { href: '/admin/settings/account', icon: Shield, label: 'Account Settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  // Dynamic layout states
  const [shopName, setShopName] = useState('KRISHNA PRINT HUB');
  const [shopEmail, setShopEmail] = useState('srm.krishnaprinthub@gmail.com');
  const [defaultPrinter, setDefaultPrinter] = useState('No printers connected');
  const [autoPrintBadge, setAutoPrintBadge] = useState(true);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [queuedJobsCount, setQueuedJobsCount] = useState(0);

  useEffect(() => {
    const isAuth = localStorage.getItem('isAdminAuth') === 'true';
    if (!isAuth && pathname !== '/admin/login') {
      router.push('/admin/login');
    } else {
      setAuthenticated(true);
    }
  }, [pathname, router]);

  useEffect(() => {
    if (!authenticated) return;

    const checkUpdates = () => {
      // 1. Fetch Shop details and Printers from backend REST API
      fetch('/api/config')
        .then(res => res.json())
        .then(data => {
          if (data.shopSettings) {
            setShopName(data.shopSettings.name.toUpperCase());
            setShopEmail(data.shopSettings.email);
            localStorage.setItem('shopSettings', JSON.stringify(data.shopSettings));
          }
          if (data.razorpayConfig) {
            localStorage.setItem('razorpayConfig', JSON.stringify(data.razorpayConfig));
          }
          if (data.printRules) {
            localStorage.setItem('printRules', JSON.stringify(data.printRules));
          }
          if (data.hasOwnProperty('autoPrintEnabled')) {
            setAutoPrintBadge(Boolean(data.autoPrintEnabled));
          }
          if (data.printers && data.printers.length > 0) {
            const def = data.printers.find((p: any) => p.isDefault) || data.printers[0];
            setDefaultPrinter(def.name);
          }
        })
        .catch(() => {
          // Fallback to local storage if API is offline
          const savedShop = localStorage.getItem('shopSettings');
          if (savedShop) {
            try {
              const parsed = JSON.parse(savedShop);
              setShopName(parsed.name.toUpperCase());
              setShopEmail(parsed.email);
            } catch (e) {}
          }
        });

      // 3. Spool metrics (Pending approval, Printing items count)
      fetch('/api/orders')
        .then(res => res.json())
        .then(data => {
          if (data && data.orders) {
            const pending = data.orders.filter((o: any) => o.status === 'waiting_approval' || o.status === 'waiting_cash').length;
            const queued = data.orders.filter((o: any) => o.status === 'queued' || o.status === 'printing').length;
            setPendingOrdersCount(pending);
            setQueuedJobsCount(queued);
          }
        })
        .catch(() => {});
    };

    checkUpdates();
    const interval = setInterval(checkUpdates, 5000);
    return () => clearInterval(interval);
  }, [authenticated]);

  const handleLogout = () => {
    localStorage.removeItem('isAdminAuth');
    router.push('/admin/login');
    toast.success('Successfully logged out.');
  };

  if (!authenticated && pathname !== '/admin/login') {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-semibold text-slate-400">Loading Session...</div>;
  }

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 text-slate-400 border-r border-slate-800 flex-shrink-0">
        {/* Sidebar Header */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <Printer className="text-brand-500" size={20} />
            <span className="font-black text-white text-sm tracking-tight">{shopName}</span>
          </div>
        </div>

        {/* User profile widget */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-violet-500 flex items-center justify-center font-black text-white text-xs">
            {shopName.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <h4 className="font-extrabold text-white text-xs truncate uppercase tracking-wider">{shopName}</h4>
            <p className="text-[10px] text-slate-500 truncate mt-0.5">{shopEmail}</p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link 
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive 
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-900/20' 
                    : 'hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} />
                  <span>{item.label}</span>
                </div>
                {item.label === 'Manage Orders' && pendingOrdersCount > 0 && (
                  <span className="bg-rose-500 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full animate-pulse">
                    {pendingOrdersCount}
                  </span>
                )}
                {item.label === 'Print Queue' && queuedJobsCount > 0 && (
                  <span className="bg-brand-500 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full">
                    {queuedJobsCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/20 flex flex-col gap-2">
          {/* Active status panel */}
          <div className="px-3 py-2 bg-slate-950/60 rounded-xl text-[10px] border border-slate-800/50 flex flex-col gap-1">
            <div className="flex items-center justify-between font-bold">
              <span className="text-slate-500">Auto Print:</span>
              <span className={autoPrintBadge ? "text-emerald-400" : "text-amber-400"}>
                {autoPrintBadge ? "ON" : "OFF"}
              </span>
            </div>
            <div className="flex items-center justify-between font-bold truncate">
              <span className="text-slate-500">Active Printer:</span>
              <span className="text-slate-300 truncate max-w-[110px]" title={defaultPrinter}>{defaultPrinter}</span>
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 transition-all text-left"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Navigation */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header Nav */}
        <header className="lg:hidden h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 flex-shrink-0 z-30">
          <div className="flex items-center gap-2">
            <Printer className="text-brand-500" size={18} />
            <span className="font-black text-white text-xs tracking-tight">{shopName}</span>
          </div>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 -mr-2 text-slate-400 hover:text-white"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        {/* Mobile Sidebar overlay menu */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-20 flex">
            <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <aside className="relative flex flex-col w-64 bg-slate-900 text-slate-400 border-r border-slate-800 h-full p-4 animate-slideIn">
              <div className="flex items-center gap-2.5 h-10 px-2 border-b border-slate-800 mb-4">
                <Printer className="text-brand-500" size={18} />
                <span className="font-black text-white text-xs uppercase tracking-wider">{shopName}</span>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto">
                {navItems.map(item => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                  return (
                    <Link 
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        isActive 
                          ? 'bg-brand-600 text-white' 
                          : 'hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={16} />
                        <span>{item.label}</span>
                      </div>
                      {item.label === 'Manage Orders' && pendingOrdersCount > 0 && (
                        <span className="bg-rose-500 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full">
                          {pendingOrdersCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>

              <div className="pt-4 border-t border-slate-800 mt-4 flex flex-col gap-2">
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/30 transition-all text-left"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Content Pane */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
