# Krishna Students Print Hub - Conversation Summary & Architecture

This document preserves the complete setup guide, architectural decisions, and changes made during our pair-programming session. It is saved directly in your project workspace so you can reference it at any time.

---

## 💻 1. The Local Shop PC Setup (How to deliver it)

The shop owner does not need any development tools (like VS Code or GitHub) on their computer. They only need:
1. **Node.js** (Installed once from [nodejs.org](https://nodejs.org))
2. Your packaged release files.

### How the owner runs it daily:
1. Extract the folder onto the shop PC.
2. **Double-click `start-shop-system.bat`**.
3. It will open the console window for the **Local Print Agent** which polls the cloud database and prints files.

---

## 🌐 2. Cloud Server (Vercel) vs. Local Printer (How it connects)

### How does a cloud website talk to a physical USB printer?
Web browsers cannot access physical computer hardware (like USB ports) directly due to built-in security blocks. 

To bridge this gap:
1. The **Vercel Cloud Server** stores pending print orders in a persistent **Vercel KV (Redis)** cloud database.
2. The **Local Print Agent** running on the shop PC periodically reaches out to Vercel via secure HTTPS requests (`/api/orders?agent=true`).
3. If it spots a paid order, it downloads the PDF file, generates a plain text receipt file, and executes a background PowerShell command:
   `Start-Process -FilePath "receipt.txt" -Verb Print`
4. **Windows OS** receives this command and forwards the document pages down the USB or WiFi connection to the physical printer.

---

## 💰 3. Cash Payment & Counter Approval Queue

To prevent unpaid prints from wasting paper and ink, the print flow works as follows:

```
Student uploads PDF
        ↓
Chooses "Cash at Counter"
        ↓
Order created as "WAITING_CASH" (held in cloud)
        ↓
Print Agent ignores the order (doesn't print)
        ↓
Student pays cash at shop counter
        ↓
Shop owner clicks "Collect Cash" in Admin Panel
        ↓
Order status changes to "QUEUED" (released)
        ↓
Print Agent downloads and prints automatically
```

* **Manually approving unpaid orders**: If a student starts an online payment but fails, the order status sits as `PENDING`. If they walk up and hand you cash, the shop owner can click **"Collect Cash"** on the dashboard. This immediately overrides the status to `QUEUED` and triggers the printer!

---

## 🖨️ 4. Dynamic Printer Targeting

### How does the system know which physical printer to use?
1. Open the **Admin Printers Dashboard** (`/admin/printers`).
2. Click **"+ Add Printer"** and type the printer name **exactly** as it is named in your Windows Control Panel (e.g. `HP LaserJet Pro M404dn`).
3. Click **"Set Default"** on that printer card.
4. The local print agent script automatically pulls this targeted printer name. Right before printing, it silently runs a command to select that printer dynamically:
   `Set-DefaultPrinter -Name "HP LaserJet Pro M404dn"`
5. This forces Windows to route that specific spool file to that physical device tray.

---

## ⚡ 5. What Changes & New Features Did We Implement?

We successfully implemented several powerful administrative features and fixed the data-loss issues:

### 1. 👥 Dynamic Customers List & Blocklist
* **Dynamic Analytics:** The customer management panel computes metrics (spent amount, frequency, latest dates) dynamically from the database.
* **Student Blocklist:** Admins can click a shield icon to block any customer. The POST upload API immediately rejects document uploads from blocked phone numbers.

### 2. ✏️ Admin Job Editor Modal
* **Configuration Modal:** Admins can edit details (paper size, duplex mode, color mode, copies, pages) of pending and waiting-approval jobs via a popup modal in the Admin Dashboard.
* **On-the-Fly Recalculation:** The server-side code automatically recalculates the order amount using active pricing structures when changes are saved.

### 3. 🏷️ Discount Coupons
* **Promotions Dashboard:** Added a `/admin/coupons` config manager to create codes, toggle active status, and track campaigns.
* **Discount System:** Integrated validation in the Customer Portal (`/upload`) and reinforced server-side discount checks during checkout.

### 4. ⚙️ Print Mode Toggle (Self-Print vs. Assisted-Print)
* **Print Settings:** Added a radio selector in `/admin/rules` to toggle modes.
* **Assisted Print Queue:** When set to *Assisted*, all online paid orders are held in the dashboard as `WAITING_APPROVAL` so that the admin can verify/edit print options before manual release.

### 5. 🗑️ Manual Admin Delete Option
* **Complete Override:** Added a manual **Delete Order** button (red trash icon) on the orders page. This allows the shop owner to permanently clear history, completed, or failed orders from the database.

---

## 🔍 6. How We Solved Serverless Ephemeral Data Loss (Flickering)

Previously, Vercel multi-instance server recycles caused orders to appear and disappear because the database was written to `/tmp/db.json` which is ephemeral.

### 💡 The Permanent Fix: Vercel KV (Redis)
We replaced the local JSON file database with a persistent **Vercel KV (Upstash Redis)** cloud database:
* All backend API endpoints and DB helper operations were refactored to be **asynchronous** and use standard REST HTTPS command pipelines.
* **Hybrid Storage:** If the app detects `KV_REST_API_URL` and `KV_REST_API_TOKEN` environment variables (set automatically when you link Upstash on Vercel), it reads/writes from the persistent Redis cloud. If running locally for development, it automatically falls back to your local `db.json` file.
* **No Notepad Race Conditions:** We increased the spool ticket deletion timeout in `print-agent.js` from 3 seconds to **20 seconds** to give Windows Notepad plenty of time to read and print the file before cleanup.

---

## 🚦 How to Redeploy and Maintain the System
1. Complete the **Upstash integration** on your Vercel project's Storage page.
2. Upload the updated files from your local folder `C:\Users\vvija\krishna-print-hub` to GitHub (or push via Git if installed).
3. Vercel will automatically redeploy the website, and it will be permanently persistent and synchronized!
