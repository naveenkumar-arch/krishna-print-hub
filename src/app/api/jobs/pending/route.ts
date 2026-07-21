import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

const SHOP_KEY = 'secure_print_agent_api_key_123456';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    if (key !== SHOP_KEY) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Find all orders that are in "Processing" status
    const orders = await db.order.findMany({
      where: {
        status: 'Processing',
      },
      include: {
        items: true,
      },
    });

    const jobs = [];

    for (const order of orders) {
      // Find items that are print items (productId is null)
      const printItems = order.items.filter((item) => item.productId === null);

      for (const item of printItems) {
        const nameLower = item.name.toLowerCase();
        let colorMode = 'bw';
        if (nameLower.includes('color')) {
          colorMode = 'color';
        }

        let paperSize = 'A4';
        if (nameLower.includes('a3')) {
          paperSize = 'A3';
        } else if (nameLower.includes('letter')) {
          paperSize = 'letter';
        } else if (nameLower.includes('legal')) {
          paperSize = 'Legal';
        }

        let fileType = 'pdf';
        const extMatch = item.name.match(/\.([a-zA-Z0-9]+)\b/);
        if (extMatch && extMatch[1]) {
          fileType = extMatch[1].toLowerCase();
        }

        // The image field contains the file URL
        const fileUrl = item.image;

        jobs.push({
          jobId: item.id,
          fileUrl: fileUrl,
          fileType: fileType,
          colorMode: colorMode,
          paperSize: paperSize,
          copies: item.quantity,
          customerName: order.userName,
          customerPhone: (order.addressJson as any)?.mobile || '',
        });
      }
    }

    return NextResponse.json(jobs);
  } catch (err: any) {
    console.error('Pending jobs error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
