import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { analyzePDFBuffer } from '@/lib/pdfAnalyzer';
import { Order, OrderStatus } from '@/lib/types';
import Razorpay from 'razorpay';

// GET verification challenge handler for Meta WhatsApp Webhook setup
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && challenge) {
    const config = await db.getWhatsAppConfig();
    const serverToken = config.verifyToken || "krishna_verify_token";

    if (token === serverToken) {
      console.log("Meta Webhook Verification Successful!");
      return new Response(challenge, { status: 200 });
    }
  }

  return new Response("Forbidden", { status: 403 });
}

// POST incoming notifications from Meta Cloud API
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Check if it's a standard WhatsApp event payload
    if (!body.object || !body.entry?.[0]?.changes?.[0]?.value) {
      return NextResponse.json({ success: true });
    }

    const value = body.entry[0].changes[0].value;
    const message = value.messages?.[0];
    const metadata = value.metadata;

    if (!message || !metadata) {
      return NextResponse.json({ success: true });
    }

    const senderPhone = message.from; // Customer WhatsApp Number
    const phoneId = metadata.phone_number_id; // Meta Phone Number ID

    const waConfig = await db.getWhatsAppConfig();
    if (!waConfig.isConfigured || !waConfig.accessToken) {
      console.error("WhatsApp credentials not configured on backend database.");
      return NextResponse.json({ success: true });
    }

    // Initialize temporary draft session key
    const sessionKey = `wa_session_${senderPhone}`;

    // 1. Process Document Message (PDF Attachment)
    if (message.type === 'document') {
      const doc = message.document;
      const mediaId = doc.id;
      const fileName = doc.filename || "whatsapp_doc.pdf";

      // Query Meta Graph API for media details
      const mediaUrl = await fetchMetaMediaUrl(mediaId, waConfig.accessToken);
      if (mediaUrl) {
        // Download document binary buffer
        const buffer = await downloadMetaMediaBuffer(mediaUrl, waConfig.accessToken);
        
        // Run AI Document Analysis (Page count, blank pages, layout checks)
        const analysis = analyzePDFBuffer(buffer);

        // Save session draft details
        const draft = {
          fileName,
          pages: analysis.totalPages,
          blankPages: analysis.blankPages,
          orientation: analysis.orientation === 'landscape' ? 'landscape' : 'portrait',
          step: 'colorMode'
        };
        await db.kvSet(sessionKey, draft);

        // Reply to user requesting color options
        await sendWhatsAppReply(
          phoneId, 
          senderPhone, 
          `We received your file: *${fileName}*.\n` +
          `· Detected Pages: *${analysis.totalPages}*\n` +
          `· Blank Pages Excluded: *${analysis.blankPages}*\n\n` +
          `Reply with *1* for *Black & White* or *2* for *Color Printing*.`,
          waConfig.accessToken
        );
      }
    } 
    // 2. Process Text Option Selections
    else if (message.type === 'text') {
      const textVal = message.text.body.trim().toLowerCase();
      const draft = await db.kvGet(sessionKey);

      if (draft && draft.step) {
        if (draft.step === 'colorMode') {
          const mode = (textVal === '2' || textVal.includes('color')) ? 'color' : 'bw';
          draft.colorMode = mode;
          draft.step = 'duplex';
          await db.kvSet(sessionKey, draft);

          await sendWhatsAppReply(
            phoneId,
            senderPhone,
            `Color mode set: *${mode === 'color' ? 'Color' : 'B&W'}*.\n\n` +
            `Reply with *1* for *Single-Sided* or *2* for *Double-Sided (Duplex)*.`,
            waConfig.accessToken
          );
        } 
        else if (draft.step === 'duplex') {
          const duplex = (textVal === '2' || textVal.includes('double')) ? 'duplex' : 'simplex';
          draft.duplex = duplex;
          draft.step = 'complete';

          // Load pricing rates to calculate final amount
          const pricing = await db.getPricing();
          let perPagePrice = pricing.A4_BW;
          if (draft.colorMode === 'color') {
            perPagePrice = pricing.A4_Color;
          }
          
          const rawAmount = perPagePrice * (draft.pages - draft.blankPages);
          const finalAmount = Number(Math.max(1, rawAmount).toFixed(2));

          const orderId = "KP" + Math.floor(100000 + Math.random() * 900000);

          // Generate payment checkout simulator or Razorpay link
          const origin = `https://${request.headers.get('host')}`;
          const paymentLink = `${origin}/track?id=${orderId}&paySimulate=true`;

          const newOrder: Order = {
            id: orderId,
            customerName: "WhatsApp Guest",
            customerPhone: senderPhone,
            fileName: draft.fileName,
            fileSize: 1.5,
            pages: draft.pages,
            copies: 1,
            paperSize: 'A4',
            colorMode: draft.colorMode,
            duplex: draft.duplex,
            orientation: draft.orientation,
            amount: finalAmount,
            status: 'pending',
            source: 'whatsapp',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            pickupCode: "KP" + Math.floor(1000 + Math.random() * 9000)
          };

          // Save final order structure to persistent cloud
          await db.saveOrder(newOrder);

          // Clear draft session
          await db.kvSet(sessionKey, null);

          await sendWhatsAppReply(
            phoneId,
            senderPhone,
            `Order registered: *#${orderId}*.\n` +
            `· Total Cost: *₹${finalAmount}*\n\n` +
            `Please click this link to pay securely and dispatch to our counter printer:\n${paymentLink}`,
            waConfig.accessToken
          );
        }
      } else {
        // Welcome fallback instruction message
        await sendWhatsAppReply(
          phoneId,
          senderPhone,
          `Welcome to *Krishna Students Print Hub*! 🖨️\n\n` +
          `To print your document instantly, just attach and send your *PDF document* here. Our automated chatbot will guide you.`,
          waConfig.accessToken
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("WhatsApp webhook api processing error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Meta Graph API attachment meta query helper
async function fetchMetaMediaUrl(mediaId: string, token: string): Promise<string | null> {
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    return data.url || null;
  } catch (e) {
    return null;
  }
}

// Meta Graph API document attachment binary downloader
async function downloadMetaMediaBuffer(url: string, token: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Meta Graph API outbound messaging sender
async function sendWhatsAppReply(phoneId: string, toPhone: string, textMessage: string, token: string) {
  try {
    await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toPhone,
        type: 'text',
        text: { body: textMessage }
      })
    });
  } catch (e) {
    console.error("Outbound WhatsApp reply delivery failed:", e);
  }
}
