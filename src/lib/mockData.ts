import {
  Order, Customer, Printer, Pricing, PrintRules,
  RazorpayConfig, WhatsAppConfig, ShopSettings, Ticket
} from './types';

export const mockShopSettings: ShopSettings = {
  name: "Krishna Students Print Hub",
  tagline: "Fast & Reliable Printing. Upload & Pay Online, We Print Automatically!",
  address: "No.12, College Road, Near SRM Valliammai College, Chengalpattu, Tamil Nadu - 603203",
  phone: "+91 98765 11111",
  email: "srm.krishnaprinthub@gmail.com",
  workingHoursText: "8:00 AM - 9:00 PM",
  googleMapsUrl: "https://maps.google.com",
  gstNumber: "33AAAAA1111A1Z1"
};

export const mockPricing: Pricing = {
  A4_BW: 2.00,
  A4_Color: 10.00,
  A3_BW: 5.00,
  A3_Color: 20.00,
  Letter_BW: 2.50,
  Legal_BW: 3.00
};

export const mockRules: PrintRules = {
  maxUploadSizeMB: 100,
  maxCopies: 50,
  maxPages: 500,
  autoApprovalPageLimit: 50, // if an order is more than 50 pages total, it needs owner approval
  allowedFileTypes: [
    'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 
    'jpg', 'png', 'jpeg', 'webp', 'bmp', 'tiff', 'tif', 'gif', 
    'txt', 'csv', 'md', 'log'
  ],
  allowedPaperSizes: ['A4', 'A3', 'Letter', 'Legal'],
  allowedColorModes: ['bw', 'color'],
  allowDuplex: true,
  workingHoursStart: "08:00",
  workingHoursEnd: "21:00"
};

export const mockRazorpayConfig: RazorpayConfig = {
  keyId: "", // Empty to simulate initial state
  keySecret: "",
  webhookSecret: "",
  isConfigured: false,
  testMode: true
};

export const mockWhatsAppConfig: WhatsAppConfig = {
  accessToken: "", // Empty to simulate initial state
  phoneNumberId: "",
  businessAccountId: "",
  verifyToken: "krishna_verify_token_123",
  isConfigured: false
};

export const mockPrinters: Printer[] = [];

export const mockCustomers: Customer[] = [];

export const mockOrders: Order[] = [];

export const mockTickets: Ticket[] = [];

export const mockAnalytics = {
  todayRevenue: 0,
  todayOrders: 0,
  pendingApproval: 0,
  completedOrders: 0,
  activePrinters: 2,
  weeklyStats: [
    { date: "Jul 02", revenue: 0, orders: 0 },
    { date: "Jul 03", revenue: 0, orders: 0 },
    { date: "Jul 04", revenue: 0, orders: 0 },
    { date: "Jul 05", revenue: 0, orders: 0 },
    { date: "Jul 06", revenue: 0, orders: 0 },
    { date: "Jul 07", revenue: 0, orders: 0 },
    { date: "Jul 08", revenue: 0, orders: 0 }
  ],
  paperUsage: [
    { name: "A4 Black & White", value: 100 },
    { name: "A4 Color", value: 0 },
    { name: "Letter / Legal B&W", value: 0 }
  ]
};
