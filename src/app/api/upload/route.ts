import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // 30s timeout for large files

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const rules = await db.getRules();
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const allowedExts = rules.allowedFileTypes || ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'jpg', 'png', 'jpeg'];
    
    if (ext && allowedExts.length > 0 && !allowedExts.includes(ext)) {
      return NextResponse.json({ 
        error: `File format '.${ext}' is not permitted by store rules. Allowed extensions: ${allowedExts.map(e => e.toUpperCase()).join(', ')}` 
      }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileSizeMB = fileBuffer.length / (1024 * 1024);
    if (rules.maxUploadSizeMB && fileSizeMB > rules.maxUploadSizeMB) {
      return NextResponse.json({ 
        error: `File size exceeds the store limit of ${rules.maxUploadSizeMB} MB.` 
      }, { status: 400 });
    }

    const safeFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const mimeType = file.type || 'application/octet-stream';
    const isPDF = mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    console.log(`[Upload] File: ${file.name}, type: ${mimeType}, size: ${fileBuffer.length} bytes, isPDF: ${isPDF}`);

    // ─── Provider 1: Local Filesystem (dev only) ───
    if (process.env.NODE_ENV === 'development') {
      try {
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        fs.writeFileSync(path.join(uploadsDir, safeFileName), fileBuffer);
        const fileUrl = `/uploads/${safeFileName}`;
        console.log('[Upload] Saved locally:', fileUrl);
        return NextResponse.json({ success: true, fileUrl });
      } catch (err) {
        console.warn('[Upload] Local save failed:', err);
      }
    }

    // ─── Provider 2: Catbox.moe (Direct 200 OK public file host for PDF/DOCX) ───
    try {
      console.log('[Upload] Trying Catbox.moe for direct public file URL...');
      const catboxForm = new FormData();
      catboxForm.append('reqtype', 'fileupload');
      catboxForm.append('fileToUpload', new Blob([fileBuffer], { type: mimeType }), file.name);
      const res = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST', body: catboxForm, signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const fileUrl = (await res.text()).trim();
        if (fileUrl.startsWith('https://files.catbox.moe/')) {
          console.log('[Upload] Catbox success:', fileUrl);
          return NextResponse.json({ success: true, fileUrl });
        }
      }
    } catch (err) { console.warn('[Upload] Catbox failed:', err); }

    // ─── Provider 3: Cloudinary via base64 ───
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
      try {
        console.log('[Upload] Uploading to Cloudinary via base64...');

        const base64Data = fileBuffer.toString('base64');
        const dataUri = `data:${mimeType};base64,${base64Data}`;

        const uploadResult = await cloudinary.uploader.upload(dataUri, {
          folder: 'krishna-print-hub',
          resource_type: isPDF ? 'image' : 'raw',
          format: isPDF ? 'pdf' : undefined,
          access_mode: 'public',
          public_id: safeFileName,
          overwrite: false,
        });

        const fileUrl = uploadResult.secure_url;
        console.log('[Upload] Cloudinary success:', fileUrl);
        return NextResponse.json({ success: true, fileUrl });
      } catch (err: any) {
        console.error('[Upload] Cloudinary error:', err?.message || err);
      }
    }

    // ─── Provider 4: Uguu.se ───
    try {
      console.log('[Upload] Trying Uguu.se...');
      const uguuForm = new FormData();
      uguuForm.append('files[]', new Blob([fileBuffer], { type: mimeType }), file.name);
      const res = await fetch('https://uguu.se/upload', {
        method: 'POST', body: uguuForm, signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.files?.[0]?.url) {
          console.log('[Upload] Uguu success:', data.files[0].url);
          return NextResponse.json({ success: true, fileUrl: data.files[0].url });
        }
      }
    } catch (err) { console.warn('[Upload] Uguu failed:', err); }

    // ─── Provider 5: 0x0.st ───
    try {
      console.log('[Upload] Trying 0x0.st...');
      const uploadForm = new FormData();
      uploadForm.append('file', new Blob([fileBuffer], { type: mimeType }), file.name);
      const res = await fetch('https://0x0.st', {
        method: 'POST', body: uploadForm, signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const fileUrl = (await res.text()).trim();
        if (fileUrl.startsWith('https://0x0.st/')) {
          console.log('[Upload] 0x0.st success:', fileUrl);
          return NextResponse.json({ success: true, fileUrl });
        }
      }
    } catch (err) { console.warn('[Upload] 0x0.st failed:', err); }

    throw new Error('All cloud storage providers failed to process the request. Please try again.');
  } catch (err: any) {
    console.error('[Upload] Fatal error:', err);
    return NextResponse.json({ error: err.message || 'Cloud upload failed' }, { status: 500 });
  }
}
