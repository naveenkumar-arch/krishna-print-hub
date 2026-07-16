import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { keyId, keySecret } = body;

    if (!keyId || !keySecret) {
      return NextResponse.json({ error: "Missing Key ID or Key Secret" }, { status: 400 });
    }

    // Initialize Razorpay with the keys to test
    const rzp = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });

    // Test the credentials by making a tiny fetch request to Razorpay's API
    // We try to fetch the latest 1 payment. If the keys are invalid, Razorpay will throw a 401 error.
    await rzp.payments.all({ count: 1 });

    return NextResponse.json({
      success: true,
      message: "Razorpay credentials are valid and active!"
    });
  } catch (err: any) {
    console.error("[Razorpay Test Connection Error]:", err);
    // If Razorpay API returns an authentication failure
    const errMsg = err.description || err.message || "Invalid Key ID or Key Secret";
    return NextResponse.json({
      success: false,
      error: errMsg
    }, { status: 401 });
  }
}
