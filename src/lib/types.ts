export type OrderStatus = 'pending' | 'paid' | 'failed' | 'queued' | 'printing' | 'completed' | 'cancelled' | 'waiting_approval' | 'waiting_cash' | 'cancel_requested' | 'downloading';
export type PrintColorMode = 'bw' | 'color';
export type PaperSize = 'A4' | 'A3' | 'Letter' | 'Legal' | 'A5' | 'B4';
export type DuplexMode = 'simplex' | 'duplex';
export type OrientationMode = 'portrait' | 'landscape';

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  fileName: string;
  fileSize: number; // in MB
  fileUrl?: string; // URL for agent to download
  pages: number;
  copies: number;
  paperSize: PaperSize;
  colorMode: PrintColorMode;
  duplex: DuplexMode;
  orientation: OrientationMode;
  amount: number;
  status: OrderStatus;
  source: 'web' | 'whatsapp';
  paymentMethod?: 'online' | 'cash';
  createdAt: string;
  updatedAt: string;
  pickupCode: string;
  assignedPrinterId?: string;
}

export interface Customer {
  id: string;
  name?: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  isBlocked: boolean;
  createdAt: string;
  lastOrderAt: string;
}

export interface Printer {
  id: string;
  name: string;
  brand: string;
  model: string;
  status: 'online' | 'offline' | 'printing' | 'idle' | 'error';
  connectionType: 'USB' | 'LAN' | 'WiFi';
  ipAddress?: string;
  inkLevels: {
    black: number;
    cyan?: number;
    magenta?: number;
    yellow?: number;
  };
  paperLevels: {
    A4: number;
    A3?: number;
  };
  isDefault: boolean;
  isDefaultBW?: boolean;
  isDefaultColor?: boolean;
  supportsColor?: boolean;
  supportsA3?: boolean;
  isHighSpeed?: boolean;
}

export interface Pricing {
  A4_BW: number;
  A4_Color: number;
  A3_BW: number;
  A3_Color: number;
  Letter_BW: number;
  Legal_BW: number;
}

export interface PrintRules {
  maxUploadSizeMB: number;
  maxCopies: number;
  maxPages: number;
  autoApprovalPageLimit: number; // Orders with pages > limit will go to 'waiting_approval'
  allowedFileTypes: string[];
  allowedPaperSizes: PaperSize[];
  allowedColorModes: PrintColorMode[];
  allowDuplex: boolean;
  workingHoursStart: string; // e.g. "08:00"
  workingHoursEnd: string; // e.g. "21:00"
  printMode?: 'self' | 'assisted';
}

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  isConfigured: boolean;
  testMode: boolean;
}

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  verifyToken: string;
  isConfigured: boolean;
}

export interface ShopSettings {
  name: string;
  tagline: string;
  logoUrl?: string;
  bannerUrl?: string;
  address: string;
  phone: string;
  email: string;
  workingHoursText: string;
  googleMapsUrl?: string;
  gstNumber?: string;
}

export interface Ticket {
  id: string;
  subject: string;
  message: string;
  createdAt: string;
  status: 'open' | 'in_progress' | 'resolved';
}
