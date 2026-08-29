import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const config = await db.getRazorpayConfig();
    const keySecret = config.keySecret;
    if (!keySecret) {
      console.error("[Verify Payment API] Razorpay Key Secret not configured in database or env.");
      return NextResponse.json({ error: "Razorpay credentials not configured" }, { status: 401 });
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: "Malformed JSON payload in request." }, { status: 400 });
    }
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId } = body;

    // Validate inputs
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing required signature verification fields" }, { status: 400 });
    }

    // Verify signature using HMAC-SHA256
    const text = razorpay_order_id + "|" + razorpay_payment_id;
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(text)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      console.warn(`[Verify Payment API] Signature verification failed for orderId: ${orderId}`);
      return NextResponse.json({ error: "Payment verification signature mismatch" }, { status: 400 });
    }

    console.log(`[Verify Payment API] Signature verified successfully for Order Code: ${orderId}`);

    // Update order status to paid / queued in JSON database
    if (orderId) {
      const orders = await db.getOrders();
      const order = orders.find((o: any) => o.id === orderId);
      if (order) {
        const rules = await db.getRules();
        const nextStatus = order.pages > rules.autoApprovalPageLimit ? 'waiting_approval' : 'paid';
        await db.updateOrderStatus(orderId, nextStatus);
        console.log(`[Verify Payment API] Order ${orderId} status successfully updated to ${nextStatus}.`);
      } else {
        console.warn(`[Verify Payment API] Order ID ${orderId} not found in database.`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Verify Payment API] Error occurred:", err);
    return NextResponse.json({ error: err.message || "Internal verification error" }, { status: 500 });
  }
}
