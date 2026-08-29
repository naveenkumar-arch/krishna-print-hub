export async function uploadDocumentFile(
  file: File
): Promise<{ success: boolean; fileUrl?: string; error?: string }> {
  const sizeMB = file.size / (1024 * 1024);

  // Strategy 1: If file <= 4MB, try the serverless /api/upload endpoint
  if (sizeMB <= 4.0) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          if (data.success && data.fileUrl) {
            return { success: true, fileUrl: data.fileUrl };
          }
        } catch (_) {}
      }
    } catch (err) {
      console.warn('[clientUpload] /api/upload failed, switching to direct client-side upload...', err);
    }
  }

  // Strategy 2: Direct browser-to-cloud upload (bypasses Vercel 4.5MB payload limit)
  try {
    const uguuForm = new FormData();
    uguuForm.append('files[]', file, file.name);
    const res = await fetch('https://uguu.se/upload', {
      method: 'POST',
      body: uguuForm,
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.files?.[0]?.url) {
        return { success: true, fileUrl: data.files[0].url };
      }
    }
  } catch (err) {
    console.warn('[clientUpload] Direct Uguu upload failed, trying 0x0 fallback...', err);
  }

  // Strategy 3: 0x0.st public storage fallback
  try {
    const zeroForm = new FormData();
    zeroForm.append('file', file, file.name);
    const res = await fetch('https://0x0.st', {
      method: 'POST',
      body: zeroForm,
    });

    if (res.ok) {
      const textUrl = (await res.text()).trim();
      if (textUrl.startsWith('https://0x0.st/')) {
        return { success: true, fileUrl: textUrl };
      }
    }
  } catch (err) {
    console.warn('[clientUpload] Direct 0x0 upload failed:', err);
  }

  // Strategy 4: Final attempt at /api/upload with safe error extraction
  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      if (data.success && data.fileUrl) {
        return { success: true, fileUrl: data.fileUrl };
      }
      return { success: false, error: data.error || 'Upload was rejected by server.' };
    } catch (_) {
      if (res.status === 413) {
        return { success: false, error: 'File is too large for the current network connection.' };
      }
      return { success: false, error: `Upload failed with status code ${res.status}.` };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error during upload.' };
  }
}
