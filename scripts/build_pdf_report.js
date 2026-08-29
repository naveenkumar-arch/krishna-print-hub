const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require(path.join(__dirname, '..', 'node_modules', 'pdf-lib'));

const workerUrl = 'https://jasaessential.raxsolutions01.workers.dev';
const adminKey = 'JASA4231';

async function generatePdfReport() {
  console.log('Fetching all live data from Worker...');
  
  const [shopsRes, xeroxRes, statRes, elecRes, booksRes, filtersRes] = await Promise.all([
    fetch(workerUrl + '/api/shops/all').then(r => r.json()),
    fetch(workerUrl + '/api/config/xerox').then(r => r.json()),
    fetch(workerUrl + '/api/items?category=stationary').then(r => r.json()),
    fetch(workerUrl + '/api/items?category=electronic').then(r => r.json()),
    fetch(workerUrl + '/api/items?category=books').then(r => r.json()),
    fetch(workerUrl + '/api/data?collection=metadata&id=item_filters').then(r => r.json())
  ]);

  const shops = shopsRes.shops || [];
  const sheets = xeroxRes.sheets || xeroxRes.sheetTypes || xeroxRes.sizes || [];
  const bindings = xeroxRes.binding || xeroxRes.bindings || [];
  const laminations = xeroxRes.lamination || xeroxRes.laminations || [];
  const stationary = Array.isArray(statRes) ? statRes : statRes.items || [];
  const electronics = Array.isArray(elecRes) ? elecRes : elecRes.items || [];
  const books = Array.isArray(booksRes) ? booksRes : booksRes.items || [];

  console.log(`Data summary: ${shops.length} shops, ${sheets.length} sheets, ${bindings.length} bindings, ${laminations.length} laminations, ${stationary.length} stationary, ${electronics.length} electronics, ${books.length} books.`);

  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_WIDTH = 595.28; // A4
  const PAGE_HEIGHT = 841.89; // A4
  const MARGIN = 40;
  const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

  let currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  function checkNewPage(neededHeight = 40) {
    if (y - neededHeight < MARGIN + 30) {
      drawFooter(currentPage);
      currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN - 20;
      return true;
    }
    return false;
  }

  function drawFooter(page) {
    page.drawLine({
      start: { x: MARGIN, y: MARGIN + 15 },
      end: { x: PAGE_WIDTH - MARGIN, y: MARGIN + 15 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8)
    });
    page.drawText('JASA Essential & Xerox Database Export - Complete Master Record', {
      x: MARGIN,
      y: MARGIN + 4,
      size: 8,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5)
    });
    const pageNumberStr = `Page ${pdfDoc.getPageCount()}`;
    page.drawText(pageNumberStr, {
      x: PAGE_WIDTH - MARGIN - 40,
      y: MARGIN + 4,
      size: 8,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5)
    });
  }

  function drawHeaderBanner(title, subtitle) {
    currentPage.drawRectangle({
      x: MARGIN,
      y: y - 50,
      width: CONTENT_WIDTH,
      height: 55,
      color: rgb(0.12, 0.15, 0.25)
    });
    currentPage.drawText(cleanString(title), {
      x: MARGIN + 16,
      y: y - 24,
      size: 13,
      font: helveticaBold,
      color: rgb(1, 1, 1)
    });
    currentPage.drawText(cleanString(subtitle), {
      x: MARGIN + 16,
      y: y - 42,
      size: 8.5,
      font: helvetica,
      color: rgb(0.8, 0.85, 0.95)
    });
    y -= 65;
  }

  function drawSectionTitle(title, prefix = '>>') {
    checkNewPage(40);
    currentPage.drawRectangle({
      x: MARGIN,
      y: y - 18,
      width: CONTENT_WIDTH,
      height: 22,
      color: rgb(0.93, 0.95, 0.98)
    });
    currentPage.drawText(`${prefix}  ${cleanString(title)}`, {
      x: MARGIN + 8,
      y: y - 12,
      size: 10,
      font: helveticaBold,
      color: rgb(0.15, 0.25, 0.45)
    });
    y -= 28;
  }

  function cleanString(str) {
    if (!str) return '';
    return String(str).replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function drawTable(headers, rows, colWidths) {
    checkNewPage(30);

    // Header Row
    currentPage.drawRectangle({
      x: MARGIN,
      y: y - 16,
      width: CONTENT_WIDTH,
      height: 18,
      color: rgb(0.2, 0.25, 0.35)
    });

    let currentX = MARGIN + 6;
    headers.forEach((h, i) => {
      currentPage.drawText(cleanString(h), {
        x: currentX,
        y: y - 12,
        size: 8,
        font: helveticaBold,
        color: rgb(1, 1, 1)
      });
      currentX += colWidths[i];
    });
    y -= 20;

    // Body Rows
    rows.forEach((row, rowIdx) => {
      checkNewPage(18);

      const isEven = rowIdx % 2 === 0;
      if (isEven) {
        currentPage.drawRectangle({
          x: MARGIN,
          y: y - 14,
          width: CONTENT_WIDTH,
          height: 16,
          color: rgb(0.97, 0.98, 0.99)
        });
      }

      let rowX = MARGIN + 6;
      row.forEach((cell, i) => {
        const textVal = cleanString(cell);
        const maxLen = Math.floor(colWidths[i] / 5.2);
        const displayVal = textVal.length > maxLen ? textVal.substring(0, maxLen - 2) + '..' : textVal;

        currentPage.drawText(displayVal, {
          x: rowX,
          y: y - 10,
          size: 7.5,
          font: helvetica,
          color: rgb(0.15, 0.15, 0.15)
        });
        rowX += colWidths[i];
      });
      y -= 16;
    });

    y -= 10;
  }

  // ================= TITLE & SHOPS =================
  drawHeaderBanner(
    'JASA ESSENTIAL & XEROX - COMPLETE DATABASE REPORT',
    `Exported: ${new Date().toLocaleString()} | Cloudflare Worker: jasaessential.raxsolutions01.workers.dev`
  );

  // SECTION 1: SHOPS
  drawSectionTitle('1. REGISTERED BRANCHES & SHOPS METADATA', '[1]');
  const shopHeaders = ['Branch Name', 'Services', 'Location / Area', 'Contact No', 'Pending Orders'];
  const shopWidths = [140, 90, 130, 95, 60];
  const shopRows = shops.map(s => [
    s.name || 'Unnamed',
    (s.services || []).join(', ') || 'General',
    (s.areas || [s.address || 'Salem']).join(', '),
    (s.mobileNumbers || []).join(', '),
    `${s.newOrdersCount || 0} orders`
  ]);
  drawTable(shopHeaders, shopRows, shopWidths);

  // SECTION 2: PRINTING & XEROX CONFIGURATION
  drawSectionTitle('2. XEROX & PAPER SPECIFICATIONS & PRICING', '[2]');
  const sheetHeaders = ['Sheet Format', 'B&W Single', 'B&W Double', 'Color Single', 'Color Double', 'Status'];
  const sheetWidths = [150, 75, 75, 75, 75, 65];
  const sheetRows = (sheets.length > 0 ? sheets : [
    { name: 'LEGAL SHEET', bwPrices: { frontOnly: 3, frontBack: 5 }, colorPrices: { frontOnly: 20, frontBack: 40 } },
    { name: 'A3 SHEET', bwPrices: { frontOnly: 5, frontBack: 10 }, colorPrices: { frontOnly: 25, frontBack: 50 } },
    { name: 'A0 POSTER', bwPrices: { frontOnly: 350, frontBack: 0 }, colorPrices: { frontOnly: 500, frontBack: 0 } }
  ]).map(s => [
    s.name || 'Standard Sheet',
    s.bwPrices ? `Rs. ${s.bwPrices.frontOnly || 0}` : '-',
    s.bwPrices ? `Rs. ${s.bwPrices.frontBack || 0}` : '-',
    s.colorPrices ? `Rs. ${s.colorPrices.frontOnly || 0}` : '-',
    s.colorPrices ? `Rs. ${s.colorPrices.frontBack || 0}` : '-',
    'Active in Catalog'
  ]);
  drawTable(sheetHeaders, sheetRows, sheetWidths);

  // SECTION 3: BINDING & LAMINATION
  drawSectionTitle('3. BINDING & FINISHING SERVICES', '[3]');
  const bindHeaders = ['Binding Service Title', 'Sheet Range / Specs', 'Service Price', 'ID Reference'];
  const bindWidths = [220, 120, 80, 95];
  const bindRows = bindings.map(b => [
    b.name,
    'All Documents',
    `Rs. ${b.price || 0}`,
    b.id ? b.id.substring(0, 12) : '-'
  ]);
  drawTable(bindHeaders, bindRows, bindWidths);

  drawSectionTitle('4. LAMINATION SERVICES & ID PROTECTION', '[4]');
  const lamHeaders = ['Lamination Type', 'Format Dimension', 'Price', 'ID Reference'];
  const lamWidths = [220, 120, 80, 95];
  const lamRows = laminations.map(l => [
    l.name,
    'Heat Sealed Plastic',
    `Rs. ${l.price || 0}`,
    l.id ? l.id.substring(0, 12) : '-'
  ]);
  drawTable(lamHeaders, lamRows, lamWidths);

  // SECTION 5: ELECTRONICS CATALOG
  drawSectionTitle('5. ELECTRONICS & HARDWARE PROJECT INVENTORY', '[5]');
  const elecHeaders = ['Product Title', 'Category / Type', 'Brand', 'MRP', 'Discount Price'];
  const elecWidths = [220, 100, 80, 55, 60];
  const elecRows = electronics.map(e => [
    e.name || 'Electronic Component',
    e.type || (e.types || []).join(', ') || 'Module',
    (e.brands || []).join(', ') || 'GENERIC',
    `Rs. ${e.priceOriginal || 0}`,
    `Rs. ${e.priceDiscount || e.priceOriginal || 0}`
  ]);
  drawTable(elecHeaders, elecRows, elecWidths);

  // SECTION 6: BOOKS CATALOG
  drawSectionTitle('6. BOOKS & ACADEMIC GUIDES CATALOG', '[6]');
  const bookHeaders = ['Book Title', 'Category', 'MRP Price', 'Special Discount Price'];
  const bookWidths = [260, 110, 70, 75];
  const bookRows = books.map(b => [
    b.name || 'Book Title',
    b.type || (b.types || []).join(', ') || 'Journal',
    `Rs. ${b.priceOriginal || 0}`,
    `Rs. ${b.priceDiscount || b.priceOriginal || 0}`
  ]);
  drawTable(bookHeaders, bookRows, bookWidths);

  // SECTION 7: STATIONARY CATALOG
  drawSectionTitle('7. COMPLETE STATIONARY INVENTORY (ALL ITEMS)', '[7]');
  const statHeaders = ['Item Title', 'Type', 'Brand', 'MRP', 'Store Price'];
  const statWidths = [230, 90, 80, 55, 60];
  const statRows = stationary.map(s => [
    s.name || 'Stationary Item',
    s.type || (s.types || []).join(', ') || 'General',
    (s.brands || []).join(', ') || 'Standard',
    `Rs. ${s.priceOriginal || 0}`,
    `Rs. ${s.priceDiscount || s.priceOriginal || 0}`
  ]);
  drawTable(statHeaders, statRows, statWidths);

  // SECTION 8: DELIVERY PRICING
  drawSectionTitle('8. TIERED XEROX DELIVERY FEE MATRIX', '[8]');
  const delivHeaders = ['Order Volume (Pages)', 'Applicable Delivery Charge', 'Service Terms'];
  const delivWidths = [180, 150, 185];
  const delivRows = [
    ['1 to 100 pages', 'Rs. 60.00', 'Standard Delivery'],
    ['101 to 300 pages', 'Rs. 50.00', 'Reduced Delivery Tier 1'],
    ['301 to 600 pages', 'Rs. 40.00', 'Reduced Delivery Tier 2'],
    ['601 to 1000 pages', 'Rs. 30.00', 'Bulk Volume Discount'],
    ['1001+ pages', 'FREE (Rs. 0.00)', 'Free Express Delivery']
  ];
  drawTable(delivHeaders, delivRows, delivWidths);

  // Draw footer on final page
  drawFooter(currentPage);

  // Save the PDF
  const pdfBytes = await pdfDoc.save();

  // 1. Save to public/downloads for direct web URL access
  const publicDir = path.join(__dirname, '..', 'public', 'downloads');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const publicPdfPath = path.join(publicDir, 'JASA_Complete_Database_Report.pdf');
  fs.writeFileSync(publicPdfPath, pdfBytes);
  console.log(`Saved PDF to public path: ${publicPdfPath}`);

  // 2. Save to artifacts directory
  const artifactPath = 'C:\\Users\\kupen\\.gemini\\antigravity-ide\\brain\\19ed1d7e-ecc7-4ec2-b44f-8bd96e9de83d\\JASA_Complete_Database_Report.pdf';
  fs.writeFileSync(artifactPath, pdfBytes);
  console.log(`Saved PDF to artifact path: ${artifactPath}`);

  console.log(`PDF Generation Complete! Total pages: ${pdfDoc.getPageCount()}, Size: ${(pdfBytes.length / 1024).toFixed(1)} KB`);
}

generatePdfReport().catch(err => {
  console.error('PDF Generation Error:', err);
});
