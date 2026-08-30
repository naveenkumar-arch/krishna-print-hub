'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Printer, ArrowLeft, FileText, CheckCircle, 
  ShieldCheck, Zap, AlertTriangle 
} from 'lucide-react';
import { mockPricing, mockRules } from '@/lib/mockData';
import { detectExactPageCount } from '@/lib/pageCounter';
import { uploadDocumentFile } from '@/lib/clientUpload';
import toast from 'react-hot-toast';

export default function UploadPage() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pagesCount, setPagesCount] = useState<number>(0);
  const [copies, setCopies] = useState<number>(1);
  const [paperSize, setPaperSize] = useState<'A4' | 'A3' | 'Letter' | 'Legal'>('A4');
  const [colorMode, setColorMode] = useState<'bw' | 'color'>('bw');
  const [duplex, setDuplex] = useState<'simplex' | 'duplex'>('simplex');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [uploading, setUploading] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cash'>('online');
  const [shopSettings, setShopSettings] = useState<any>({});

  const [pricing, setPricing] = useState(mockPricing);
  const [rules, setRules] = useState(mockRules);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [razorpayKeyId, setRazorpayKeyId] = useState<string>('');

  useEffect(() => {
    fetch('/api/config', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data.shopSettings) setShopSettings(data.shopSettings);
        if (data.pricingConfig) setPricing(data.pricingConfig);
        if (data.printRules) setRules(data.printRules);
        if (data.coupons) setCoupons(data.coupons);
        if (data.razorpayConfig && data.razorpayConfig.keyId) {
          setRazorpayKeyId(data.razorpayConfig.keyId);
        }
      })
      .catch(() => {
        const savedShop = localStorage.getItem('shopSettings');
        if (savedShop) setShopSettings(JSON.parse(savedShop));
        
        const savedPricing = localStorage.getItem('pricingConfig');
        if (savedPricing) setPricing(JSON.parse(savedPricing));

        const savedRules = localStorage.getItem('printRules');
        if (savedRules) setRules(JSON.parse(savedRules));
      });
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > rules.maxUploadSizeMB) {
        toast.error(`File size (${sizeMB.toFixed(2)} MB) exceeds the shop limit of ${rules.maxUploadSizeMB} MB.`);
        setSelectedFile(null);
        setPagesCount(0);
        return;
      }

      setSelectedFile(file);
      toast.loading("Analyzing document structure & page count...", { id: 'analyze-doc' });

      try {
        const result = await detectExactPageCount(file);
        
        if (result.pages > rules.maxPages) {
          toast.error(`Document has ${result.pages} pages, which exceeds the maximum store limit of ${rules.maxPages} pages.`, { id: 'analyze-doc' });
          setSelectedFile(null);
          setPagesCount(0);
          return;
        }

        setPagesCount(result.pages);
        toast.success(`Loaded ${file.name} (${result.detail})`, { id: 'analyze-doc' });
      } catch (err) {
        setPagesCount(1);
        toast.success(`Loaded ${file.name} (1 page detected)`, { id: 'analyze-doc' });
      }
    }
  };

  const getRawPrice = () => {
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

    return Math.round(perPagePrice * pagesCount * copies);
  };

  const calculatePrice = () => {
    const raw = getRawPrice();
    if (appliedCoupon) {
      const discount = raw * (appliedCoupon.discountPercent / 100);
      return Math.round(raw - discount);
    }
    return Math.round(raw);
  };

  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      toast.error("Please enter a coupon code.");
      return;
    }
    const found = coupons.find(c => c.code === code);
    if (!found) {
      toast.error("Invalid coupon code.");
      setAppliedCoupon(null);
      return;
    }
    if (!found.isActive) {
      toast.error("This coupon code is inactive.");
      setAppliedCoupon(null);
      return;
    }
    setAppliedCoupon(found);
    toast.success(`Coupon ${found.code} applied! ${found.discountPercent}% discount active.`);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    toast.success("Coupon removed.");
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone) {
      toast.error("Please enter your name and phone number.");
      return;
    }

    // Client-side print rules validation
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
      let fileUrl = '';
      if (selectedFile) {
        toast.loading("Uploading document to shop database...", { id: "upload-file" });
        const uploadResult = await uploadDocumentFile(selectedFile);
        
        if (!uploadResult.success || !uploadResult.fileUrl) {
          toast.error(uploadResult.error || "Failed to upload file to server.", { id: "upload-file" });
          setUploading(false);
          return;
        }
        fileUrl = uploadResult.fileUrl;
        toast.success("Document uploaded successfully!", { id: "upload-file" });
      }

      // 1. Submit order details to backend REST API to register it in our local system
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          fileName: selectedFile ? selectedFile.name : 'document.pdf',
          fileSize: selectedFile ? parseFloat((selectedFile.size / (1024 * 1024)).toFixed(2)) : 1.2,
          fileUrl: fileUrl,
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

      let data: any = {};
      try {
        const text = await response.text();
        data = JSON.parse(text);
      } catch (parseErr) {
        data = { error: `Server error (${response.status}: ${response.statusText || 'Unexpected server response'})` };
      }

      if (!response.ok || !data.success) {
        const rawErr = data?.error;
        const errorMsg = typeof rawErr === 'string' ? rawErr : (rawErr ? JSON.stringify(rawErr) : `Order creation failed with status ${response.status}`);
        toast.error(errorMsg);
        setUploading(false);
        return;
      }

      // If Cash Payment chosen, bypass Razorpay checkout modal
      if (paymentMethod === 'cash') {
        setUploading(false);
        toast.success("Order placed successfully! Pay cash at counter.");
        router.push(`/track?id=${data.order.id}&cash=true`);
        return;
      }

      // Check if Razorpay keys are configured in environment or settings
      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || razorpayKeyId;

      if (keyId) {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          toast.error("Failed to load Razorpay SDK. Please check your internet connection.");
          setUploading(false);
          return;
        }

        const amountInPaise = Math.round(calculatePrice() * 100);

        // 2. Call backend /api/create-order to create a Razorpay Order
        const orderRes = await fetch('/api/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: amountInPaise,
            receipt: `receipt_${data.order.id}`
          })
        });

        const rzpOrderData = await orderRes.json();
        if (!rzpOrderData.success) {
          toast.error(rzpOrderData.error || "Failed to initiate Razorpay transaction.");
          setUploading(false);
          return;
        }

        const options = {
          key: keyId,
          amount: rzpOrderData.amount,
          currency: rzpOrderData.currency,
          name: shopSettings.name || "Krishna Students Print Hub",
          description: `Document Print Order ${data.order.id}`,
          order_id: rzpOrderData.order_id,
          handler: async function (rzpResponse: any) {
            setUploading(true);
            toast.loading("Verifying payment signature...", { id: "verify-sig" });

            try {
              // 3. Verify payment signature on backend
              const verifyRes = await fetch('/api/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_payment_id: rzpResponse.razorpay_payment_id,
                  razorpay_order_id: rzpResponse.razorpay_order_id,
                  razorpay_signature: rzpResponse.razorpay_signature,
                  orderId: data.order.id
                })
              });

              const verifyData = await verifyRes.json();
              if (verifyData.success) {
                toast.success("Payment verified! Print job dispatched.", { id: "verify-sig" });
                router.push(`/track?id=${data.order.id}&paid=true`);
              } else {
                toast.error(verifyData.error || "Signature verification failed.", { id: "verify-sig" });
                setUploading(false);
              }
            } catch (err) {
              console.error("Signature verification error:", err);
              toast.error("Network error during payment verification.", { id: "verify-sig" });
              setUploading(false);
            }
          },
          prefill: {
            name: customerName,
            contact: customerPhone
          },
          notes: {
            orderId: data.order.id
          },
          theme: {
            color: "#7C3AED"
          },
          modal: {
            ondismiss: function () {
              toast.error("Checkout modal closed by user.");
              setUploading(false);
            }
          }
        };

        const rzp = new (window as any).Razorpay(options);
        
        rzp.on('payment.failed', function (response: any) {
          const failDesc = response?.error?.description || response?.error?.code || 'Transaction failed';
          toast.error(`Payment Failed: ${typeof failDesc === 'string' ? failDesc : JSON.stringify(failDesc)}`);
          setUploading(false);
        });

        setUploading(false);
        rzp.open();
      } else {
        // Sandbox mock payment simulation
        setTimeout(() => {
          setUploading(false);
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
      const detailedError = err?.message || (typeof err === 'string' ? err : 'Connection lost. Please try again.');
      toast.error(`Checkout error: ${detailedError}`);
      setUploading(false);
    }
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      <header className="bg-white border-b border-slate-200 flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-slate-500 hover:text-slate-800 flex items-center gap-1">
            <ArrowLeft size={16} />
            <span className="text-xs font-bold">Back to Home</span>
          </Link>
          <span className="font-extrabold text-sm text-slate-800 uppercase">Print Configuration</span>
          <div className="w-12"></div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto w-full px-4 pt-8 pb-12">
          {!selectedFile ? (
          <div className="card-premium bg-white p-6 space-y-6">
            <div className="text-center">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Upload Your Document</h1>
              <p className="text-slate-500 text-xs mt-1">Select a document to get started with printing setup.</p>
            </div>
            
            <div className="border-2 border-dashed border-brand-300 bg-brand-50/50 rounded-xl p-10 flex flex-col items-center justify-center text-center relative hover:border-brand-500 transition-all cursor-pointer">
              <input 
                type="file" 
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.bmp,.tiff,.tif,.gif,.txt,.csv,.md,.log,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/*,text/plain"
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <FileText size={36} className="text-brand-600 mb-3" />
              <span className="btn-primary text-xs py-2 px-5 font-bold rounded-xl shadow-md">
                Browse Files
              </span>
            </div>
          </div>
        ) : (
          <div className="card-premium bg-white">
            <div className="bg-brand-600 text-white p-4 flex justify-between items-center">
              <h2 className="font-bold text-sm">Print Configuration</h2>
              <button 
                onClick={() => setSelectedFile(null)}
                className="text-white/80 hover:text-white text-xs font-semibold"
              >
                Change File
              </button>
            </div>

            <form onSubmit={handleOrderSubmit} className="p-5 space-y-4">
              <div>
                <span className="text-slate-400 text-[10px] font-bold uppercase block">File Details</span>
                <span className="text-slate-800 text-xs font-semibold block truncate mt-0.5">
                  {selectedFile.name}
                </span>
                <span className="text-slate-500 text-[10px]">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · {pagesCount} pages detected
                </span>
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
                  <select 
                    value={paperSize}
                    onChange={e => setPaperSize(e.target.value as any)}
                    className="input-field py-2"
                  >
                    <option value="A4">A4 (Standard)</option>
                    <option value="A3">A3 (Large)</option>
                    <option value="Letter">Letter</option>
                    <option value="Legal">Legal</option>
                  </select>
                </div>
              </div>

              {/* Color Mode Selection Buttons */}
              <div>
                <label className="text-slate-600 text-xs font-bold mb-1.5 flex justify-between items-center">
                  <span>Color Mode</span>
                  <span className="text-[10px] text-slate-400 font-normal">Choose print color</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setColorMode('bw')}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all text-left ${
                      colorMode === 'bw'
                        ? 'border-slate-800 bg-slate-900 text-white shadow-md scale-[1.01]'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-3.5 h-3.5 rounded-full border ${colorMode === 'bw' ? 'bg-white border-white' : 'bg-slate-800 border-slate-800'}`}></span>
                      <div>
                        <div className="font-bold text-xs">Black & White</div>
                        <div className={`text-[10px] ${colorMode === 'bw' ? 'text-slate-300' : 'text-slate-400'}`}>
                          ₹{paperSize === 'A4' ? pricing.A4_BW : paperSize === 'A3' ? pricing.A3_BW : pricing.Letter_BW} / page
                        </div>
                      </div>
                    </div>
                    {colorMode === 'bw' && <span className="text-xs font-black">✓</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setColorMode('color')}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all text-left ${
                      colorMode === 'color'
                        ? 'border-brand-600 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md scale-[1.01]'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-brand-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-rose-500 via-amber-400 to-emerald-400 shadow-sm"></span>
                      <div>
                        <div className="font-bold text-xs">Full Color 🎨</div>
                        <div className={`text-[10px] ${colorMode === 'color' ? 'text-white/80' : 'text-slate-400'}`}>
                          ₹{paperSize === 'A4' ? pricing.A4_Color : paperSize === 'A3' ? pricing.A3_Color : pricing.A4_Color} / page
                        </div>
                      </div>
                    </div>
                    {colorMode === 'color' && <span className="text-xs font-black">✓</span>}
                  </button>
                </div>
              </div>

              {/* Duplex Selection Buttons */}
              <div>
                <label className="text-slate-600 text-xs font-bold mb-1.5 flex justify-between items-center">
                  <span>Printing Sides</span>
                  <span className="text-[10px] text-slate-400 font-normal">Single or Double Sided</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDuplex('simplex')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold text-xs transition-all ${
                      duplex === 'simplex'
                        ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    📄 Single Sided
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuplex('duplex')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold text-xs transition-all ${
                      duplex === 'duplex'
                        ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    📖 Double Sided
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-3">
                <div>
                  <label className="text-slate-500 text-xs font-semibold mb-1 block">Student Name</label>
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
                  <label className="text-slate-500 text-xs font-semibold mb-1 block">WhatsApp Phone Number</label>
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
                        <input 
                          type="radio" 
                          name="payOption"
                          checked={paymentMethod === 'online'}
                          onChange={() => setPaymentMethod('online')}
                          className="text-brand-600 focus:ring-brand-500"
                        />
                        <span>Pay Online</span>
                      </div>
                    </label>
                    <label className={`border rounded-xl p-2.5 flex items-center justify-between cursor-pointer transition-all ${
                      paymentMethod === 'cash' ? 'border-brand-500 bg-brand-50/10 font-bold' : 'border-slate-200'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <input 
                          type="radio" 
                          name="payOption"
                          checked={paymentMethod === 'cash'}
                          onChange={() => setPaymentMethod('cash')}
                          className="text-brand-600 focus:ring-brand-500"
                        />
                        <span>Cash at Counter</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Large order warning */}
              {pagesCount > rules.autoApprovalPageLimit && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-lg text-[10px] flex gap-2">
                  <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Requires Approval:</strong> Page count exceeds {rules.autoApprovalPageLimit} pages. Order will spooled once owner approves it manually.
                  </span>
                </div>
              )}

              {/* Coupon discount input */}
              <div className="space-y-1.5 text-xs">
                <label className="font-semibold text-slate-700 block">Coupon Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    disabled={!!appliedCoupon}
                    placeholder="Enter coupon code (e.g. PRINT5)"
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value)}
                    className="input-field py-1.5 px-3 text-xs uppercase"
                  />
                  {appliedCoupon ? (
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    >
                      Apply
                    </button>
                  )}
                </div>
                {appliedCoupon && (
                  <span className="text-[10px] text-emerald-600 block font-semibold">
                    ✓ Code {appliedCoupon.code} applied! {appliedCoupon.discountPercent}% discount has been deducted.
                  </span>
                )}
              </div>

              {/* Price summary */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex justify-between items-center">
                <div>
                  <span className="text-slate-400 text-[10px] block font-semibold">Total Cost</span>
                  {appliedCoupon ? (
                    <span className="text-[10px] text-slate-500">
                      Discounted by {appliedCoupon.discountPercent}%
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">Includes all configurations</span>
                  )}
                </div>
                <div className="text-right">
                  {appliedCoupon && (
                    <span className="text-slate-400 text-[10px] block line-through font-medium mr-1">
                      ₹{getRawPrice().toFixed(2)}
                    </span>
                  )}
                  <span className="text-brand-600 font-black text-xl">₹{calculatePrice()}</span>
                </div>
              </div>

              <button 
                type="submit"
                disabled={uploading}
                className="w-full btn-primary py-2.5 text-xs font-bold justify-center rounded-xl shadow-md disabled:opacity-50"
              >
                {uploading ? "Configuring spooler..." : "Pay Securely & Print"}
              </button>
            </form>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
