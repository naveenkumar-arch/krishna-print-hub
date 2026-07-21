import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

const SHOP_KEY = 'secure_print_agent_api_key_123456';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    const status = searchParams.get('status'); // printing | done | failed
    const message = searchParams.get('message') || '';

    if (key !== SHOP_KEY) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Find the order item by id
    const item = await db.orderItem.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!item) {
      return NextResponse.json({ success: false, message: 'Job item not found' }, { status: 404 });
    }

    console.log(`Print job status update for item ${id}: ${status} (${message})`);

    // If status is "done", we can update the parent order status to "Packed"
    if (status === 'done') {
      await db.order.update({
        where: { id: item.orderId },
        data: { status: 'Packed' },
      });
      console.log(`Order ${item.orderId} status set to Packed.`);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Job status update error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
