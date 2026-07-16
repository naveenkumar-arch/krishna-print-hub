import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Clean name to prevent path injection
    const safeName = Date.now() + "_" + file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const filePath = path.join(uploadsDir, safeName);
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({ 
      success: true, 
      fileUrl: `/uploads/${safeName}` 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
