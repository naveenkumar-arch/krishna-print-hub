import db from '@/lib/db';

/** Restores product stock for physical items on an order. */
export async function restoreOrderStock(orderId: string): Promise<void> {
  const orderItems = await db.orderItem.findMany({ where: { orderId } });
  for (const item of orderItems) {
    if (item.productId) {
      await db.product.update({
        where: { id: item.productId },
        data: { stockQuantity: { increment: item.quantity } },
      });
    }
  }
}

/** Cancels an unpaid order and restores stock. Returns false if order not eligible. */
export async function cancelAwaitingPaymentOrder(
  orderId: string,
  userId: string
): Promise<{ ok: boolean; message: string }> {
  const order = await db.order.findUnique({ where: { id: orderId } });

  if (!order) {
    return { ok: false, message: 'Order not found' };
  }

  if (order.userId !== userId) {
    return { ok: false, message: 'Forbidden' };
  }

  if (order.paymentStatus !== 'Awaiting Payment') {
    return { ok: false, message: 'Order cannot be cancelled in its current state' };
  }

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'Failed',
        status: 'Cancelled',
      },
    });

    const orderItems = await tx.orderItem.findMany({ where: { orderId } });
    for (const item of orderItems) {
      if (item.productId) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }
    }
  });

  return { ok: true, message: 'Order cancelled and stock restored' };
}
