export const VALID_COUPONS: Record<string, number> = {
  SCHOOLDAYS: 20,
  WELCOME10: 10,
  HAPPY15: 15,
};

export const FREE_DELIVERY_THRESHOLD = 500;
export const DELIVERY_FEE = 40;

export interface PrintConfig {
  pagesCount: number;
  paperSize: 'A4' | 'A3' | 'Legal';
  colorType: 'BW' | 'Color';
  bindingType: 'None' | 'Spiral' | 'Soft' | 'Hard';
  copiesCount: number;
}

export function normalizeCouponCode(code: string | undefined | null): string {
  return (code || '').trim().toUpperCase();
}

export function getCouponDiscountPercent(code: string | undefined | null): number {
  const normalized = normalizeCouponCode(code);
  return VALID_COUPONS[normalized] ?? 0;
}

export function calculateDiscount(subtotal: number, couponCode: string | undefined | null): number {
  const percent = getCouponDiscountPercent(couponCode);
  if (percent <= 0) return 0;
  return Math.round(subtotal * (percent / 100));
}

export function calculateDeliveryFee(subtotalAfterDiscount: number): number {
  if (subtotalAfterDiscount <= 0) return 0;
  return subtotalAfterDiscount >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
}

export function calculatePrintPrice(config: PrintConfig): number {
  const pages = Math.max(1, parseInt(String(config.pagesCount)) || 1);
  const copies = Math.max(1, parseInt(String(config.copiesCount)) || 1);
  const size = config.paperSize || 'A4';
  const color = config.colorType || 'BW';
  const binding = config.bindingType || 'None';

  let pricePerPage = 1;

  if (size === 'A4') {
    pricePerPage = color === 'Color' ? 10 : 1;
  } else if (size === 'A3') {
    pricePerPage = color === 'Color' ? 20 : 3;
  } else if (size === 'Legal') {
    pricePerPage = color === 'Color' ? 15 : 2;
  }

  let bindingCost = 0;
  if (binding === 'Spiral') bindingCost = 50;
  else if (binding === 'Soft') bindingCost = 100;
  else if (binding === 'Hard') bindingCost = 200;

  const unitCost = pages * pricePerPage + bindingCost;
  return unitCost * copies;
}

/** Maps legacy homepage binding labels to API binding types. */
export function mapLegacyBindingStyle(style: string): PrintConfig['bindingType'] {
  if (style === 'Spiral') return 'Spiral';
  if (style === 'Project') return 'Soft';
  if (style === 'Record') return 'Hard';
  return 'None';
}
