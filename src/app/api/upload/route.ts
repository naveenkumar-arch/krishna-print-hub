import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Forward the file to tmpfiles.org public upload API
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    const res = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: uploadFormData
    });

    if (!res.ok) {
      throw new Error(`tmpfiles.org returned HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.status !== 'success' || !data.data || !data.data.url) {
      throw new Error(data.message || "Failed to upload file to tmpfiles.org");
    }

    // Convert view URL to direct download URL
    // e.g. https://tmpfiles.org/12345/file.pdf -> https://tmpfiles.org/dl/12345/file.pdf
    const viewUrl = data.data.url;
    const downloadUrl = viewUrl.replace('https://tmpfiles.org/', 'https://tmpfiles.org/dl/');

    return NextResponse.json({ 
      success: true, 
      fileUrl: downloadUrl 
    });
  } catch (err: any) {
    console.error("Cloud upload error:", err);
    return NextResponse.json({ error: err.message || "Cloud upload failed" }, { status: 500 });
  }
}
