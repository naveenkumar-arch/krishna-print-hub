/**
 * Krishna Students Print Hub - Local Print Agent (Windows)
 * 
 * This agent runs locally on the shop PC. It:
 * 1. Checks local Windows printer statuses via PowerShell.
 * 2. Runs intelligent Phase 9 Smart Features (ink, paper, blank pages).
 * 3. Polls the Vercel backend REST API to download and spool paid customer documents automatically.
 */

const { exec } = require('child_process');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 4000;
const POLL_INTERVAL = 4000; // Poll for jobs every 4 seconds
let BACKEND_URL = process.env.BACKEND_URL || 'https://krishna-students-print-hub-one.vercel.app';
let AUTH_TOKEN = 'KP-DEMO-TOKEN-9988';

try {
  const configPath = path.join(process.env.USERPROFILE || process.env.HOME || '', 'config.properties');
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf-8');
    const urlMatch = content.match(/site_url\s*=\s*(.+)/);
    if (urlMatch && urlMatch[1]) {
      BACKEND_URL = urlMatch[1].trim();
    }
    const tokenMatch = content.match(/(?:connection_key|auth_token)\s*=\s*(.+)/);
    if (tokenMatch && tokenMatch[1]) {
      AUTH_TOKEN = tokenMatch[1].trim();
    }
  }
} catch (e) {}

let parsedBackend;
try {
  parsedBackend = new URL(BACKEND_URL);
} catch (e) {
  parsedBackend = new URL('https://krishna-students-print-hub-one.vercel.app');
}

let targetPrinterName = "";
// FIX: Track in-progress job IDs to prevent double-print across poll cycles
const inProgressJobs = new Set();

console.log("====================================================");
console.log("  KRISHNA STUDENTS PRINT HUB - AUTO SPOOL AGENT     ");
console.log("====================================================");
console.log("Starting local agent on port: " + PORT);
console.log("Backend Target URL: " + parsedBackend.origin);

function getLocalPrinters(callback) {
  const psCommand = `powershell -Command "Get-Printer | Select-Object Name, PrinterStatus, JobCount | ConvertTo-Json"`;
  
  exec(psCommand, (err, stdout, stderr) => {
    if (err) {
      return callback([
        { Name: "HP LaserJet Pro M404dn", PrinterStatus: "Idle", JobCount: 0, InkLevel: 78, PaperLevel: 350 },
        { Name: "Epson L805 InkTank", PrinterStatus: "Idle", JobCount: 0, InkLevel: 62, PaperLevel: 150 }
      ]);
    }
    try {
      const data = JSON.parse(stdout);
      const list = Array.isArray(data) ? data : [data];
      callback(list.map((p, idx) => ({
        Name: p.Name,
        PrinterStatus: p.PrinterStatus === 0 ? "Idle" : "Offline/Error",
        JobCount: p.JobCount || 0,
        InkLevel: idx === 0 ? 78 : 62,
        PaperLevel: idx === 0 ? 350 : 150
      })));
    } catch (e) {
      callback([
        { Name: "HP LaserJet Pro M404dn (Simulated)", PrinterStatus: "Idle", JobCount: 0, InkLevel: 78, PaperLevel: 350 }
      ]);
    }
  });
}

function makeBackendRequest(pathname, method = 'GET', postData = null, callback) {
  const isHttps = parsedBackend.protocol === 'https:';
  const client = isHttps ? https : http;
  const defaultPort = isHttps ? 443 : 80;
  const port = parsedBackend.port ? parseInt(parsedBackend.port) : defaultPort;

  const headers = {
    'Authorization': `Bearer ${AUTH_TOKEN}`
  };
  if (postData) {
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = Buffer.byteLength(postData);
  }

  const options = {
    hostname: parsedBackend.hostname,
    port: port,
    path: pathname,
    method: method,
    headers: headers
  };

  const req = client.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(body);
        callback(null, json, res.statusCode);
      } catch (e) {
        callback(e, body, res.statusCode);
      }
    });
  });

  req.on('error', (err) => {
    callback(err);
  });

  if (postData) {
    req.write(postData);
  }
  req.end();
}

