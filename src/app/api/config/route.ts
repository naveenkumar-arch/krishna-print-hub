import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const shopSettings = await db.getShopSettings();
    const pricingConfig = await db.getPricing();
    const printRules = await db.getRules();
    const razorpayConfig = await db.getRazorpayConfig();
    const whatsappConfig = await db.getWhatsAppConfig();
    const printers = await db.getPrinters();
    const autoPrintEnabled = await db.getAutoPrintEnabled();
    const lastAgentPing = await db.getLastAgentPing();
    const coupons = await db.getCoupons();
    const agentVersion = await db.kvGet('agentVersion') || 'v1.0.0';
    const agentPcName = await db.kvGet('agentPcName') || 'COUNTER-PC';
    const agentOsVersion = await db.kvGet('agentOsVersion') || 'Windows 10/11';

    // Mask key secret for security
    const maskedRazorpay = {
      ...razorpayConfig,
      keySecret: razorpayConfig.keySecret ? "••••••••••••••••" : ""
    };

    const response = NextResponse.json({
      shopSettings,
      pricingConfig,
      printRules,
      razorpayConfig: maskedRazorpay,
      whatsappConfig,
      printers,
      autoPrintEnabled,
      lastAgentPing,
      coupons,
      agentVersion,
      agentPcName,
      agentOsVersion
    });

    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function verifyAgentToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  const token = authHeader.replace('Bearer ', '').trim();
  const secureKey = await db.kvGet('agentConnectionKey') || 'KP-DEMO-TOKEN-9988';
  return token === secureKey;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (body.unpairAgent) {
      await db.kvSet('agentVersion', '');
      await db.kvSet('agentPcName', '');
      await db.kvSet('agentOsVersion', '');
      await db.kvSet('lastAgentPing', '');
      await db.kvSet('agentConnectionKey', 'KP-DEMO-TOKEN-9988');
      await db.savePrinters([]);
      return NextResponse.json({ success: true });
    }
    
    if (body.shopSettings) {
      await db.saveShopSettings(body.shopSettings);
    }
    if (body.pricingConfig) {
      await db.savePricing(body.pricingConfig);
    }
    if (body.printRules) {
      await db.saveRules(body.printRules);
    }
    if (body.razorpayConfig) {
      // If client sent masked password, keep existing secret
      const current = await db.getRazorpayConfig();
      let secret = body.razorpayConfig.keySecret;
      if (secret === "••••••••••••••••" || !secret) {
        secret = current.keySecret;
      }
      await db.saveRazorpayConfig({
        ...body.razorpayConfig,
        keySecret: secret
      });
    }
    if (body.whatsappConfig) {
      await db.saveWhatsAppConfig(body.whatsappConfig);
    }
    if (body.printers && !body.lastAgentPing) {
      await db.savePrinters(body.printers);
    }
    if (body.agentConnectionKey) {
      await db.kvSet('agentConnectionKey', body.agentConnectionKey);
    }
    if (body.lastAgentPing) {
      const isAuthorized = await verifyAgentToken(request);
      if (!isAuthorized) {
        return NextResponse.json({ error: "Unauthorized agent connection key" }, { status: 401 });
      }

      await db.updateAgentPing();
      if (body.agentVersion) await db.kvSet('agentVersion', body.agentVersion);
      if (body.pcName) await db.kvSet('agentPcName', body.pcName);
      if (body.osVersion) await db.kvSet('agentOsVersion', body.osVersion);

      if (body.printers) {
        const dbPrinters = await db.getPrinters();
        const merged = dbPrinters.map(p => {
          const agentMatch = body.printers.find((ap: any) => ap.Name.toLowerCase() === p.name.toLowerCase());
          if (agentMatch) {
            return {
              ...p,
              status: agentMatch.PrinterStatus,
              inkLevels: {
                ...p.inkLevels,
                black: agentMatch.Toner
              }
            };
          }
          return p;
        });

        // Register new local printers auto-detected by Java Agent
        body.printers.forEach((ap: any) => {
          const exists = dbPrinters.some(p => p.name.toLowerCase() === ap.Name.toLowerCase());
          if (!exists) {
            merged.push({
              id: `custom-${Math.random()}`,
              name: ap.Name,
              brand: "Auto Detected",
              model: "Standard USB Driver",
              status: ap.PrinterStatus,
              connectionType: 'USB',
              inkLevels: { black: ap.Toner },
              paperLevels: { A4: 500 },
              isDefault: merged.length === 0,
              supportsColor: false,
              supportsA3: false,
              isHighSpeed: false
            });
          }
        });

        await db.savePrinters(merged);
      }
    }
    if (body.hasOwnProperty('autoPrintEnabled')) {
      await db.saveAutoPrintEnabled(body.autoPrintEnabled);
    }
    if (body.coupons) {
      await db.saveCoupons(body.coupons);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
