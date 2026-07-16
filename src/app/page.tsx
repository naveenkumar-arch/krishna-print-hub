'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Printer, ArrowRight, ShieldCheck, Zap, 
  MapPin, Clock, Phone, CheckCircle, 
  HelpCircle, Star, ShoppingBag, FileText, 
  Info, MessageCircle, AlertTriangle, Send 
} from 'lucide-react';
import { mockShopSettings, mockPricing, mockRules } from '@/lib/mockData';
import toast from 'react-hot-toast';

export default function LandingPage() {
  const router = useRouter();
  
  const [shopSettings, setShopSettings] = useState(mockShopSettings);
  const [pricing, setPricing] = useState(mockPricing);
  const [rules, setRules] = useState(mockRules);

  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);

  useEffect(() => {
    fetch('/api/config', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data.shopSettings) setShopSettings(data.shopSettings);
        if (data.pricingConfig) setPricing(data.pricingConfig);
        if (data.printRules) setRules(data.printRules);
        if (data.coupons) setAvailableCoupons(data.coupons);
      })
      .catch(() => {
        const savedShop = localStorage.getItem('shopSettings');
        if (savedShop) setShopSettings(JSON.parse(savedShop));
        
        const savedPricing = localStorage.getItem('pricingConfig');
        if (savedPricing) setPricing(JSON.parse(savedPricing));

        const savedRules = localStorage.getItem('printRules');
        if (savedRules) setRules(JSON.parse(savedRules));

        const savedCoupons = localStorage.getItem('coupons');
        if (savedCoupons) setAvailableCoupons(JSON.parse(savedCoupons));
      });
  }, []);

  const cleanPhone = (shopSettings.phone || '').replace(/\D/g, '');
  const waLink = `https://wa.me/${cleanPhone}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(waLink)}`;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pagesCount, setPagesCount] = useState<number>(0);
  const [copies, setCopies] = useState<number>(1);
  const [paperSize, setPaperSize] = useState<'A4' | 'A3' | 'Letter' | 'Legal'>('A4');
  const [colorMode, setColorMode] = useState<'bw' | 'color'>('bw');
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cash'>('online');
  const [duplex, setDuplex] = useState<'simplex' | 'duplex'>('simplex');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [uploading, setUploading] = useState<boolean>(false);
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');

  // WhatsApp Chatbot Simulator States
  const [activeWaTab, setActiveWaTab] = useState<'qr' | 'simulator'>('qr');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string; isFile?: boolean; isLink?: boolean }>>([
    { sender: 'bot', text: 'Welcome to Krishna Students Print Hub! 🖨️' },
    { sender: 'bot', text: 'Please upload or send your document file here to calculate pricing.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatStep, setChatStep] = useState<'welcome' | 'choose_type' | 'choose_copies' | 'paying' | 'paid'>('welcome');
  const [simulatedFile, setSimulatedFile] = useState<File | null>(null);
  const [simulatedPages, setSimulatedPages] = useState(0);
  const [simulatedPrintType, setSimulatedPrintType] = useState<'bw' | 'color'>('bw');
  const [simulatedCopies, setSimulatedCopies] = useState(1);
  const [simulatedAmount, setSimulatedAmount] = useState(0);
  const [showWaPayModal, setShowWaPayModal] = useState(false);
  const [waOrderCode, setWaOrderCode] = useState('');

  // WhatsApp Simulator functions
  const appendBotMessage = (text: string, delay = 800) => {
    setTimeout(() => {
      setChatMessages(prev => [...prev, { sender: 'bot', text }]);
    }, delay);
  };

  const handleSendWaMessage = (textVal: string) => {
    if (!textVal.trim()) return;
    setChatMessages(prev => [...prev, { sender: 'user', text: textVal }]);
    setChatInput('');

    // Process Bot Response based on current step
    if (chatStep === 'welcome') {
      appendBotMessage("Welcome to Krishna Students Print Hub! 🖨️ Please send or attach your document file here to calculate pricing.");
    } else if (chatStep === 'choose_type') {
      const type = textVal.trim();
      if (type === '1' || type.toLowerCase().includes('black') || type.toLowerCase().includes('b&w')) {
        setSimulatedPrintType('bw');
        setChatStep('choose_copies');
        appendBotMessage("You selected: 1. Black & White.\n\nHow many copies would you like to print? (Please reply with a number, e.g., 2)");
      } else if (type === '2' || type.toLowerCase().includes('color')) {
        setSimulatedPrintType('color');
        setChatStep('choose_copies');
        appendBotMessage("You selected: 2. Color.\n\nHow many copies would you like to print? (Please reply with a number, e.g., 2)");
      } else {
        appendBotMessage("Invalid print mode selection. Please type:\n1 for Black & White\n2 for Color");
      }
    } else if (chatStep === 'choose_copies') {
      const num = parseInt(textVal.trim());
      if (isNaN(num) || num < 1) {
        appendBotMessage("Please enter a valid positive number for copies.");
      } else {
        setSimulatedCopies(num);
        const pricePerPage = simulatedPrintType === 'color' ? pricing.A4_Color : pricing.A4_BW;
        const total = pricePerPage * simulatedPages * num;
        setSimulatedAmount(total);
        setChatStep('paying');

        appendBotMessage(`Calculating cost...\nPages: ${simulatedPages}\nCopies: ${num}\nTotal Amount: ₹${total.toFixed(2)}\n\nHere is your secure Razorpay checkout link:`);
        setTimeout(() => {
          setChatMessages(prev => [...prev, { sender: 'bot', text: `🔗 Complete Payment of ₹${total.toFixed(2)}`, isLink: true }]);
        }, 1000);
      }
    } else {
      appendBotMessage("Your print job is being processed. Feel free to attach a new document.");
    }
  };

  const handleWaFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSimulatedFile(file);
      const estPages = file.name.toLowerCase().endsWith('.pdf') ? 5 : 1;
      setSimulatedPages(estPages);
      setChatMessages(prev => [...prev, { sender: 'user', text: `📎 Attached: ${file.name} (${estPages} pages)`, isFile: true }]);
      setChatStep('choose_type');

      appendBotMessage(`Received document: ${file.name}\n\nPlease select Print Color Mode:\nType 1 for Black & White\nType 2 for Color`);
    }
  };

  const handleWaCheckoutPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone) {
      toast.error("Name and Phone are required.");
      return;
    }
    setUploading(true);
    const code = "KP-" + Math.floor(1000 + Math.random() * 9000);
    setWaOrderCode(code);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: code,
          customerName,
          customerPhone,
          fileName: simulatedFile ? simulatedFile.name : 'wa_document.pdf',
          fileSize: simulatedFile ? parseFloat((simulatedFile.size / (1024 * 1024)).toFixed(2)) : 0.8,
          pages: simulatedPages,
          copies: simulatedCopies,
          paperSize: 'A4',
          colorMode: simulatedPrintType,
          duplex: 'simplex',
          orientation: 'portrait',
          source: 'whatsapp',
          paymentMethod: 'online'
        })
      });
      const data = await response.json();
      if (!data.success) {
        toast.error("Failed to register order.");
        setUploading(false);
        return;
      }

      // Simulate payment webhook approval
      setTimeout(async () => {
        await fetch('/api/orders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: code, status: 'paid' })
        });
        setUploading(false);
        setShowWaPayModal(false);
        setChatStep('paid');
        toast.success("WhatsApp simulation payment succeeded!");
        appendBotMessage(`✓ Payment of ₹${simulatedAmount.toFixed(2)} received successfully!\n\nOrder Code: ${code}\nStatus: Queued for printing.\n\nYour receipt has been sent.`);
      }, 1500);

    } catch (err) {
      toast.error("Connection failed.");
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowConfig(true);
      setAppliedCoupon(null);
      setCouponInput('');

      // Auto rotation WMI DPI AI analyzer simulator
      const isImage = file.type.startsWith('image/');
      if (isImage) {
        setPagesCount(1);
        toast.success(`Image selected: ${file.name} (1 page detected)`);
        return;
      }

      const isPdf = file.name.toLowerCase().endsWith('.pdf');
      if (isPdf) {
        toast.loading("Analyzing PDF pages...", { id: 'pdf-scan' });
        const reader = new FileReader();
        reader.onload = function(evt) {
          try {
            const text = new TextDecoder('utf-8').decode(new Uint8Array(evt.target?.result as ArrayBuffer));
            const countMatch = text.match(/\/Count\s+(\d+)/);
            if (countMatch && countMatch[1]) {
              const pCount = parseInt(countMatch[1]);
              setPagesCount(pCount);
              toast.success(`PDF loaded: ${file.name} (${pCount} page(s) counted)`, { id: 'pdf-scan' });
              return;
            }
            
            const matches = text.match(/\/Type\s*\/Page\b/g);
            if (matches) {
              setPagesCount(matches.length);
              toast.success(`PDF loaded: ${file.name} (${matches.length} page(s) counted)`, { id: 'pdf-scan' });
              return;
            }
            
            setPagesCount(1);
            toast.success(`PDF loaded: ${file.name} (1 page counted)`, { id: 'pdf-scan' });
          } catch(err) {
            setPagesCount(3);
            toast.error("Error scanning PDF catalog. Defaulted to estimate.", { id: 'pdf-scan' });
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        setPagesCount(3);
        toast.success(`Document selected: ${file.name} (3 pages estimated)`);
      }
    }
  };

  const handleApplyCoupon = () => {
    if (!couponInput.trim()) return;
    const match = availableCoupons.find(c => c.code.toUpperCase() === couponInput.trim().toUpperCase() && c.active);
    if (match) {
      setAppliedCoupon(match);
      toast.success(`Coupon code ${match.code} applied successfully!`);
    } else {
      setAppliedCoupon(null);
      toast.error("Invalid or inactive coupon code.");
    }
  };

  const calculatePrice = () => {
    let perPagePrice = 2.00;
    if (paperSize === 'A4') {
      perPagePrice = colorMode === 'color' ? pricing.A4_Color : pricing.A4_BW;
    } else if (paperSize === 'A3') {
      perPagePrice = colorMode === 'color' ? pricing.A3_Color : pricing.A3_BW;
    } else if (paperSize === 'Letter') {
      perPagePrice = pricing.Letter_BW;
    } else {
      perPagePrice = pricing.Legal_BW;
    }

    let total = perPagePrice * pagesCount * copies;
    if (appliedCoupon) {
      if (appliedCoupon.type === 'percentage') {
        total = total - (total * appliedCoupon.value / 100);
      } else {
        total = Math.max(0, total - appliedCoupon.value);
      }
    }
    return total;
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone) {
      toast.error("Please fill in your name and phone number.");
      return;
    }

    if (copies > rules.maxCopies) {
      toast.error(`Maximum allowed copies per document is ${rules.maxCopies}.`);
      return;
    }
    if (pagesCount > rules.maxPages) {
      toast.error(`Maximum allowed pages per document is ${rules.maxPages}.`);
      return;
    }
    if (selectedFile) {
      const sizeMB = selectedFile.size / (1024 * 1024);
      if (sizeMB > rules.maxUploadSizeMB) {
        toast.error(`File size exceeds shop limit of ${rules.maxUploadSizeMB} MB.`);
        return;
      }
    }

    setUploading(true);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          fileName: selectedFile ? selectedFile.name : 'document.pdf',
          fileSize: selectedFile ? parseFloat((selectedFile.size / (1024 * 1024)).toFixed(2)) : 1.2,
          pages: pagesCount,
          copies: copies,
          paperSize: paperSize,
          colorMode: colorMode,
          duplex: duplex,
          orientation: orientation,
          source: 'web',
          paymentMethod: paymentMethod,
          couponCode: appliedCoupon ? appliedCoupon.code : undefined
        })
      });

      const data = await response.json();
      if (!data.success) {
        toast.error(data.error || "Failed to create order on server.");
        setUploading(false);
        return;
      }

      if (paymentMethod === 'cash') {
        setTimeout(() => {
          setUploading(false);
          setShowConfig(false);
          toast.success("Order received! Please pay cash at the counter to start printing.");
          router.push(`/track?id=${data.order.id}`);
        }, 1200);
      } else {
        // Sandbox mock payment simulation
        setTimeout(() => {
          setUploading(false);
          setShowConfig(false);
          toast.success("Sandbox simulation checkout successful!");
          
          const nextStatus = data.order.pages > rules.autoApprovalPageLimit ? 'waiting_approval' : 'paid';
          fetch('/api/orders', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: data.order.id, status: nextStatus })
          }).catch(() => {});

          router.push(`/track?id=${data.order.id}&paid=true`);
        }, 1500);
      }
    } catch (err: any) {
      console.error("Checkout process failed:", err);
      toast.error("Checkout transaction failed.");
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* HEADER NAVIGATION */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center text-white">
              <Printer size={18} />
            </div>
            <span className="font-extrabold text-lg text-slate-900 tracking-tight uppercase">
              {shopSettings.name}
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
            <Link href="/" className="text-brand-600 hover:text-brand-700">Home</Link>
            <Link href="/track" className="hover:text-brand-600">Track Order</Link>
            <Link href="/how-it-works" className="hover:text-brand-600">How It Works</Link>
            <Link href="/pricing" className="hover:text-brand-600">Pricing</Link>
            <Link href="/contact" className="hover:text-brand-600">Contact</Link>
          </nav>

          <div>
            <Link href="/track">
              <button className="btn-secondary text-xs py-2 px-4 flex items-center gap-1.5 shadow-sm">
                <ShoppingBag size={14} className="text-brand-600" />
                My Orders
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO HEADER */}
      <section className="bg-white pt-8 pb-4">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold text-brand-600 tracking-tight">
            {shopSettings.name.toUpperCase()}
          </h1>
          <div className="flex items-center justify-center gap-1.5 text-slate-500 text-sm mt-2">
            <MapPin size={14} className="text-red-500" />
            <span>{shopSettings.address}</span>
          </div>
          <p className="text-slate-600 text-sm mt-3 max-w-xl mx-auto">
            {shopSettings.tagline}
          </p>
        </div>
      </section>

      {/* TWO-COLUMN SPLIT */}
      <section className="max-w-5xl mx-auto px-4 py-6 w-full flex-1">
        <div className="grid md:grid-cols-[1fr_auto_1fr] gap-6 items-stretch">
          {/* Left Panel: Web Upload */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-brand-600 text-white font-bold text-xs flex items-center justify-center">1</span>
                <h2 className="font-bold text-slate-900 text-base">UPLOAD & PAY ON WEBSITE</h2>
              </div>
              <p className="text-slate-500 text-xs mt-1">Upload your document, choose options and pay online.</p>
            </div>

            <div className="flex-1 border-2 border-dashed border-brand-300 bg-brand-50/50 rounded-xl p-8 flex flex-col items-center justify-center text-center relative hover:border-brand-500 hover:bg-brand-50/80 transition-all cursor-pointer">
              <input 
                type="file" 
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg"
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center mb-4 text-brand-600">
                <FileText size={32} />
              </div>
              <div className="btn-primary text-xs py-2 px-5 mb-2 font-bold shadow-md">
                Upload Document
              </div>
              <p className="text-slate-400 text-[10px]">PDF, Word, PPT, Excel, Images (Max 100MB)</p>
            </div>

            <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>Secure Payment</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Zap size={14} className="text-amber-500" />
                <span>Fast & Easy</span>
              </div>
            </div>
          </div>

          {/* Central OR Divider */}
          <div className="flex md:flex-col items-center justify-center gap-4 py-2 md:py-0">
            <div className="h-px w-full md:w-px md:h-12 bg-slate-200 flex-1"></div>
            <span className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold text-xs">OR</span>
            <div className="h-px w-full md:w-px md:h-12 bg-slate-200 flex-1"></div>
          </div>

          {/* Right Panel: WhatsApp Dual Mode */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[500px]">
            <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-xs font-bold text-slate-500">
              <button 
                onClick={() => setActiveWaTab('qr')}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                  activeWaTab === 'qr' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-800'
                }`}
              >
                📲 Real WhatsApp QR
              </button>
              <button 
                onClick={() => setActiveWaTab('simulator')}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                  activeWaTab === 'simulator' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-800'
                }`}
              >
                💬 Try Chat Simulator
              </button>
            </div>

            {activeWaTab === 'qr' ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                <div className="p-3 bg-slate-50 border border-slate-200/50 rounded-2xl shadow-inner">
                  <img src={qrCodeUrl} alt="WhatsApp QR Code" className="w-[140px] h-[140px]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                    Scan WhatsApp QR Code
                  </h3>
                  <p className="text-slate-500 text-[10px] leading-relaxed max-w-[220px] mx-auto mt-1">
                    Scan with your mobile phone to connect instantly to the shop chatbot order manager.
                  </p>
                </div>
                <a 
                  href={waLink} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn-primary text-xs bg-[#25d366] hover:bg-[#20ba5a] text-white py-2 px-5 rounded-xl font-bold shadow-md inline-flex items-center gap-1.5"
                >
                  <MessageCircle size={14} /> Contact WhatsApp Bot
                </a>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between border border-slate-150 rounded-xl overflow-hidden bg-slate-50">
                <div className="bg-[#075e54] text-white p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="font-bold text-[10px]">SRM Xerox Spool Bot</span>
                  </div>
                </div>

                <div className="flex-1 p-3 overflow-y-auto space-y-2 text-[10px] max-h-[260px]">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                        msg.sender === 'user' 
                          ? 'bg-[#dcf8c6] text-slate-800 rounded-tr-none' 
                          : 'bg-white text-slate-850 rounded-tl-none shadow-sm'
                      }`}>
                        <div className="whitespace-pre-line leading-relaxed">{msg.text}</div>
                        {msg.isLink && (
                          <button 
                            onClick={() => setShowWaPayModal(true)}
                            className="mt-1.5 text-blue-600 font-bold hover:underline block text-left"
                          >
                            Proceed to secure checkout ➔
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-2 border-t border-slate-200 bg-white">
                  <div className="flex items-center gap-1.5">
                    <label className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full flex-shrink-0 cursor-pointer">
                      <input 
                        type="file" 
                        onChange={handleWaFileAttach}
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden" 
                      />
                      <FileText size={13} />
                    </label>

                    <input 
                      type="text"
                      placeholder="Type option..."
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSendWaMessage(chatInput);
                      }}
                      className="flex-1 bg-white border border-slate-300 rounded-full px-2.5 py-1 text-[9px] text-slate-850 focus:outline-none focus:border-brand-500 shadow-xs"
                    />

                    <button 
                      onClick={() => handleSendWaMessage(chatInput)}
                      className="w-7 h-7 rounded-full bg-[#128c7e] text-white flex items-center justify-center hover:bg-[#075e54] transition-colors"
                    >
                      <Send size={10} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* LOWER STATUS BAR */}
      <section className="bg-white border-y border-slate-200 py-4 shadow-sm mb-6">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div className="flex flex-col items-center">
            <span className="text-slate-400 text-[10px] font-semibold uppercase">Shop Status</span>
            <span className="badge-status badge-completed mt-1">● OPEN</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-slate-400 text-[10px] font-semibold uppercase">Printer Status</span>
            <span className="badge-status badge-printing mt-1">● ONLINE</span>
          </div>
          <div className="flex flex-col items-center col-span-2 md:col-span-1">
            <span className="text-slate-400 text-[10px] font-semibold uppercase">Avg. Wait Time</span>
            <span className="text-slate-800 text-xs font-bold mt-1 flex items-center gap-1">
              <Clock size={12} className="text-brand-500" /> 5 - 10 mins
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-slate-400 text-[10px] font-semibold uppercase">Working Hours</span>
            <span className="text-slate-800 text-xs font-bold mt-1">{shopSettings.workingHoursText}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-slate-400 text-[10px] font-semibold uppercase">WhatsApp Number</span>
            <span className="text-slate-800 text-xs font-bold mt-1 flex items-center gap-1">
              <Phone size={12} className="text-emerald-500" /> {shopSettings.phone}
            </span>
          </div>
        </div>
      </section>

      {/* DUAL CONTENT BLOCKS */}
      <section className="max-w-5xl mx-auto px-4 pb-12 w-full grid md:grid-cols-2 gap-6">
        {/* How It Works */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-extrabold text-slate-900 text-sm tracking-wide uppercase border-b border-slate-100 pb-3 mb-4">
            How It Works
          </h3>
          <div className="space-y-4">
            {[
              { step: '1', title: 'Upload / Send', desc: 'Upload on the website or send via WhatsApp bot.' },
              { step: '2', title: 'We Process', desc: 'System automatically parses pages and calculates exact price.' },
              { step: '3', title: 'Pay Securely', desc: 'Complete checkout using UPI, NetBanking, or Cards.' },
              { step: '4', title: 'We Print', desc: 'Agent fires print command automatically. Pick up at your convenience.' }
            ].map(item => (
              <div key={item.step} className="flex gap-3">
                <span className="w-7 h-7 rounded-full bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {item.step}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Price List */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-extrabold text-slate-900 text-sm tracking-wide uppercase border-b border-slate-100 pb-3 mb-4">
            Price List (Per Page)
          </h3>
          <div className="overflow-hidden border border-slate-100 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                  <th className="p-2.5 font-bold">Paper Type</th>
                  <th className="p-2.5 font-bold text-right">Black & White</th>
                  <th className="p-2.5 font-bold text-right">Color</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="p-2.5 text-slate-600 font-semibold">A4 Standard</td>
                  <td className="p-2.5 text-slate-900 font-bold text-right">₹{pricing.A4_BW.toFixed(2)}</td>
                  <td className="p-2.5 text-slate-900 font-bold text-right">₹{pricing.A4_Color.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-slate-600 font-semibold">A3 Large</td>
                  <td className="p-2.5 text-slate-900 font-bold text-right">₹{pricing.A3_BW.toFixed(2)}</td>
                  <td className="p-2.5 text-slate-900 font-bold text-right">₹{pricing.A3_Color.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-slate-600 font-semibold">Letter Size</td>
                  <td className="p-2.5 text-slate-900 font-bold text-right">₹{pricing.Letter_BW.toFixed(2)}</td>
                  <td className="p-2.5 text-slate-900 font-bold text-right">₹-</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-slate-600 font-semibold">Legal Size</td>
                  <td className="p-2.5 text-slate-900 font-bold text-right">₹{pricing.Legal_BW.toFixed(2)}</td>
                  <td className="p-2.5 text-slate-900 font-bold text-right">₹-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6">
        <div className="max-w-5xl mx-auto px-4 text-xs text-slate-400 flex justify-between items-center">
          <div>© 2026 {shopSettings.name}. All rights reserved.</div>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-slate-600">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-slate-600">Terms of Service</Link>
            <Link href="/admin/login" className="hover:text-slate-600 font-semibold text-brand-600">Admin Login</Link>
          </div>
        </div>
      </footer>

      {/* CONFIGURE DIALOG MODAL */}
      {showConfig && selectedFile && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl border border-slate-200">
            <div className="bg-brand-600 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Configure Print Options</h3>
              <button onClick={() => setShowConfig(false)} className="text-white/80 hover:text-white text-xs font-semibold">Cancel</button>
            </div>
            
            <form onSubmit={handleOrderSubmit} className="p-5 space-y-4">
              <div>
                <span className="text-slate-400 text-[10px] font-bold uppercase block">File</span>
                <span className="text-slate-800 text-xs font-semibold block truncate mt-0.5">{selectedFile.name}</span>
                <span className="text-slate-500 text-[10px]">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · {pagesCount} pages</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-500 font-semibold mb-1 block">Copies</label>
                  <input 
                    type="number" 
                    min="1"
                    max={rules.maxCopies}
                    value={copies}
                    onChange={e => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                    className="input-field py-1.5"
                  />
                </div>
                <div>
                  <label className="text-slate-500 font-semibold mb-1 block">Paper Size</label>
                  <select value={paperSize} onChange={e => setPaperSize(e.target.value as any)} className="input-field py-1.5">
                    <option value="A4">A4</option>
                    <option value="A3">A3</option>
                    <option value="Letter">Letter</option>
                    <option value="Legal">Legal</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-500 font-semibold mb-1 block">Color Mode</label>
                  <select value={colorMode} onChange={e => setColorMode(e.target.value as any)} className="input-field py-1.5">
                    <option value="bw">Black & White (₹{pricing.A4_BW.toFixed(2)})</option>
                    <option value="color">Color (₹{pricing.A4_Color.toFixed(2)})</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-500 font-semibold mb-1 block">Double Sided</label>
                  <select value={duplex} onChange={e => setDuplex(e.target.value as any)} className="input-field py-1.5">
                    <option value="simplex">Single Side</option>
                    <option value="duplex">Double Side</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-3">
                <div>
                  <label className="text-slate-500 text-xs font-semibold mb-1 block">Your Name</label>
                  <input 
                    type="text"
                    required
                    placeholder="Enter name"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="input-field py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-500 text-xs font-semibold mb-1 block">Your Phone (WhatsApp Updates)</label>
                  <input 
                    type="tel"
                    required
                    placeholder="e.g. +91 9876543210"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="input-field py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-500 text-xs font-semibold mb-1.5 block">Payment Option</label>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <label className={`border rounded-xl p-2.5 flex items-center justify-between cursor-pointer transition-all ${
                      paymentMethod === 'online' ? 'border-brand-500 bg-brand-50/10 font-bold' : 'border-slate-200'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <input type="radio" checked={paymentMethod === 'online'} onChange={() => setPaymentMethod('online')} className="text-brand-600 focus:ring-brand-500" />
                        <span>Pay Online</span>
                      </div>
                    </label>
                    <label className={`border rounded-xl p-2.5 flex items-center justify-between cursor-pointer transition-all ${
                      paymentMethod === 'cash' ? 'border-brand-500 bg-brand-50/10 font-bold' : 'border-slate-200'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <input type="radio" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} className="text-brand-600 focus:ring-brand-500" />
                        <span>Cash at Counter</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Coupon Code Input */}
              <div className="space-y-1">
                <label className="text-slate-500 text-xs font-semibold mb-1 block">Coupon Code</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Enter coupon code (e.g. STUDENT10)"
                    value={couponInput}
                    onChange={e => setCouponInput(e.target.value.toUpperCase())}
                    className="input-field py-2 text-xs flex-1 bg-white border border-slate-200 rounded-xl px-3 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="bg-brand-50 hover:bg-brand-100 text-brand-700 px-4 rounded-xl text-xs font-bold transition-all border border-brand-200"
                  >
                    Apply
                  </button>
                </div>
                {appliedCoupon && (
                  <p className="text-emerald-600 text-[10px] font-semibold mt-0.5">
                    ✓ Code Applied! Discount of {appliedCoupon.type === 'percentage' ? `${appliedCoupon.value}%` : `₹${appliedCoupon.value}`} applied.
                  </p>
                )}
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex justify-between items-center">
                <div>
                  <span className="text-slate-400 text-[10px] block font-semibold">Total Price</span>
                  <span className="text-[10px] text-slate-500">Includes {pagesCount * copies} printed pages</span>
                </div>
                <div className="text-right">
                  <span className="text-brand-600 font-black text-xl">₹{calculatePrice()}</span>
                </div>
              </div>

              {pagesCount > rules.autoApprovalPageLimit && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-lg text-[10px] flex gap-2">
                  <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Approval required:</strong> This file has more than {rules.autoApprovalPageLimit} pages.</span>
                </div>
              )}

              <button type="submit" disabled={uploading} className="w-full btn-primary py-2.5 text-xs font-bold justify-center rounded-xl shadow-md disabled:opacity-50">
                {uploading ? "Uploading document..." : "Proceed to Checkout"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Simulator Razorpay Gate Checkout */}
      {showWaPayModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl border border-slate-200">
            <div className="bg-[#075e54] text-white p-4 flex items-center justify-between">
              <h3 className="font-extrabold text-xs">Razorpay Secure Checkout</h3>
              <button onClick={() => setShowWaPayModal(false)} className="text-white/85 hover:text-white text-xs font-bold">Cancel</button>
            </div>
            <form onSubmit={handleWaCheckoutPayment} className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                <div className="flex justify-between text-slate-500">
                  <span>File Spooled:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[150px]">{simulatedFile ? simulatedFile.name : 'document.pdf'}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Pages & Copies:</span>
                  <span className="font-semibold text-slate-800">{simulatedPages} pages × {simulatedCopies} copies</span>
                </div>
                <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-slate-900 text-sm">
                  <span>Total Payable:</span>
                  <span>₹{simulatedAmount.toFixed(2)}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-slate-500 font-semibold mb-1 block">Your Name</label>
                  <input type="text" required placeholder="Enter name" value={customerName} onChange={e => setCustomerName(e.target.value)} className="input-field py-2" />
                </div>
                <div>
                  <label className="text-slate-500 font-semibold mb-1 block">Your Phone</label>
                  <input type="text" required placeholder="e.g. +91 9876543210" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="input-field py-2" />
                </div>
              </div>
              <button type="submit" disabled={uploading} className="w-full btn-primary bg-emerald-600 hover:bg-emerald-700 py-2.5 flex items-center justify-center gap-1.5 rounded-xl font-bold shadow-md">
                {uploading ? "Processing..." : `Pay ₹${simulatedAmount.toFixed(2)} Securely`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
