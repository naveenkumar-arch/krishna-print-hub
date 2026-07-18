import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Forward the file to catbox.moe public upload API
    const uploadFormData = new FormData();
    uploadFormData.append('reqtype', 'fileupload');
    uploadFormData.append('fileToUpload', file);

    const res = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: uploadFormData
    });

    if (!res.ok) {
      throw new Error(`catbox.moe returned HTTP ${res.status}`);
    }

    const fileUrl = await res.text();
    const trimmedUrl = fileUrl.trim();
    if (!trimmedUrl.startsWith('https://files.catbox.moe/')) {
      throw new Error("Failed to upload file to catbox: " + trimmedUrl);
    }

    return NextResponse.json({ 
      success: true, 
      fileUrl: trimmedUrl 
    });
  } catch (err: any) {
    console.error("Cloud upload error:", err);
    return NextResponse.json({ error: err.message || "Cloud upload failed" }, { status: 500 });
  }
}