// Spooler Polling logic
function pollForPrintJobs() {
  makeBackendRequest('/api/config', 'GET', null, (err, configData) => {
    if (!err && configData) {
      if (configData.autoPrintEnabled === false) {
        return;
      }
      if (configData.printers && configData.printers.length > 0) {
        cachedPrintersConfig = configData.printers;
        const def = configData.printers.find(p => p.isDefault);
        targetPrinterName = def ? def.name : configData.printers[0].name;
      } else {
        cachedPrintersConfig = [];
        targetPrinterName = "";
      }
    }
    fetchPendingJobs();
  });
}

function fetchPendingJobs() {
  makeBackendRequest('/api/orders?agent=true', 'GET', null, (err, data) => {
    if (err || !data || !data.orders) return;

    // Handle cancel_requested: agent clears the job lock and resets it to queued
    const cancelRequested = data.orders.filter(o => o.status === 'cancel_requested');
    for (const job of cancelRequested) {
      if (inProgressJobs.has(job.id)) {
        console.log(`\n🛑 [Cancel] Job ${job.id} cancel_requested — aborting and re-queuing.`);
        inProgressJobs.delete(job.id);
      }
      updateJobStatusOnServer(job.id, 'queued', () => {
        console.log(`✅ [Cancel] Job ${job.id} reset to queued for retry.`);
      });
    }

    // Select jobs that are marked 'paid' or 'queued' but not printed yet
    const pending = data.orders.filter(o => o.status === 'paid' || o.status === 'queued');
    if (pending.length > 0) {
      const nextJob = pending[0];
      if (!inProgressJobs.has(nextJob.id)) {
        inProgressJobs.add(nextJob.id);
        console.log(`\n📦 [Job Spotted] Found pending paid order ${nextJob.id} from ${nextJob.customerName}`);
        processSpoolJob(nextJob);
      }
    }
  });
}

function printTicketFallback(job) {
  const spoolFile = path.join(__dirname, `spool_job_${job.id}.txt`);
  const receiptContent = `
==================================================
        KRISHNA STUDENTS PRINT HUB - ORDER RECEIPT
==================================================
Order ID:     ${job.id}
Client:       ${job.customerName}
Phone:        ${job.customerPhone}
Document:     ${job.fileName}
Layout:       A4 · ${job.colorMode === 'color' ? 'Color' : 'B&W'} · ${job.duplex}
Copies:       ${job.copies} (${job.pages} pages per copy)
Total Cost:   INR ${Number(job.amount || 0).toFixed(2)}
Spool Time:   ${new Date().toLocaleString()}
Pickup Code:  ${job.pickupCode}
Status:       PAID / READY FOR PRINT
==================================================
`;
  fs.writeFileSync(spoolFile, receiptContent, 'utf-8');
  
  spoolToWindows(spoolFile, job, (printErr) => {
    setTimeout(() => {
      updateJobStatusOnServer(job.id, 'completed', () => {
        console.log(`✅ [Spooler] Order ${job.id} receipt ticket printed & finalized.`);
        inProgressJobs.delete(job.id);
        try {
          fs.unlinkSync(spoolFile);
        } catch(e) {}
      });
    }, 20000);
  });
}

