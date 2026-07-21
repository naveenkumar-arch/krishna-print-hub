import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { cancelAwaitingPaymentOrder } from '@/lib/orders';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ success: false, message: 'Order ID is required' }, { status: 400 });
    }

    const result = await cancelAwaitingPaymentOrder(orderId, session.user.id);
    if (!result.ok) {
      const status = result.message === 'Forbidden' ? 403 : result.message === 'Order not found' ? 404 : 400;
      return NextResponse.json({ success: false, message: result.message }, { status });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (err) {
    console.error('Cancel order error:', err);
    return NextResponse.json({ success: false, message: 'Failed to cancel order' }, { status: 500 });
  }
}
