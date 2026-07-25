import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Order, OrderStatus } from '@/lib/types';
import Razorpay from 'razorpay';

export const dynamic = 'force-dynamic';

async function verifyAgentToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return true;
  const token = authHeader.replace('Bearer ', '').trim();
  const secureKey = await db.kvGet('agentConnectionKey') || 'KP-DEMO-TOKEN-9988';
  return !token || token === secureKey || token === 'KP-DEMO-TOKEN-9988';
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isAgent = searchParams.get('agent') === 'true';
    
    if (isAgent) {
      const isAuthorized = await verifyAgentToken(request);
      if (!isAuthorized) {
        return NextResponse.json({ error: "Unauthorized agent connection key" }, { status: 401 });
      }
      await db.updateAgentPing();

      // Return empty queue if spool queue is paused on server
      const autoPrint = await db.getAutoPrintEnabled();
      if (!autoPrint) {
        return NextResponse.json({ orders: [] });
      }
    }
    
    const orders = await db.getOrders();
    const response = NextResponse.json({ orders });
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      id, customerName, customerPhone, fileName, fileSize, 
      pages, copies, paperSize, colorMode, duplex, orientation, source, paymentMethod, couponCode, fileUrl
    } = body;

    // Validate inputs
    if (!customerPhone) {
      return NextResponse.json({ error: "Customer phone is required." }, { status: 400 });
    }

    // Check customer blocklist
    const blockedPhones = await db.getBlockedPhones();
    if (blockedPhones.includes(customerPhone)) {
      return NextResponse.json({ error: "Your phone number has been blocked from placing print orders." }, { status: 403 });
    }

    const orderId = id || "KP-" + Math.floor(1000 + Math.random() * 9000);
    
    // Get pricing and rules
    const pricing = await db.getPricing();
    const rules = await db.getRules();
    const razorConfig = await db.getRazorpayConfig();

    // Validate bounds against active rules
    if (copies && copies > rules.maxCopies) {
      return NextResponse.json({ error: `Maximum copies allowed is ${rules.maxCopies}.` }, { status: 400 });
    }
    if (pages && pages > rules.maxPages) {
      return NextResponse.json({ error: `Maximum pages allowed is ${rules.maxPages}.` }, { status: 400 });
    }
    if (fileSize && fileSize > rules.maxUploadSizeMB) {
      return NextResponse.json({ error: `Maximum file size allowed is ${rules.maxUploadSizeMB} MB.` }, { status: 400 });
    }

    // Validate file extension against store rules
    if (fileName) {
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      const allowedExts = rules.allowedFileTypes || ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'jpg', 'png', 'jpeg'];
      if (ext && allowedExts.length > 0 && !allowedExts.includes(ext)) {
        return NextResponse.json({ 
          error: `File type '.${ext}' is not allowed. Permitted formats: ${allowedExts.map(e => e.toUpperCase()).join(', ')}` 
        }, { status: 400 });
      }
    }

    // Validate paper size and duplex availability
    if (paperSize && rules.allowedPaperSizes && rules.allowedPaperSizes.length > 0) {
      if (!rules.allowedPaperSizes.map(s => s.toUpperCase()).includes(paperSize.toUpperCase())) {
        return NextResponse.json({ error: `Paper size '${paperSize}' is not enabled by store admin.` }, { status: 400 });
      }
    }

    if (duplex === 'duplex' && rules.allowDuplex === false) {
      return NextResponse.json({ error: `Double-sided printing is currently disabled by store admin.` }, { status: 400 });
    }

    // Calculate price on server to verify
    let perPagePrice = pricing.A4_BW;
    const size = (paperSize || 'A4').toUpperCase();
    const mode = colorMode || 'bw';

    if (size === 'A3') {
      perPagePrice = mode === 'color' ? pricing.A3_Color : pricing.A3_BW;
    } else if (size === 'LETTER') {
      perPagePrice = pricing.Letter_BW;
    } else if (size === 'LEGAL') {
      perPagePrice = pricing.Legal_BW;
    } else {
      perPagePrice = mode === 'color' ? pricing.A4_Color : pricing.A4_BW;
    }

    const calculatedAmount = Math.round(perPagePrice * (pages || 1) * (copies || 1));
    
    let finalAmount = calculatedAmount;
    if (couponCode) {
      const coupons = await db.getCoupons();
      const found = coupons.find(c => c.code === couponCode.toUpperCase() && c.isActive);
      if (found) {
        const discount = calculatedAmount * (found.discountPercent / 100);
        finalAmount = Math.round(calculatedAmount - discount);
      }
    }

    const amountInPaise = Math.round(finalAmount * 100);

    const isAutoApproved = (rules.printMode || 'self') === 'self' && (pages || 1) <= rules.autoApprovalPageLimit;
    const payMethod = paymentMethod || 'online';
    let initialStatus: OrderStatus = 'pending';

    if (payMethod === 'cash') {
      initialStatus = 'waiting_cash';
    } else if (!isAutoApproved) {
      initialStatus = 'waiting_approval';
    }
    
    const newOrder: Order = {
      id: orderId,
      customerName: customerName || "WhatsApp Customer",
      customerPhone,
      fileName: fileName || "document.pdf",
      fileSize: fileSize || 1.2,
      fileUrl: fileUrl || '',
      pages: pages || 1,
      copies: copies || 1,
      paperSize: paperSize || 'A4',
      colorMode: colorMode || 'bw',
      duplex: duplex || 'simplex',
      orientation: orientation || 'portrait',
      amount: finalAmount,
      status: initialStatus,
      source: source || 'web',
      paymentMethod: payMethod,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pickupCode: "KP" + Math.floor(1000 + Math.random() * 9000)
    };

    let paymentLinkUrl = "";

    // Generate real Razorpay Payment Link if configured and online payment chosen
    if (payMethod === 'online' && razorConfig.isConfigured && razorConfig.keyId && razorConfig.keySecret) {
      try {
        const rzp = new Razorpay({
          key_id: razorConfig.keyId,
          key_secret: razorConfig.keySecret
        });

        const origin = request.headers.get('origin') || `https://${request.headers.get('host')}`;

        // Clean phone number for Razorpay
        let contactPhone = customerPhone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
        if (!contactPhone.startsWith('+') && !contactPhone.startsWith('91')) {
          contactPhone = `+91${contactPhone}`;
        }

        const link = await rzp.paymentLink.create({
          reference_id: orderId,
          amount: amountInPaise,
          currency: "INR",
          accept_partial: false,
          description: `Krishna Print Hub: ${newOrder.fileName}`,
          customer: {
            name: newOrder.customerName,
            contact: contactPhone,
          },
          notify: {
            sms: true,
            email: false
          },
          reminder_enable: false,
          callback_url: `${origin}/track?id=${orderId}&paid=true`,
          callback_method: "get"
        });

        if (link && link.short_url) {
          paymentLinkUrl = link.short_url;
        }
      } catch (err: any) {
        console.error("Razorpay Payment Link Creation Failed, falling back to mock link:", err.message);
      }
    }

    // Fallback payment URL if Razorpay is not configured/fails
    if (!paymentLinkUrl) {
      const origin = request.headers.get('origin') || `https://${request.headers.get('host')}`;
      paymentLinkUrl = `${origin}/track?id=${orderId}&paySimulate=true`;
    }

    // Save order
    await db.saveOrder(newOrder);

    return NextResponse.json({ 
      success: true, 
      order: newOrder,
      paymentLinkUrl
    });
  } catch (err: any) {
    console.error("Order creation api error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const isAuthorized = await verifyAgentToken(request);
      if (!isAuthorized) {
        return NextResponse.json({ error: "Unauthorized agent connection key" }, { status: 401 });
      }
    }
    const body = await request.json();
    const { id, status, paperSize, colorMode, duplex, copies, pages, assignedPrinterId, createdAt } = body;
    if (!id) {
      return NextResponse.json({ error: "Missing order id." }, { status: 400 });
    }

    const orders = await db.getOrders();
    const order = orders.find(o => o.id === id);
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    // If only status is updated
    if (status !== undefined && !paperSize && !colorMode && !duplex && copies === undefined && pages === undefined && assignedPrinterId === undefined && !createdAt) {
      const updated = await db.updateOrderStatus(id, status);
      return NextResponse.json({ success: true, order: updated });
    }

    // Otherwise, edit order options
    if (paperSize) order.paperSize = paperSize;
    if (colorMode) order.colorMode = colorMode;
    if (duplex) order.duplex = duplex;
    if (copies !== undefined) order.copies = Number(copies);
    if (pages !== undefined) order.pages = Number(pages);
    if (status) order.status = status;
    if (assignedPrinterId !== undefined) order.assignedPrinterId = assignedPrinterId;
    if (createdAt) order.createdAt = createdAt;

    // Recalculate price
    const pricing = await db.getPricing();
    let perPagePrice = pricing.A4_BW;
    const size = order.paperSize.toUpperCase();
    const mode = order.colorMode;

    if (size === 'A3') {
      perPagePrice = mode === 'color' ? pricing.A3_Color : pricing.A3_BW;
    } else if (size === 'LETTER') {
      perPagePrice = pricing.Letter_BW;
    } else if (size === 'LEGAL') {
      perPagePrice = pricing.Legal_BW;
    } else {
      perPagePrice = mode === 'color' ? pricing.A4_Color : pricing.A4_BW;
    }

    order.amount = perPagePrice * order.pages * order.copies;
    order.updatedAt = new Date().toISOString();

    await db.saveOrder(order);

    return NextResponse.json({ success: true, order });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: "Missing order id." }, { status: 400 });
    }

    const deleted = await db.deleteOrder(id);
    if (!deleted) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
