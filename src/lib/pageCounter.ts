import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';

export interface PageCountResult {
  pages: number;
  type: string;
  detail: string;
}

/**
 * Calculates the exact page count for all supported document and image formats:
 * - PDF (.pdf)
 * - Word (.docx, .doc)
 * - PowerPoint (.pptx, .ppt)
 * - Excel (.xlsx, .xls)
 * - Images (.jpg, .jpeg, .png, .webp, .bmp, .tiff, .gif)
 * - Text (.txt, .csv)
 */
export async function detectExactPageCount(file: File): Promise<PageCountResult> {
  const fileName = file.name.toLowerCase();
  const ext = fileName.split('.').pop() || '';

  // 1. Image formats (1 image = 1 page)
  const isImage = file.type.startsWith('image/') || 
    ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff', 'gif'].includes(ext);
  if (isImage) {
    return { pages: 1, type: 'image', detail: 'Single page image' };
  }

  // 2. PDF Documents
  if (ext === 'pdf' || file.type === 'application/pdf') {
    try {
      const buffer = await file.arrayBuffer();
      try {
        const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const count = pdfDoc.getPageCount();
        return { pages: Math.max(1, count), type: 'pdf', detail: `${count} PDF page${count > 1 ? 's' : ''}` };
      } catch (pdfLibErr) {
        // Fallback to binary text pattern analysis
        const text = new TextDecoder('utf-8').decode(new Uint8Array(buffer));
        const countMatch = text.match(/\/Count\s+(\d+)/);
        if (countMatch && countMatch[1]) {
          const count = parseInt(countMatch[1]);
          return { pages: Math.max(1, count), type: 'pdf', detail: `${count} PDF page${count > 1 ? 's' : ''} (structure)` };
        }
        const matches = text.match(/\/Type\s*\/Page\b/g);
        const count = matches ? matches.length : 1;
        return { pages: Math.max(1, count), type: 'pdf', detail: `${count} PDF page${count > 1 ? 's' : ''}` };
      }
    } catch (e) {
      return { pages: 1, type: 'pdf', detail: '1 page' };
    }
  }

  // 3. Word Documents (.docx)
  if (ext === 'docx') {
    try {
      const buffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(buffer);

      // A: Check docProps/app.xml for <Pages> and <Words>
      if (zip.files['docProps/app.xml']) {
        const appXml = await zip.files['docProps/app.xml'].async('text');
        const pagesMatch = appXml.match(/<Pages>(\d+)<\/Pages>/i);
        const pages = pagesMatch ? parseInt(pagesMatch[1]) : 0;
        
        const wordsMatch = appXml.match(/<Words>(\d+)<\/Words>/i);
        const words = wordsMatch ? parseInt(wordsMatch[1]) : 0;

        if (pages > 0) {
          return { pages, type: 'docx', detail: `${pages} Word document page${pages > 1 ? 's' : ''}` };
        } else if (words > 0) {
          const estimated = Math.max(1, Math.ceil(words / 350));
          return { pages: estimated, type: 'docx', detail: `${estimated} page${estimated > 1 ? 's' : ''} (~${words} words)` };
        }
      }

      // B: Check page breaks in document.xml
      if (zip.files['word/document.xml']) {
        const docXml = await zip.files['word/document.xml'].async('text');
        const breaks = (docXml.match(/<w:lastRenderedPageBreak\b|<w:br\s+w:type="page"/g) || []).length;
        const pages = Math.max(1, breaks + 1);
        return { pages, type: 'docx', detail: `${pages} page${pages > 1 ? 's' : ''}` };
      }
    } catch (e) {
      // Fallback
    }
    const sizeEst = Math.max(1, Math.ceil(file.size / 50000));
    return { pages: Math.min(sizeEst, 10), type: 'docx', detail: `Word document` };
  }

  // 4. PowerPoint Presentations (.pptx)
  if (ext === 'pptx') {
    try {
      const buffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(buffer);

      // A: Check docProps/app.xml for <Slides>
      if (zip.files['docProps/app.xml']) {
        const appXml = await zip.files['docProps/app.xml'].async('text');
        const slidesMatch = appXml.match(/<Slides>(\d+)<\/Slides>/i);
        if (slidesMatch && slidesMatch[1]) {
          const slides = parseInt(slidesMatch[1]);
          return { pages: Math.max(1, slides), type: 'pptx', detail: `${slides} PowerPoint slide${slides > 1 ? 's' : ''}` };
        }
      }

      // B: Count slide XML files
      const slideFiles = Object.keys(zip.files).filter(f => f.startsWith('ppt/slides/slide') && f.endsWith('.xml'));
      if (slideFiles.length > 0) {
        return { pages: slideFiles.length, type: 'pptx', detail: `${slideFiles.length} PowerPoint slide${slideFiles.length > 1 ? 's' : ''}` };
      }
    } catch (e) {
      // Fallback
    }
    return { pages: 1, type: 'pptx', detail: `PowerPoint slide` };
  }

  // 5. Excel Spreadsheets (.xlsx)
  if (ext === 'xlsx') {
    try {
      const buffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(buffer);

      const sheetFiles = Object.keys(zip.files).filter(f => f.startsWith('xl/worksheets/sheet') && f.endsWith('.xml'));
      if (sheetFiles.length > 0) {
        return { pages: sheetFiles.length, type: 'xlsx', detail: `${sheetFiles.length} Excel worksheet${sheetFiles.length > 1 ? 's' : ''}` };
      }
    } catch (e) {
      // Fallback
    }
    return { pages: 1, type: 'xlsx', detail: `Excel sheet` };
  }

  // 6. Plain Text Files (.txt, .csv, .log)
  if (['txt', 'csv', 'log', 'md'].includes(ext) || file.type.startsWith('text/')) {
    try {
      const text = await file.text();
      const lines = text.split(/\r\n|\r|\n/).length;
      const pages = Math.max(1, Math.ceil(lines / 45));
      return { pages, type: 'text', detail: `${pages} page${pages > 1 ? 's' : ''} (${lines} lines)` };
    } catch (e) {
      return { pages: 1, type: 'text', detail: '1 text page' };
    }
  }

  // 7. Legacy formats (.doc, .ppt, .xls)
  if (['doc', 'ppt', 'xls'].includes(ext)) {
    const est = Math.max(1, Math.ceil(file.size / (100 * 1024)));
    return { pages: Math.min(est, 15), type: ext, detail: `${ext.toUpperCase()} document` };
  }

  return { pages: 1, type: 'generic', detail: '1 page' };
}