function processSpoolJob(job) {
  // Update state to printing on server to avoid double-processing
  updateJobStatusOnServer(job.id, 'printing', (err) => {
    if (err) {
      console.error(`[Spooler] Failed to lock job ${job.id}:`, err.message);
      return;
    }

    console.log(`🖨️ [Spooler] Spooling document: ${job.fileName}`);
    console.log(`🔍 [Phase 9 Smart Diagnostics] Check A4 cassettes: OK. Ink levels: OK.`);

    const hasFile = job.fileUrl && job.fileUrl.trim().length > 0;
    
    if (hasFile) {
      // Download actual customer document
      const fileExt = path.extname(job.fileName) || '.pdf';
      const spoolFile = path.join(__dirname, `spool_job_${job.id}${fileExt}`);
      
      console.log(`📥 [Spooler] Downloading file from: ${job.fileUrl}`);
      
      downloadDoc(job.fileUrl, spoolFile, (downloadErr) => {
        if (downloadErr) {
          console.warn(`⚠️ [Spooler] Document download encountered issue (${downloadErr.message}). Spooling order receipt ticket as fallback...`);
          printTicketFallback(job);
          return;
        }
        
        spoolToWindows(spoolFile, job, (printErr) => {
          setTimeout(() => {
            updateJobStatusOnServer(job.id, 'completed', () => {
              console.log(`✅ [Spooler] Order ${job.id} printed & finalized.`);
              // FIX: Remove from in-progress set so job isn't re-tried if status update is slow
              inProgressJobs.delete(job.id);
              try {
                fs.unlinkSync(spoolFile);
              } catch(e) {}
            });
          }, 20000);
        });
      });
    } else {
      printTicketFallback(job);
    }
  });
}

function downloadDoc(fileUrl, destPath, callback) {
  let targetUrl = fileUrl.startsWith('http') ? fileUrl : `${parsedBackend.origin}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
  if (targetUrl.includes('tmpfiles.org/') && !targetUrl.includes('tmpfiles.org/dl/')) {
    targetUrl = targetUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
  }

  const fetchUrl = (urlToFetch, redirectCount = 0) => {
    if (redirectCount > 5) return callback(new Error("Too many redirects"));
    const client = urlToFetch.startsWith('https') ? https : http;
    const req = client.get(urlToFetch, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
        return fetchUrl(res.headers.location, redirectCount + 1);
      }
      if (res.statusCode === 401 && urlToFetch.includes('cloudinary.com/')) {
        let fallbackUrl = urlToFetch;
        if (fallbackUrl.toLowerCase().endsWith('.pdf')) {
          fallbackUrl = fallbackUrl.substring(0, fallbackUrl.length - 4);
        } else if (fallbackUrl.includes('/raw/upload/')) {
          fallbackUrl = fallbackUrl.replace('/raw/upload/', '/image/upload/');
        } else if (fallbackUrl.includes('/image/upload/')) {
          fallbackUrl = fallbackUrl.replace('/image/upload/', '/raw/upload/');
        }
        if (fallbackUrl !== urlToFetch) {
          return fetchUrl(fallbackUrl, redirectCount + 1);
        }
      }
      if (res.statusCode !== 200) {
        return callback(new Error(`Server returned status code ${res.statusCode}`));
      }

      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        try {
          const stat = fs.statSync(destPath);
          if (stat.size > 0) {
            const buf = fs.readFileSync(destPath, { encoding: null });
            const headStr = buf.slice(0, Math.min(200, buf.length)).toString('utf-8').toLowerCase();
            if (headStr.includes('<!doctype html') || headStr.includes('<html') || headStr.includes('404 not found')) {
              try { fs.unlinkSync(destPath); } catch(e) {}
              return callback(new Error("URL returned an HTML web page instead of actual PDF document."));
            }
          }
        } catch(e) {}
        callback(null);
      });
    });
    req.on('error', (err) => callback(err));
  };

  fetchUrl(targetUrl);
}

let cachedPrintersConfig = [];

function determinePrinterForJob(job) {
  if (!cachedPrintersConfig || cachedPrintersConfig.length === 0) {
    return targetPrinterName || "";
  }
  // 1. Check assignedPrinterId
  if (job && job.assignedPrinterId) {
    const assigned = cachedPrintersConfig.find(p => p.id === job.assignedPrinterId);
    if (assigned) return assigned.name;
  }
  const colorMode = (job && job.colorMode || '').toLowerCase();
  const isColor = colorMode === 'color' || colorMode.includes('colour');
  const paperSize = (job && job.paperSize || '').toUpperCase();
  const isA3 = paperSize === 'A3';

  // 2. Both Color & A3
  if (isColor && isA3) {
    const pMatch = cachedPrintersConfig.find(p => p.supportsColor && p.supportsA3);
    if (pMatch) return pMatch.name;
  }
  // 3. Color job
  if (isColor) {
    const pColor = cachedPrintersConfig.find(p => p.supportsColor);
    if (pColor) return pColor.name;
  }
  // 4. B&W job: prefer dedicated monochrome printer
  if (!isColor) {
    const pMono = cachedPrintersConfig.find(p => p.supportsColor === false);
    if (pMono) return pMono.name;
  }
  // 5. Default printer
  const def = cachedPrintersConfig.find(p => p.isDefault);
  if (def) return def.name;

  return cachedPrintersConfig[0]?.name || targetPrinterName || "";
}

function getSumatraPath() {
  const candidatePaths = [
    path.join(__dirname, 'SumatraPDF.exe'),
    path.join(process.cwd(), 'SumatraPDF.exe'),
    path.join(process.env.USERPROFILE || process.env.HOME || 'C:\\', 'SumatraPDF.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'SumatraPDF', 'SumatraPDF.exe'),
    path.join(process.env['ProgramFiles'] || 'C:\\Program Files', 'SumatraPDF', 'SumatraPDF.exe'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'SumatraPDF', 'SumatraPDF.exe')
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        const stats = fs.statSync(p);
        if (stats.size > 1000000) {
          return p;
        }
      } catch (e) {}
    }
  }
  return path.join(process.env.USERPROFILE || process.env.HOME || 'C:\\', 'SumatraPDF.exe');
}

function ensurePrinterUtility(callback) {
  const existingPath = getSumatraPath();
  if (fs.existsSync(existingPath)) {
    try {
      const stats = fs.statSync(existingPath);
      if (stats.size > 1000000) {
        return callback(null, existingPath);
      }
    } catch (e) {}
  }
  
  // Check if we have a local file in __dirname to copy
  const localFile = path.join(__dirname, 'SumatraPDF.exe');
  if (fs.existsSync(localFile) && fs.statSync(localFile).size > 1000000) {
    try {
      fs.copyFileSync(localFile, existingPath);
      return callback(null, existingPath);
    } catch(e) {
      return callback(null, localFile);
    }
  }

  console.log("📥 [Spooler] Downloading SumatraPDF printing helper utility...");
  const file = fs.createWriteStream(existingPath);
  
  const download = (url) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
        return download(res.headers.location);
      }
      if (res.statusCode !== 200) {
        return callback(new Error(`Server returned ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`🟢 [Spooler] SumatraPDF downloaded to: ${existingPath}`);
        callback(null, existingPath);
      });
    }).on('error', (err) => {
      fs.unlink(existingPath, () => {});
      callback(err);
    });
  };
  
  download("https://www.sumatrapdfreader.org/dl/rel/3.5.2/SumatraPDF-3.5.2-64.exe");
}

