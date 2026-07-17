/**
 * Krishna Students Print Hub - Local WhatsApp Chatbot Controller
 * 
 * This controller runs on your counter PC and connects your personal/business WhatsApp 
 * to our printing portal using WhatsApp Web automation.
 * 
 * Instructions:
 * 1. Run: npm install whatsapp-web.js qrcode-terminal
 * 2. Run: node whatsapp-bot.js
 * 3. Scan the QR code printed in the terminal using your phone's WhatsApp (Linked Devices)
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const { exec } = require('child_process');
const https = require('https');

const client = new Client({
    authStrategy: new LocalAuth(),
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
    },
    puppeteer: {
        handleSIGINT: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Chat sessions database to track steps
const sessions = {};

// Helper to make API call to create order
function createOrderInBackend(orderData, callback) {
    const payload = JSON.stringify(orderData);
    
    const options = {
        hostname: 'krishna-students-print-hub.vercel.app',
        port: 443,
        path: '/api/orders',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        }
    };

    const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
            try {
                const parsed = JSON.parse(body);
                callback(null, parsed);
            } catch (e) {
                callback(e);
            }
        });
    });

    req.on('error', (e) => {
        callback(e);
    });

    req.write(payload);
    req.end();
}

// Load dynamic pricing settings
function getPricingRates() {
    let rates = { A4_BW: 2.00, A4_Color: 10.00 };
    try {
        if (fs.existsSync('db.json')) {
            const raw = fs.readFileSync('db.json', 'utf-8');
            const data = JSON.parse(raw);
            if (data.pricingConfig) {
                rates = data.pricingConfig;
            }
        }
    } catch (e) {
        // use defaults
    }
    return rates;
}

// Load dynamic rules settings
function getPrintRules() {
    let rules = { maxUploadSizeMB: 100, maxCopies: 50, maxPages: 500 };
    try {
        if (fs.existsSync('db.json')) {
            const raw = fs.readFileSync('db.json', 'utf-8');
            const data = JSON.parse(raw);
            if (data.printRules) {
                rules = data.printRules;
            }
        }
    } catch (e) {}
    return rules;
}

// Helper to upload media file to backend
function uploadFileToBackend(fileName, fileBase64, callback) {
    try {
        const fileBuffer = Buffer.from(fileBase64, 'base64');
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
        
        let mimeType = 'application/pdf';
        if (fileName.toLowerCase().endsWith('.png')) mimeType = 'image/png';
        else if (fileName.toLowerCase().endsWith('.jpg') || fileName.toLowerCase().endsWith('.jpeg')) mimeType = 'image/jpeg';
        
        const payload = Buffer.concat([
            Buffer.from(`--${boundary}\r\n`),
            Buffer.from(`Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`),
            Buffer.from(`Content-Type: ${mimeType}\r\n\r\n`),
            fileBuffer,
            Buffer.from(`\r\n--${boundary}--\r\n`)
        ]);

        const options = {
            hostname: 'krishna-students-print-hub.vercel.app',
            port: 443,
            path: '/api/upload',
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': payload.length
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    if (parsed && parsed.success && parsed.fileUrl) {
                        callback(null, parsed.fileUrl);
                    } else {
                        callback(new Error(parsed.error || 'Upload failed'));
                    }
                } catch (e) {
                    callback(e);
                }
            });
        });

        req.on('error', (e) => {
            callback(e);
        });

        req.write(payload);
        req.end();
    } catch (err) {
        callback(err);
    }
}

console.log("====================================================");
console.log("    KRISHNA STUDENTS PRINT HUB - WHATSAPP BOT       ");
console.log("====================================================");
console.log("Starting WhatsApp Web client...");

client.on('qr', (qr) => {
    console.log('\n[WhatsApp Linker] Generating high-resolution QR code webpage...');
    
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(qr)}`;
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Link WhatsApp Bot</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f0f2f5; text-align: center; padding: 50px; }
            .card { background: white; padding: 40px; border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); display: inline-block; max-width: 400px; margin-top: 20px; }
            h1 { color: #075e54; font-size: 22px; margin-bottom: 10px; }
            p { color: #667781; font-size: 14px; margin-bottom: 25px; line-height: 1.4; }
            img { border: 8px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 8px; }
            .footer { margin-top: 25px; font-size: 12px; color: #8696a0; }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>Link WhatsApp Bot</h1>
            <p>Open WhatsApp on your phone, tap <b>Menu</b> or <b>Settings</b> &rarr; <b>Linked Devices</b> &rarr; <b>Link a Device</b>, and scan this QR code.</p>
            <img src="${qrImageUrl}" alt="WhatsApp Scan QR" />
            <div class="footer">Krishna Students Print Hub · Shop Controller</div>
        </div>
    </body>
    </html>
    `;
    
    try {
        fs.writeFileSync('whatsapp-qr.html', htmlContent);
        const startCmd = process.platform === 'win32' ? 'start whatsapp-qr.html' : 'open whatsapp-qr.html';
        exec(startCmd);
        console.log('\n👉 QR code opened automatically in your web browser!');
        console.log('If it didn\'t open, double-click on "whatsapp-qr.html" in your project folder.');
    } catch (e) {
        console.log('\n[WhatsApp Linker] Scan this QR code to connect your bot:');
        qrcode.generate(qr, { small: true });
    }
});

client.on('ready', () => {
    console.log('\n🟢 WhatsApp Bot is ONLINE and connected to your phone!');
    console.log('Listening for client messages...');
});

client.on('message', async msg => {
    const chat = await msg.getChat();
    const contact = await msg.getContact();
    
    // Ignore group chats and status updates
    if (chat.isGroup || msg.from.includes('status')) {
        return;
    }

    // Ignore personal contacts (family, friends, etc. saved in address book)
    if (contact.isMyContact) {
        return;
    }

    const from = msg.from;
    const body = msg.body.trim();

    // Initialize session if not present
    if (!sessions[from]) {
        sessions[from] = { step: 'idle', file: null, pages: 1, copies: 1, type: 'bw' };
    }

    const state = sessions[from];

    // 1. Handle incoming documents
    if (msg.hasMedia) {
        try {
            const media = await msg.downloadMedia();
            if (media) {
                const rules = getPrintRules();
                const sizeMB = (media.data.length * 0.75) / (1024 * 1024);
                if (sizeMB > rules.maxUploadSizeMB) {
                    await msg.reply(`⚠️ *File Rejected:* The file size (${sizeMB.toFixed(2)} MB) exceeds the shop limit of ${rules.maxUploadSizeMB} MB. Please send a smaller file.`);
                    return;
                }

                state.file = {
                    name: media.filename || 'document.pdf',
                    data: media.data
                };
                
                // Parse PDF pages by counting occurrences of Page structures in the buffer
                let pages = 3; // Default estimate
                if (media.filename && media.filename.toLowerCase().endsWith('.pdf')) {
                    try {
                        const buffer = Buffer.from(media.data, 'base64');
                        const text = buffer.toString('utf-8');
                        const countMatch = text.match(/\/Count\s+(\d+)/);
                        if (countMatch) {
                            pages = parseInt(countMatch[1]);
                        } else {
                            const matches = text.match(/\/Type\s*\/Page\b/g);
                            pages = matches ? matches.length : 3;
                        }
                    } catch (e) {}
                } else if (media.mimetype.startsWith('image/')) {
                    pages = 1;
                }

                if (pages > rules.maxPages) {
                    await msg.reply(`⚠️ *File Rejected:* The document has ${pages} pages, which exceeds the shop limit of ${rules.maxPages} pages. Please send a smaller document.`);
                    sessions[from] = { step: 'idle', file: null, pages: 1, copies: 1, type: 'bw' };
                    return;
                }

                state.pages = pages;
                state.step = 'choose_type';

                const pricing = getPricingRates();
                const bwRate = pricing.A4_BW || 2.00;
                const colRate = pricing.A4_Color || 10.00;

                await msg.reply(`📄 *File Received:* ${state.file.name}\n📂 *Detected Pages:* ${pages}\n\n*Please reply with option number:*\n1️⃣ Black & White (₹${bwRate.toFixed(2)}/page)\n2️⃣ Color (₹${colRate.toFixed(2)}/page)`);
                return;
            }
        } catch (err) {
            await msg.reply("❌ Error downloading file attachment. Please try sending it again.");
            return;
        }
    }

    // 2. Handle Text messages
    if (state.step === 'idle') {
        await msg.reply(`👋 Welcome to *Krishna Students Print Hub* automated printing kiosk!\n\n📎 Please send/attach a *PDF document* or *Image* here to calculate pricing and print automatically.`);
    } 
    else if (state.step === 'choose_type') {
        if (body === '1') {
            state.type = 'bw';
            state.step = 'choose_copies';
            await msg.reply(`⚫ Selected: *Black & White*.\n\n*How many copies would you like?* Reply with a number (e.g. 1, 2, 5):`);
        } else if (body === '2') {
            state.type = 'color';
            state.step = 'choose_copies';
            await msg.reply(`🎨 Selected: *Color*.\n\n*How many copies would you like?* Reply with a number (e.g. 1, 2, 5):`);
        } else {
            await msg.reply(`⚠️ Invalid option. Please reply with:\n*1* for Black & White\n*2* for Color`);
        }
    } 
    else if (state.step === 'choose_copies') {
        const copies = parseInt(body);
        const rules = getPrintRules();
        if (isNaN(copies) || copies <= 0) {
            await msg.reply(`⚠️ Please reply with a valid number of copies (e.g. 1, 2):`);
        } else if (copies > rules.maxCopies) {
            await msg.reply(`⚠️ *Limit Exceeded:* The shop limits copies to a maximum of ${rules.maxCopies} copies per document. Please reply with a smaller count:`);
        } else {
            state.copies = copies;
            
            // Calculate pricing dynamically
            const pricing = getPricingRates();
            const rate = state.type === 'color' ? (pricing.A4_Color || 10.00) : (pricing.A4_BW || 2.00);
            const total = Math.round(rate * state.pages * copies);
            
            state.step = 'choose_payment';
            await msg.reply(`🧾 *Print Summary:*\n📄 Pages: ${state.pages}\n👥 Copies: ${copies}\n🎨 Mode: ${state.type === 'color' ? 'Color' : 'B&W'}\n💰 *Total Amount: ₹${total.toFixed(0)}*\n\n*Choose Payment Method:*\n1️⃣ Pay Online (GPay/UPI/Card)\n2️⃣ Pay Cash at Counter`);
        }
    }
    else if (state.step === 'choose_payment') {
        const pricing = getPricingRates();
        const rate = state.type === 'color' ? (pricing.A4_Color || 10.00) : (pricing.A4_BW || 2.00);
        const total = Math.round(rate * state.pages * state.copies);

        if (body === '1' || body === '2') {
            const isOnline = body === '1';
            if (isOnline) {
                state.step = 'paying';
            }
            
            // Send typing indicator / waiting msg
            await msg.reply("⏳ Uploading your document to the printing queue...");
            
            const proceedOrder = (uploadedUrl) => {
                createOrderInBackend({
                    customerName: contact.pushname || "WhatsApp Customer",
                    customerPhone: from,
                    fileName: state.file ? state.file.name : 'document.pdf',
                    fileUrl: uploadedUrl || '',
                    pages: state.pages,
                    copies: state.copies,
                    colorMode: state.type,
                    paperSize: 'A4',
                    source: 'whatsapp',
                    paymentMethod: isOnline ? 'online' : 'cash'
                }, async (err, result) => {
                    if (!isOnline) {
                        // Reset session to idle for cash payment
                        sessions[from] = { step: 'idle', file: null, pages: 1, copies: 1, type: 'bw' };
                    }
                    
                    if (err || !result || !result.success) {
                        if (isOnline) {
                            sessions[from] = { step: 'idle', file: null, pages: 1, copies: 1, type: 'bw' };
                        }
                        await msg.reply(`❌ Failed to register order. Please attach your document again to restart.`);
                    } else {
                        if (isOnline) {
                            const payUrl = result.paymentLinkUrl;
                            await msg.reply(`👉 Complete payment securely using this checkout link:\n${payUrl}\n\n*Once payment is done, your job will print automatically!*`);
                        } else {
                            await msg.reply(`💰 *Cash at Counter Selected!*\n\n📝 *Order Code:* ${result.order.id}\n💵 *Total Due:* ₹${total.toFixed(2)}\n\n👉 *Please pay cash at the print counter.* The shop owner will approve and release your prints once paid.`);
                        }
                    }
                });
            };
            
            if (state.file && state.file.data) {
                uploadFileToBackend(state.file.name, state.file.data, (uploadErr, fileUrl) => {
                    if (uploadErr) {
                        console.error("WhatsApp bot upload error:", uploadErr.message);
                        proceedOrder(''); // Proceed anyway without fileUrl
                    } else {
                        proceedOrder(fileUrl);
                    }
                });
            } else {
                proceedOrder('');
            }
        } 
        else {
            await msg.reply(`⚠️ Invalid option. Please reply with:\n*1* for Pay Online\n*2* for Cash at Counter`);
        }
    }
    else if (state.step === 'paying') {
        if (body.toLowerCase() === 'reset' || body.toLowerCase() === 'cancel') {
            sessions[from] = { step: 'idle', file: null, pages: 1, copies: 1, type: 'bw' };
            await msg.reply("🔄 Session reset. Please attach a new file to start printing setup.");
        } else {
            await msg.reply("⏳ Awaiting payment... You can reply with *reset* or *cancel* to restart.");
        }
    }
});

// Start the bot client
client.initialize();
