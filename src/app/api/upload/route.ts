import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// Configure Cloudinary from env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const safeFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    // ─── Provider 1: Local Filesystem (works on localhost only) ───
    const isLocalEnv = process.env.NODE_ENV === 'development';
    if (isLocalEnv) {
      try {
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const localFilePath = path.join(uploadsDir, safeFileName);
        fs.writeFileSync(localFilePath, fileBuffer);
        const fileUrl = `/uploads/${safeFileName}`;
        console.log('[Upload] Saved locally:', fileUrl);
        return NextResponse.json({ success: true, fileUrl });
      } catch (err) {
        console.warn('[Upload] Local filesystem failed:', err);
      }
    }

    // ─── Provider 2: Cloudinary (Primary for Vercel) ───
    const hasCloudinary =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET;

    if (hasCloudinary) {
      try {
        console.log('[Upload] Uploading to Cloudinary...');
        const uploadResult = await new Promise<any>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'krishna-print-hub',
              resource_type: 'raw', // supports PDF, DOCX, PPTX, etc.
              public_id: safeFileName.replace(/\.[^/.]+$/, ''), // strip extension
              use_filename: true,
              unique_filename: true,
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(fileBuffer);
        });

        const fileUrl = uploadResult.secure_url;
        console.log('[Upload] Cloudinary success:', fileUrl);
        return NextResponse.json({ success: true, fileUrl });
      } catch (err) {
        console.warn('[Upload] Cloudinary failed:', err);
      }
    } else {
      console.warn('[Upload] Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in env.');
    }

    // ─── Provider 3: Catbox.moe fallback ───
    try {
      console.log('[Upload] Trying Catbox.moe...');
      const catboxFormData = new FormData();
      catboxFormData.append('reqtype', 'fileupload');
      catboxFormData.append('fileToUpload', new Blob([fileBuffer], { type: file.type }), file.name);

      const res = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: catboxFormData,
        signal: AbortSignal.timeout(15000),
      });

      if (res.ok) {
        const fileUrl = (await res.text()).trim();
        if (fileUrl.startsWith('https://files.catbox.moe/')) {
          console.log('[Upload] Catbox.moe success:', fileUrl);
          return NextResponse.json({ success: true, fileUrl });
        }
      }
      console.warn('[Upload] Catbox.moe failed, status:', res.status);
    } catch (err) {
      console.warn('[Upload] Catbox.moe error:', err);
    }

    // ─── Provider 4: Uguu.se fallback ───
    try {
      console.log('[Upload] Trying Uguu.se...');
      const uguuFormData = new FormData();
      uguuFormData.append('files[]', new Blob([fileBuffer], { type: file.type }), file.name);

      const res = await fetch('https://uguu.se/upload', {
        method: 'POST',
        body: uguuFormData,
        signal: AbortSignal.timeout(15000),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.files?.[0]?.url) {
          const fileUrl = data.files[0].url;
          console.log('[Upload] Uguu.se success:', fileUrl);
          return NextResponse.json({ success: true, fileUrl });
        }
      }
      console.warn('[Upload] Uguu.se failed, status:', res.status);
    } catch (err) {
      console.warn('[Upload] Uguu.se error:', err);
    }

    // ─── Provider 5: 0x0.st final fallback ───
    try {
      console.log('[Upload] Trying 0x0.st...');
      const uploadFormData = new FormData();
      uploadFormData.append('file', new Blob([fileBuffer], { type: file.type }), file.name);

      const res = await fetch('https://0x0.st', {
        method: 'POST',
        body: uploadFormData,
        signal: AbortSignal.timeout(15000),
      });

      if (res.ok) {
        const fileUrl = (await res.text()).trim();
        if (fileUrl.startsWith('https://0x0.st/')) {
          console.log('[Upload] 0x0.st success:', fileUrl);
          return NextResponse.json({ success: true, fileUrl });
        }
      }
      console.warn('[Upload] 0x0.st failed, status:', res.status);
    } catch (err) {
      console.warn('[Upload] 0x0.st error:', err);
    }

    throw new Error('All cloud storage providers failed to process the request. Please try again.');
  } catch (err: any) {
    console.error('[Upload] Fatal error:', err);
    return NextResponse.json({ error: err.message || 'Cloud upload failed' }, { status: 500 });
  }
}
