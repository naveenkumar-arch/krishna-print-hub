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

export const db = {
  getOrders: async (): Promise<Order[]> => {
    const data = await readDb();
    return data.orders || [];
  },
  
  saveOrder: async (order: Order): Promise<Order> => {
    const data = await readDb();
    if (!data.orders) data.orders = [];
    const index = data.orders.findIndex(o => o.id === order.id);
    if (index >= 0) {
      data.orders[index] = { ...data.orders[index], ...order, updatedAt: new Date().toISOString() };
    } else {
      data.orders.unshift(order);
    }
    await writeDb(data);
    return order;
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
    return data.printers || [];
  },

  savePrinters: async (printers: any[]): Promise<any[]> => {
    const data = await readDb();
    data.printers = printers;
    await writeDb(data);
    return printers;
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
