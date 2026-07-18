import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Forward the file to uguu.se public upload API
    const uploadFormData = new FormData();
    uploadFormData.append('files[]', file);

    const res = await fetch('https://uguu.se/upload?output=text', {
      method: 'POST',
      body: uploadFormData,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!res.ok) {
      throw new Error(`uguu.se returned HTTP ${res.status}`);
    }

    const fileUrl = await res.text();
    const trimmedUrl = fileUrl.trim();
    if (!trimmedUrl.startsWith('https://uguu.se/')) {
      throw new Error("Failed to upload file to Uguu: " + trimmedUrl);
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
