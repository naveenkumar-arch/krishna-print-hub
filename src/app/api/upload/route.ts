import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Extract raw bytes and construct a Blob with original name & type
    const bytes = await file.arrayBuffer();
    const fileBlob = new Blob([bytes], { type: file.type || 'application/pdf' });
    const fileName = file.name || 'document.pdf';

    // Provider 1: Try GoFile (Very stable, returns directLink, no blocks, up to 10GB free)
    try {
      console.log("Uploading to GoFile...");
      const uploadFormData = new FormData();
      uploadFormData.append('file', fileBlob, fileName);

      const res = await fetch('https://upload.gofile.io/uploadfile', {
        method: 'POST',
        body: uploadFormData,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (res.ok) {
        const result = await res.json();
        if (result.status === 'ok' && result.data) {
          // Prefer directLink if available, otherwise use downloadPage
          const fileUrl = result.data.directLink || result.data.downloadPage;
          if (fileUrl) {
            console.log("Successfully uploaded to GoFile:", fileUrl);
            return NextResponse.json({ 
              success: true, 
              fileUrl: fileUrl 
            });
          }
        }
      }
      console.warn(`GoFile upload failed with status: ${res.status}`);
    } catch (err) {
      console.warn("GoFile upload failed with error:", err);
    }

    // Provider 2: Try 0x0.st (Completely open, direct link, no Cloudflare AWS block)
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', fileBlob, fileName);

      const res = await fetch('https://0x0.st', {
        method: 'POST',
        body: uploadFormData,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (res.ok) {
        const fileUrl = await res.text();
        const trimmedUrl = fileUrl.trim();
        if (trimmedUrl.startsWith('https://0x0.st/')) {
          console.log("Successfully uploaded to 0x0.st:", trimmedUrl);
          return NextResponse.json({ 
            success: true, 
            fileUrl: trimmedUrl 
          });
        }
      }
      console.warn(`0x0.st upload failed with status: ${res.status}`);
    } catch (err) {
      console.warn("0x0.st upload failed with error:", err);
    }

    // Provider 3: Fallback to Pixeldrain (direct download link, massive file support)
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', fileBlob, fileName);

      const res = await fetch('https://pixeldrain.com/api/file', {
        method: 'POST',
        body: uploadFormData,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.id) {
          const directUrl = `https://pixeldrain.com/api/file/${data.id}`;
          console.log("Successfully uploaded to Pixeldrain:", directUrl);
          return NextResponse.json({ 
            success: true, 
            fileUrl: directUrl 
          });
        }
      }
      console.warn(`Pixeldrain fallback failed with status: ${res.status}`);
    } catch (err) {
      console.warn("Pixeldrain fallback failed with error:", err);
    }

    throw new Error("All cloud storage providers failed to process the request. Please try again.");
  } catch (err: any) {
    console.error("Cloud upload error:", err);
    return NextResponse.json({ error: err.message || "Cloud upload failed" }, { status: 500 });
  }
}
