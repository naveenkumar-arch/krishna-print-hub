import fs from 'fs';
import path from 'path';
import { 
  mockShopSettings, mockPricing, mockRules, 
  mockRazorpayConfig, mockWhatsAppConfig 
} from './mockData';
import { Order, ShopSettings, Pricing, PrintRules, RazorpayConfig, WhatsAppConfig } from './types';

const DB_PATH = path.join(process.cwd(), 'db.json');

interface Schema {
  orders: Order[];
  shopSettings: ShopSettings;
  pricingConfig: Pricing;
  printRules: PrintRules;
  razorpayConfig: RazorpayConfig;
  whatsappConfig: WhatsAppConfig;
  lastAgentPing?: string;
  autoPrintEnabled?: boolean;
  printers?: any[];
  blockedPhones?: string[];
  coupons?: any[];
}

const defaultSchema: Schema = {
  orders: [],
  shopSettings: mockShopSettings,
  pricingConfig: mockPricing,
  printRules: mockRules,
  razorpayConfig: mockRazorpayConfig,
  whatsappConfig: mockWhatsAppConfig,
  lastAgentPing: '',
  autoPrintEnabled: true,
  printers: [],
  blockedPhones: [],
  coupons: [
    { code: "PRINT5", discountPercent: 5, isActive: true },
    { code: "STUDENT10", discountPercent: 10, isActive: true }
  ]
};

// Check if Vercel KV environment variables are configured
const rawUrl = (process.env.KV_REST_API_URL || "").replace(/"/g, "").trim();
const rawToken = (process.env.KV_REST_API_TOKEN || "").replace(/"/g, "").trim();
const isKVEnabled = !!rawUrl && !!rawToken;
const KV_KEY = 'krishna_print_hub_db';

async function kvExecute(command: any[]): Promise<any> {
  if (!isKVEnabled) return null;

  try {
    const res = await fetch(rawUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${rawToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(command),
      cache: 'no-store'
    });
    const data = await res.json();
    return data.result;
  } catch (err) {
    console.error("Vercel KV REST execution failed:", err);
    return null;
  }
}

async function readDb(): Promise<Schema> {
  if (isKVEnabled) {
    try {
      const result = await kvExecute(["GET", KV_KEY]);
      if (result) {
        return JSON.parse(result);
      }
      // Initialize if empty
      await writeDb(defaultSchema);
      return defaultSchema;
    } catch (err) {
      console.error("Vercel KV read failed, using default schema:", err);
      return defaultSchema;
    }
  } else {
    // Local filesystem fallback
    try {
      if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify(defaultSchema, null, 2), 'utf-8');
        return defaultSchema;
      }
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.error("Local DB read failed, using default schema:", err);
      return defaultSchema;
    }
  }
}

async function writeDb(data: Schema): Promise<void> {
  if (isKVEnabled) {
    try {
      await kvExecute(["SET", KV_KEY, JSON.stringify(data)]);
    } catch (err) {
      console.error("Vercel KV write failed:", err);
    }
  } else {
    // Local filesystem fallback
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error("Local DB write failed:", err);
    }
  }
}

