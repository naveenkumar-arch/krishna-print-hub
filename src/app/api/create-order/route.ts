import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const config = await db.getRazorpayConfig();
    const keyId = config.keyId;
    const keySecret = config.keySecret;

    if (!keyId || !keySecret) {
      console.error("[Create Order API] Razorpay credentials not configured in database or env.");
      return NextResponse.json({ error: "Razorpay credentials not configured" }, { status: 401 });
    }

    const body = await request.json();
    const { amount, receipt } = body;

    // Validate amount (in paise)
    if (amount === undefined || typeof amount !== 'number') {
      return NextResponse.json({ error: "Missing or invalid amount" }, { status: 400 });
    }

    if (amount < 100) {
      return NextResponse.json({ error: "Minimum amount is 100 paise (₹1.00)" }, { status: 400 });
    }

    const rzp = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });

    const options = {
      amount: Math.round(amount),
      currency: "INR",
      receipt: receipt || `receipt_${Date.now()}`
    };

    const order = await rzp.orders.create(options);

    return NextResponse.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (err: any) {
    console.error("[Create Order API] Razorpay Order Creation Failed:", err);
    return NextResponse.json({ error: err.message || "Failed to create Razorpay Order" }, { status: 500 });
  }
}
