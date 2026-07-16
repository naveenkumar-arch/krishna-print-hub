import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Customer } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const orders = await db.getOrders();
    const blockedPhones = await db.getBlockedPhones();
    const customerNotes = await db.kvGet('customerNotes') || {};

    const customerMap: Record<string, {
      name?: string;
      phone: string;
      totalOrders: number;
      totalSpent: number;
      totalPages: number;
      lastPaymentMethod: string;
      bwCount: number;
      colorCount: number;
      createdAt: string;
      lastOrderAt: string;
    }> = {};

    // Sort orders by date ascending so we process oldest first and establish correct createdAt and latest name
    const sortedOrders = [...orders].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    for (const order of sortedOrders) {
      const phone = order.customerPhone;
      if (!customerMap[phone]) {
        customerMap[phone] = {
          name: order.customerName,
          phone: phone,
          totalOrders: 0,
          totalSpent: 0,
          totalPages: 0,
          lastPaymentMethod: order.paymentMethod || 'online',
          bwCount: 0,
          colorCount: 0,
          createdAt: order.createdAt,
          lastOrderAt: order.createdAt
        };
      }

      // Increment count
      customerMap[phone].totalOrders += 1;

      // Sum pages
      if (order.status !== 'cancelled' && order.status !== 'failed') {
        customerMap[phone].totalPages += (order.pages * order.copies);
      }

      // Count print type preferences
      if (order.colorMode === 'color') {
        customerMap[phone].colorCount += 1;
      } else {
        customerMap[phone].bwCount += 1;
      }

      // Record last payment method
      customerMap[phone].lastPaymentMethod = order.paymentMethod || 'online';

      // Update name to latest known name
      if (order.customerName && order.customerName !== "WhatsApp Customer") {
        customerMap[phone].name = order.customerName;
      }

      // Sum spent amount only for paid / completed orders
      if (order.status !== 'cancelled' && order.status !== 'failed' && order.status !== 'pending') {
        customerMap[phone].totalSpent += order.amount;
      }

      // Update last order date
      if (new Date(order.createdAt).getTime() > new Date(customerMap[phone].lastOrderAt).getTime()) {
        customerMap[phone].lastOrderAt = order.createdAt;
      }
    }

    const customers: any[] = Object.values(customerMap).map((c, idx) => {
      const favType = c.colorCount > c.bwCount ? 'Color' : 'Black & White';
      return {
        id: `cust-${idx}`,
        name: c.name || 'Anonymous User',
        phone: c.phone,
        totalOrders: c.totalOrders,
        totalPages: c.totalPages,
        totalSpent: Number(c.totalSpent.toFixed(2)),
        lastOrderAt: c.lastOrderAt,
        lastPaymentMethod: c.lastPaymentMethod === 'cash' ? 'Cash at Counter' : 'Pay Online',
        favouritePrintType: favType,
        isBlocked: blockedPhones.includes(c.phone),
        createdAt: c.createdAt,
        notes: customerNotes[c.phone] || ''
      };
    });

    // Sort customers so the one with the latest activity shows first
    customers.sort((a, b) => 
      new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime()
    );

    const response = NextResponse.json({ customers });
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();
    if (!phone) {
      return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
    }

    const isBlocked = await db.toggleBlockedPhone(phone);
    return NextResponse.json({ success: true, isBlocked });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { originalPhone, name, phone, notes } = await request.json();
    if (!originalPhone || !phone) {
      return NextResponse.json({ error: "Both original and new phone numbers are required." }, { status: 400 });
    }

    const orders = await db.getOrders();
    let updatedCount = 0;

    for (const order of orders) {
      if (order.customerPhone === originalPhone) {
        order.customerPhone = phone;
        if (name) {
          order.customerName = name;
        }
        await db.saveOrder(order);
        updatedCount++;
      }
    }

    // Update blocked phone list
    const blockedPhones = await db.getBlockedPhones();
    if (blockedPhones.includes(originalPhone) && originalPhone !== phone) {
      await db.toggleBlockedPhone(originalPhone);
      await db.toggleBlockedPhone(phone);
    }

    // Save notes
    const customerNotes = await db.kvGet('customerNotes') || {};
    if (notes !== undefined) {
      customerNotes[phone] = notes;
      if (originalPhone !== phone && customerNotes[originalPhone]) {
        delete customerNotes[originalPhone];
      }
      await db.kvSet('customerNotes', customerNotes);
    } else if (originalPhone !== phone && customerNotes[originalPhone]) {
      customerNotes[phone] = customerNotes[originalPhone];
      delete customerNotes[originalPhone];
      await db.kvSet('customerNotes', customerNotes);
    }

    return NextResponse.json({ success: true, updatedCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
