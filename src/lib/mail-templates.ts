export function getOrderStatusEmailHtml(orderId: string, status: string, paymentStatus: string, total: number): string {
  return `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #0ea5e9;">Krishna Stationery</h2>
      <p>Your order <strong>#${orderId}</strong> has been updated.</p>
      <ul>
        <li><strong>Status:</strong> ${status}</li>
        <li><strong>Payment:</strong> ${paymentStatus}</li>
        <li><strong>Total:</strong> ₹${total}</li>
      </ul>
      <p>Thank you for shopping with us!</p>
    </div>
  `;
}

export function getPaymentConfirmedEmailHtml(orderId: string, total: number): string {
  return `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #0ea5e9;">Payment Confirmed</h2>
      <p>We received your payment of <strong>₹${total}</strong> for order <strong>#${orderId}</strong>.</p>
      <p>Your order is now being processed.</p>
    </div>
  `;
}
