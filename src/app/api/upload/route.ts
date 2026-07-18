import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Forward the file to pixeldrain.com public upload API
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    const res = await fetch('https://pixeldrain.com/api/file', {
      method: 'POST',
      body: uploadFormData,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!res.ok) {
      throw new Error(`pixeldrain.com returned HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data.success || !data.id) {
      throw new Error(data.message || "Failed to upload file to Pixeldrain");
    }

    const fileUrl = `https://pixeldrain.com/api/file/${data.id}`;

    return NextResponse.json({ 
      success: true, 
      fileUrl: fileUrl 
    });
  } catch (err: any) {
    console.error("Cloud upload error:", err);
    return NextResponse.json({ error: err.message || "Cloud upload failed" }, { status: 500 });
  }
}
