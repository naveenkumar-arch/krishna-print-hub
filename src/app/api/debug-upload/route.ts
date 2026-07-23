import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  const configured = !!(cloudName && apiKey && apiSecret);

  let pingResult: any = null;
  if (configured) {
    try {
      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
      pingResult = await cloudinary.api.ping();
    } catch (err: any) {
      pingResult = { error: err.message || String(err) };
    }
  }

  return NextResponse.json({
    env: {
      CLOUDINARY_CLOUD_NAME: cloudName ? `set (${cloudName})` : 'MISSING',
      CLOUDINARY_API_KEY: apiKey ? `set (${apiKey?.slice(0, 6)}...)` : 'MISSING',
      CLOUDINARY_API_SECRET: apiSecret ? 'set (hidden)' : 'MISSING',
      NODE_ENV: process.env.NODE_ENV,
    },
    configured,
    cloudinaryPing: pingResult,
  });
}