export function sanitizeOrder(o: any): Order {
  if (!o || typeof o !== 'object') {
    return {
      id: `KP-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: 'Customer',
      customerPhone: '',
      fileUrl: '',
      fileName: 'document.pdf',
      fileSize: 1,
      pages: 1,
      copies: 1,
      colorMode: 'bw',
      paperSize: 'A4',
      duplex: 'simplex',
      orientation: 'portrait',
      amount: 0,
      status: 'pending',
      paymentId: '',
      source: 'web',
      assignedPrinterId: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  return {
    id: typeof o.id === 'string' && o.id ? o.id : `KP-${Math.floor(1000 + Math.random() * 9000)}`,
    customerName: typeof o.customerName === 'string' ? o.customerName : (typeof o.customerName === 'object' ? 'Customer' : String(o.customerName || 'Customer')),
    customerPhone: typeof o.customerPhone === 'string' ? o.customerPhone : (typeof o.customerPhone === 'object' ? '' : String(o.customerPhone || '')),
    fileUrl: typeof o.fileUrl === 'string' ? o.fileUrl : '',
    fileName: typeof o.fileName === 'string' ? o.fileName : (typeof o.fileName === 'object' ? 'document.pdf' : String(o.fileName || 'document.pdf')),
    fileSize: typeof o.fileSize === 'number' && !isNaN(o.fileSize) ? o.fileSize : Number(o.fileSize) || 1,
    pages: typeof o.pages === 'number' && !isNaN(o.pages) ? o.pages : parseInt(String(o.pages)) || 1,
    copies: typeof o.copies === 'number' && !isNaN(o.copies) ? o.copies : parseInt(String(o.copies)) || 1,
    colorMode: o.colorMode === 'color' ? 'color' : 'bw',
    paperSize: typeof o.paperSize === 'string' && o.paperSize ? o.paperSize : 'A4',
    duplex: o.duplex === 'duplex' ? 'duplex' : 'simplex',
    orientation: o.orientation === 'landscape' ? 'landscape' : 'portrait',
    amount: typeof o.amount === 'number' && !isNaN(o.amount) ? o.amount : Number(o.amount) || 0,
    status: typeof o.status === 'string' && o.status ? o.status : 'pending',
    paymentId: typeof o.paymentId === 'string' ? o.paymentId : '',
    source: o.source === 'whatsapp' ? 'whatsapp' : 'web',
    assignedPrinterId: typeof o.assignedPrinterId === 'string' ? o.assignedPrinterId : '',
    createdAt: typeof o.createdAt === 'string' && o.createdAt ? o.createdAt : new Date().toISOString(),
    updatedAt: typeof o.updatedAt === 'string' && o.updatedAt ? o.updatedAt : new Date().toISOString()
  };
}

export function sanitizePrinter(p: any, idx: number = 0) {
  if (!p || typeof p !== 'object') {
    return {
      id: `printer-${idx}`,
      name: `Printer ${idx + 1}`,
      brand: 'Standard',
      model: 'Laser/Inkjet',
      status: 'idle',
      connectionType: 'USB',
      ipAddress: '',
      supportsColor: false,
      supportsA3: false,
      isHighSpeed: false,
      isDefault: idx === 0,
      isDefaultBW: idx === 0,
      isDefaultColor: false,
      inkLevels: { black: 100, cyan: 100, magenta: 100, yellow: 100 },
      paperLevels: { A4: 500, A3: 250 }
    };
  }

  const pName = typeof p.name === 'string' && p.name ? p.name : (typeof p.Name === 'string' && p.Name ? p.Name : `Printer ${idx + 1}`);
  const pBrand = typeof p.brand === 'string' ? p.brand : 'Standard';
  const pModel = typeof p.model === 'string' ? p.model : 'Spooler Device';

  return {
    id: typeof p.id === 'string' && p.id ? p.id : `printer-${idx}`,
    name: pName,
    brand: pBrand,
    model: pModel,
    status: p.status === 'idle' || p.status === 'printing' ? p.status : (p.PrinterStatus?.toLowerCase() === 'idle' ? 'idle' : (p.status || 'offline')),
    connectionType: typeof p.connectionType === 'string' ? p.connectionType : 'USB',
    ipAddress: typeof p.ipAddress === 'string' ? p.ipAddress : '',
    supportsColor: !!p.supportsColor,
    supportsA3: !!p.supportsA3,
    isHighSpeed: !!p.isHighSpeed,
    isDefault: !!p.isDefault,
    isDefaultBW: !!p.isDefaultBW,
    isDefaultColor: !!p.isDefaultColor,
    inkLevels: {
      black: typeof p.inkLevels?.black === 'number' ? p.inkLevels.black : (typeof p.InkLevel === 'number' ? p.InkLevel : (typeof p.Toner === 'number' ? p.Toner : 100)),
      cyan: typeof p.inkLevels?.cyan === 'number' ? p.inkLevels.cyan : 100,
      magenta: typeof p.inkLevels?.magenta === 'number' ? p.inkLevels.magenta : 100,
      yellow: typeof p.inkLevels?.yellow === 'number' ? p.inkLevels.yellow : 100
    },
    paperLevels: {
      A4: typeof p.paperLevels?.A4 === 'number' ? p.paperLevels.A4 : (typeof p.PaperLevel === 'number' ? p.PaperLevel : 500),
      A3: typeof p.paperLevels?.A3 === 'number' ? p.paperLevels.A3 : 250
    }
  };
}

export const db = {
  getOrders: async (): Promise<Order[]> => {
    const data = await readDb();
    const rawOrders = data.orders || [];
    return rawOrders.map(sanitizeOrder);
  },
  
  saveOrder: async (order: Order): Promise<Order> => {
    const cleanOrder = sanitizeOrder(order);
    const data = await readDb();
    if (!data.orders) data.orders = [];
    const index = data.orders.findIndex(o => o.id === cleanOrder.id);
    if (index >= 0) {
      data.orders[index] = { ...data.orders[index], ...cleanOrder, updatedAt: new Date().toISOString() };
    } else {
      data.orders.unshift(cleanOrder);
    }
    await writeDb(data);
    return cleanOrder;
  },

  updateOrderStatus: async (id: string, status: Order['status']): Promise<Order | null> => {
    const data = await readDb();
    if (!data.orders) data.orders = [];
    const order = data.orders.find(o => o.id === id);
    if (order) {
      order.status = status;
      order.updatedAt = new Date().toISOString();
      await writeDb(data);
      return order;
    }
    return null;
  },

  deleteOrder: async (id: string): Promise<boolean> => {
    const data = await readDb();
    if (!data.orders) data.orders = [];
    const filtered = data.orders.filter(o => o.id !== id);
    if (filtered.length !== data.orders.length) {
      data.orders = filtered;
      await writeDb(data);
      return true;
    }
    return false;
  },

  getShopSettings: async (): Promise<ShopSettings> => {
    const data = await readDb();
    return data.shopSettings;
  },

  saveShopSettings: async (settings: ShopSettings): Promise<ShopSettings> => {
    const data = await readDb();
    data.shopSettings = settings;
    await writeDb(data);
    return settings;
  },

  getPricing: async (): Promise<Pricing> => {
    const data = await readDb();
    return data.pricingConfig;
  },

  savePricing: async (pricing: Pricing): Promise<Pricing> => {
    const data = await readDb();
    data.pricingConfig = pricing;
    await writeDb(data);
    return pricing;
  },

  getRules: async (): Promise<PrintRules> => {
    const data = await readDb();
    return data.printRules;
  },

  saveRules: async (rules: PrintRules): Promise<PrintRules> => {
    const data = await readDb();
    data.printRules = rules;
    await writeDb(data);
    return rules;
  },

  getRazorpayConfig: async (): Promise<RazorpayConfig> => {
    const data = await readDb();
    
    // Fallback to environment variables if database config is empty
    if (!data.razorpayConfig || !data.razorpayConfig.keyId) {
      const envKeyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
      const envKeySecret = process.env.RAZORPAY_KEY_SECRET || "";
      if (envKeyId && envKeySecret) {
        return {
          keyId: envKeyId,
          keySecret: envKeySecret,
          webhookSecret: "",
          isConfigured: true,
          testMode: true
        };
      }
    }
    return data.razorpayConfig || mockRazorpayConfig;
  },

  saveRazorpayConfig: async (config: RazorpayConfig): Promise<RazorpayConfig> => {
    const data = await readDb();
    data.razorpayConfig = config;
    await writeDb(data);
    return config;
  },

  getWhatsAppConfig: async (): Promise<WhatsAppConfig> => {
    const data = await readDb();
    return data.whatsappConfig;
  },

  saveWhatsAppConfig: async (config: WhatsAppConfig): Promise<WhatsAppConfig> => {
    const data = await readDb();
    data.whatsappConfig = config;
    await writeDb(data);
    return config;
  },

  getPrinters: async (): Promise<any[]> => {
    const data = await readDb();
    const raw = data.printers || [];
    return raw.map((p, i) => sanitizePrinter(p, i));
  },

  savePrinters: async (printers: any[]): Promise<any[]> => {
    const clean = (printers || []).map((p, i) => sanitizePrinter(p, i));
    const data = await readDb();
    data.printers = clean;
    await writeDb(data);
    return clean;
  },

  getAutoPrintEnabled: async (): Promise<boolean> => {
    const data = await readDb();
    const enabled = data.autoPrintEnabled;
    return enabled !== false;
  },

  saveAutoPrintEnabled: async (enabled: boolean): Promise<boolean> => {
    const data = await readDb();
    data.autoPrintEnabled = enabled;
    await writeDb(data);
    return enabled;
  },

  updateAgentPing: async (): Promise<string> => {
    const data = await readDb();
    const ping = new Date().toISOString();
    data.lastAgentPing = ping;
    await writeDb(data);
    return ping;
  },

  getLastAgentPing: async (): Promise<string> => {
    const data = await readDb();
    return data.lastAgentPing || "";
  },

  getBlockedPhones: async (): Promise<string[]> => {
    const data = await readDb();
    return data.blockedPhones || [];
  },

  toggleBlockedPhone: async (phone: string): Promise<boolean> => {
    const data = await readDb();
    if (!data.blockedPhones) data.blockedPhones = [];
    const idx = data.blockedPhones.indexOf(phone);
    let isBlocked = false;
    if (idx >= 0) {
      data.blockedPhones.splice(idx, 1);
    } else {
      data.blockedPhones.push(phone);
      isBlocked = true;
    }
    await writeDb(data);
    return isBlocked;
  },

  getCoupons: async (): Promise<any[]> => {
    const data = await readDb();
    return data.coupons || [];
  },

  saveCoupons: async (coupons: any[]): Promise<any[]> => {
    const data = await readDb();
    data.coupons = coupons;
    await writeDb(data);
    return coupons;
  },

  kvGet: async (key: string): Promise<any> => {
    if (isKVEnabled) {
      const result = await kvExecute(["GET", key]);
      return result ? JSON.parse(result) : null;
    } else {
      const data = await readDb();
      return (data as any)[key] || null;
    }
  },

  kvSet: async (key: string, value: any): Promise<void> => {
    if (isKVEnabled) {
      await kvExecute(["SET", key, JSON.stringify(value)]);
    } else {
      const data = await readDb();
      (data as any)[key] = value;
      await writeDb(data);
    }
  }
};