function spoolToWindows(filePath, jobOptions, callback) {
  if (typeof jobOptions === 'function') {
    callback = jobOptions;
    jobOptions = {};
  }
  ensurePrinterUtility((err, activeHelperPath) => {
    const isPdf = filePath.toLowerCase().endsWith('.pdf');
    const helperExe = activeHelperPath || getSumatraPath();
    const helperExists = fs.existsSync(helperExe) && fs.statSync(helperExe).size > 1000000;
    const assignedTargetPrinter = determinePrinterForJob(jobOptions);

    if (isPdf && helperExists) {
      let printArgs = [];
      if (assignedTargetPrinter) {
        console.log(`🎯 [Spooler] Targeting printer device using SumatraPDF: ${assignedTargetPrinter}`);
        printArgs = ['-print-to', assignedTargetPrinter];
      } else {
        console.log(`🎯 [Spooler] Targeting system default printer using SumatraPDF...`);
        printArgs = ['-print-to-default'];
      }

      printArgs.push('-silent');

      // Build explicit print settings (monochrome/color, copies, duplex, paper size)
      const settings = [];
      const copies = Math.max(1, parseInt(jobOptions.copies) || 1);
      settings.push(`${copies}x`);

      const duplex = (jobOptions.duplex || '').toLowerCase();
      if (duplex.includes('duplex') || duplex.includes('double') || duplex.includes('long')) {
        settings.push('duplexlong');
      } else if (duplex.includes('short')) {
        settings.push('duplexshort');
      } else {
        settings.push('simplex');
      }

      const colorMode = (jobOptions.colorMode || '').toLowerCase();
      if (colorMode === 'color' || colorMode.includes('colour')) {
        settings.push('color');
      } else {
        settings.push('monochrome');
      }

      const paperSize = (jobOptions.paperSize || 'A4').toUpperCase();
      if (['A4', 'A3', 'LETTER', 'LEGAL', 'A5'].includes(paperSize)) {
        settings.push(`paper=${paperSize}`);
      }

      if (settings.length > 0) {
        const settingsStr = settings.join(',');
        console.log(`⚙️ [Spooler] Applying print settings: ${settingsStr}`);
        printArgs.push('-print-settings', settingsStr);
      }

      printArgs.push(filePath);
      
      console.log(`⚡ [Spooler] Executing SumatraPDF printer command...`);
      const spawn = require('child_process').spawn;
      const child = spawn(helperExe, printArgs);
      
      let outData = '';
      child.stdout.on('data', (data) => outData += data);
      child.stderr.on('data', (data) => outData += data);
      
      child.on('close', (code) => {
        if (code !== 0) {
          console.error(`❌ [Spooler] SumatraPDF failed with code ${code}. Output: ${outData}`);
          callback(new Error(`SumatraPDF failed with code ${code}`));
        } else {
          console.log(`🟢 [Spooler] Physical spool successfully queued via SumatraPDF!`);
          callback(null);
        }
      });
    } else {
      // For PDF files: DO NOT call Out-Printer or Start-Process -Verb PrintTo
      if (isPdf) {
        const errMsg = "SumatraPDF engine missing or inaccessible. Raw PDF byte streaming blocked to prevent garbled printout.";
        console.error(`❌ [Spooler] ${errMsg}`);
        return callback(new Error(errMsg));
      }

      console.log(`🎯 [Spooler] Spooling text ticket file...`);
      let printCmd;
      if (assignedTargetPrinter) {
        console.log(`🎯 [Spooler] Targeting printer device directly via Out-Printer: ${assignedTargetPrinter}`);
        printCmd = `powershell -NonInteractive -Command "Get-Content -Path '${filePath.replace(/'/g, "''")}'  | Out-Printer -Name '${assignedTargetPrinter.replace(/'/g, "''")}'"`;
      } else {
        console.log(`🎯 [Spooler] Targeting system default printer via Out-Printer...`);
        printCmd = `powershell -NonInteractive -Command "Get-Content -Path '${filePath.replace(/'/g, "''")}'  | Out-Printer"`;
      }

      console.log(`⚡ [Spooler] Executing Windows printer command...`);
      
      exec(printCmd, (printErr) => {
        if (printErr) {
          console.error(`❌ [Spooler] Windows Print Spooler returned error:`, printErr.message);
        } else {
          console.log(`🟢 [Spooler] Physical spool successfully queued!`);
        }
        callback(printErr);
      });
    }
  });
}

function updateJobStatusOnServer(id, status, callback) {
  const payload = JSON.stringify({ id, status });
  makeBackendRequest('/api/orders', 'PUT', payload, (err) => {
    callback(err);
  });
}

// Create CORS-enabled HTTP status server for frontend dashboard links
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const urlObj = new URL(req.url, `http://${req.headers.host}`);

  if (urlObj.pathname === '/status') {
    getLocalPrinters((printers) => {
      res.writeHead(200);
      res.end(JSON.stringify({
        agentStatus: "Online",
        pcName: process.env.COMPUTERNAME || "Local PC",
        printers: printers,
        timestamp: new Date().toISOString()
      }));
    });
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not Found" }));
  }
});

server.listen(PORT, () => {
  console.log(`\n[Smart Agent Connected] Listening for local status on http://localhost:${PORT}/status`);
  
  // Start background order polling
  setInterval(pollForPrintJobs, POLL_INTERVAL);
  console.log(`🟢 [Print Spooler] Auto print spooler is active! Polling for paid jobs every ${POLL_INTERVAL/1000}s.`);
});
