import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Provider 1: Try tmpfiles.org (Highly stable, no Vercel IP blocks, direct download link via /dl/ path)
    try {
      console.log("Uploading to tmpfiles.org...");
      const tmpFormData = new FormData();
      tmpFormData.append('file', file);

      const res = await fetch('https://tmpfiles.org/api/v1/upload', {
        method: 'POST',
        body: tmpFormData,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (res.ok) {
        const result = await res.json();
        if (result.status === 'success' && result.data && result.data.url) {
          // Convert standard URL (https://tmpfiles.org/123456/filename)
          // to direct download URL (https://tmpfiles.org/dl/123456/filename)
          const directUrl = result.data.url.replace('https://tmpfiles.org/', 'https://tmpfiles.org/dl/');
          console.log("Successfully uploaded to tmpfiles.org:", directUrl);
          return NextResponse.json({ 
            success: true, 
            fileUrl: directUrl 
          });
        }
      }
      console.warn(`tmpfiles.org upload failed with status: ${res.status}`);
    } catch (err) {
      console.warn("tmpfiles.org upload failed with error:", err);
    }

    // Provider 2: Try Catbox.moe (Permanent, direct download link, no Vercel IP blocks)
    try {
      console.log("Uploading to Catbox.moe...");
      const catboxFormData = new FormData();
      catboxFormData.append('reqtype', 'fileupload');
      catboxFormData.append('fileToUpload', file); // Use original File directly!

      const res = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: catboxFormData,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (res.ok) {
        const fileUrl = await res.text();
        const trimmedUrl = fileUrl.trim();
        if (trimmedUrl.startsWith('https://files.catbox.moe/')) {
          console.log("Successfully uploaded to Catbox.moe:", trimmedUrl);
          return NextResponse.json({ 
            success: true, 
            fileUrl: trimmedUrl 
          });
        }
      }
      console.warn(`Catbox.moe upload failed with status: ${res.status}`);
    } catch (err) {
      console.warn("Catbox.moe upload failed with error:", err);
    }

    // Provider 3: Try Uguu.se (Expiring 3 hours, direct download link, no Vercel IP blocks)
    try {
      console.log("Uploading to Uguu.se...");
      const uguuFormData = new FormData();
      uguuFormData.append('files[]', file); // Use original File directly!

      const res = await fetch('https://uguu.se/upload', {
        method: 'POST',
        body: uguuFormData,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.files && data.files[0] && data.files[0].url) {
          const directUrl = data.files[0].url;
          console.log("Successfully uploaded to Uguu.se:", directUrl);
          return NextResponse.json({ 
            success: true, 
            fileUrl: directUrl 
          });
        }
      }
      console.warn(`Uguu.se upload failed with status: ${res.status}`);
    } catch (err) {
      console.warn("Uguu.se upload failed with error:", err);
    }

    // Provider 4: Fallback to 0x0.st (Direct link, simple)
    try {
      console.log("Uploading to 0x0.st...");
      const uploadFormData = new FormData();
      uploadFormData.append('file', file); // Use original File directly!

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

    throw new Error("All cloud storage providers failed to process the request. Please try again.");
  } catch (err: any) {
    console.error("Cloud upload error:", err);
    return NextResponse.json({ error: err.message || "Cloud upload failed" }, { status: 500 });
  }
}
