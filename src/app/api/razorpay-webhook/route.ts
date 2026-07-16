import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);
    const event = body.event;

    console.log(`[Razorpay Webhook] Received event: ${event}`);

    // Verify signature if webhook secret is configured
    const razorConfig = db.getRazorpayConfig();
    const signature = request.headers.get('x-razorpay-signature');

    if (razorConfig.webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', razorConfig.webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        console.warn("[Razorpay Webhook] Invalid signature detected. Request rejected.");
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    }

    let orderId = "";

    if (event === 'payment_link.paid') {
      const paymentLinkEntity = body.payload?.payment_link?.entity;
      orderId = paymentLinkEntity?.reference_id || "";
    } else if (event === 'payment.captured') {
      const paymentEntity = body.payload?.payment?.entity;
      orderId = paymentEntity?.notes?.orderId || 
                paymentEntity?.notes?.order_id || 
                paymentEntity?.description?.match(/KP-\d+/)?.[0] || "";
    }

    if (orderId) {
      console.log(`[Razorpay Webhook] Processing success for Order Code: ${orderId}`);
      
      // Update order status to paid (or queued based on approval page limit)
      const orders = db.getOrders();
      const order = orders.find(o => o.id === orderId);
      if (order) {
        const rules = db.getRules();
        const nextStatus = order.pages > rules.autoApprovalPageLimit ? 'waiting_approval' : 'paid';
        db.updateOrderStatus(orderId, nextStatus);
        console.log(`[Razorpay Webhook] Order ${orderId} status updated to ${nextStatus}.`);
      } else {
        console.warn(`[Razorpay Webhook] Order ID ${orderId} not found in database.`);
      }
    } else {
      console.log("[Razorpay Webhook] No order code extracted from webhook event.");
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Razorpay Webhook handler error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
