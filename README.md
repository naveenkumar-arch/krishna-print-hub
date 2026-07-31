# Krishna Students Print Hub

> Single-shop Production-grade Automatic Printing Management System.
> Built using Next.js, React, Tailwind CSS, Lucide React, and Recharts.

---

## 🚀 Quick Start

To run the application locally on your computer:

```bash
# 1. Navigate to the project directory
cd C:\Users\vvija\.antigravity-ide\krishna-print-hub

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev

# 4. Open your browser to:
# http://localhost:3000
```

---

## 🔑 Login Credentials (Owner Console)

To access the administrative panel:
- Open: **`http://localhost:3000/admin/login`**
- Email: **`admin@nksmartprint.com`**
- Password: **`admin123`**

---

## 📁 Pages & Routes Reference

### 🌐 Customer Web Portal (No Auth)
| Route | Description |
|---|---|
| `/` | **Home Landing Page** (matches reference design layout: upload panel on left, WhatsApp QR panel on right) |
| `/upload` | Dedicated file configurations, paper settings, orientation, dynamic price calculations |
| `/track` | Real-time order progress tracking by phone or Order ID |
| `/pricing` | Transparency print price sheets |
| `/how-it-works` | Description of the 4-step workflow |
| `/contact` | Store location, maps link, contact details |
| `/faq` | Helpful student print center questions |
| `/tools` | **Free PDF Tools Suite** (16 browser-based PDF utilities: Merge, Split, Watermark, Compress, etc.) |
| `/tools/[tool]` | Dedicated workspace for individual PDF tools (e.g. `/tools/merge-pdf`, `/tools/split-pdf`) |
| `/privacy` | Privacy guidelines |
| `/terms` | Print terms of service |

### 🔐 Shop Owner Console (Protected)
| Route | Description |
|---|---|
| `/admin/login` | Owner authentication portal |
| `/admin` | Store overview dashboard stats and charts |
| `/admin/orders` | Full order management (Approve/Reject waiting prints, refund, reprint) |
| `/admin/queue` | Live print spooler queue synced with WebSocket |
| `/admin/customers` | Customer blocklist toggle and profiles |
| `/admin/printers` | Local Windows printer spool links, ink/paper counts, auto-print toggles |
| `/admin/pricing` | Set per-page printing rates and minimum order values |
| `/admin/rules` | Max file bounds, allowed formats, page manual-check limits |
| `/admin/analytics` | Revenue and printing stats graphs |
| `/admin/settings/shop` | General store description branding settings |
| `/admin/settings/razorpay` | Razorpay credential configurations (Key ID, Webhook signatures) |
| `/admin/settings/whatsapp` | WhatsApp Cloud API configuration tokens |

---

## 🎨 UI Theme Specifications

- **Background:** Clean White / Light Gray (`#FFFFFF` and `#F8FAFC`)
- **Primary Accent:** Purple (`#7C3AED` - Violet-600)
- **Status Green:** WhatsApp and Online indicators (`#16A34A`)
- Matching spacing, layout cards, shadow bounds, and components from your approved branding guidelines.

---

## 📦 Deploying to Vercel

### Step 1: Open Command Prompt as Administrator
Press `Windows Key` → Type `cmd` → Right-click → **"Run as administrator"**

### Step 2: Navigate and Install Vercel CLI
```cmd
cd C:\Users\vvija\.antigravity-ide\krishna-print-hub
npm install -g vercel
```

### Step 3: Run Deployment Link
```cmd
vercel
```
Select default configuration options. A production live link will be printed instantly!
For future code updates, simply run `npx vercel --prod` to deploy immediately.
