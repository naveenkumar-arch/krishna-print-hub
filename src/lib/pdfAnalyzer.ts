/**
 * Krishna Students Print Hub - AI PDF Preprocessor & Analyzer
 * 
 * Inspects PDF binary structures to extract:
 * 1. Exact Page Count
 * 2. Auto-Rotation Recommendations (Landscape vs Portrait check)
 * 3. Blank Page Detection (checks for drawing operator streams)
 */

export interface PDFAnalysisResult {
  totalPages: number;
  blankPages: number;
  landscapePages: number;
  isCorrupted: boolean;
  orientation: 'portrait' | 'landscape' | 'mixed';
  lowDpiWarning?: boolean;
  qualityScore?: number;
}

export function analyzePDFBuffer(buffer: Buffer): PDFAnalysisResult {
  try {
    const text = buffer.toString('binary');
    
    // Check PDF header signature
    if (!text.startsWith('%PDF-')) {
      return { totalPages: 1, blankPages: 0, landscapePages: 0, isCorrupted: true, orientation: 'portrait', lowDpiWarning: false, qualityScore: 100 };
    }

    // 1. Page matches parsing
    const pageMatches = [...text.matchAll(/\/Type\s*\/Page\b/g)];
    const totalPages = pageMatches.length || 1;

    let blankPages = 0;
    let landscapePages = 0;
    let lowDpiWarning = false;
    let qualityScore = 100;

    const parseBox = (str: string, key: string): [number, number] | null => {
      const idx = str.indexOf(key);
      if (idx === -1) return null;
      const start = str.indexOf('[', idx);
      const end = str.indexOf(']', start);
      if (start === -1 || end === -1) return null;
      
      const numbers = str.substring(start + 1, end).trim().split(/\s+/).map(Number);
      if (numbers.length >= 4) {
        const width = Math.abs(numbers[2] - numbers[0]);
        const height = Math.abs(numbers[3] - numbers[1]);
        return [width, height];
      }
      return null;
    };

    // 2. Scan objects
    const objRegex = /(\d+)\s+(\d+)\s+obj([\s\S]*?)endobj/g;
    const matches = [...text.matchAll(objRegex)];

    const pageBoxes: [number, number][] = [];
    const streams: Map<string, string> = new Map();

    for (const m of matches) {
      const objNum = m[1];
      const content = m[3];

      if (content.indexOf("stream") !== -1 && content.indexOf("endstream") !== -1) {
        const strStart = content.indexOf("stream") + 6;
        const strEnd = content.indexOf("endstream");
        streams.set(objNum, content.substring(strStart, strEnd).trim());
      }

      if (content.indexOf("/Type") !== -1 && content.indexOf("/Page") !== -1) {
        const box = parseBox(content, "/MediaBox") || parseBox(content, "/CropBox");
        if (box) {
          pageBoxes.push(box);
        } else {
          pageBoxes.push([595.27, 841.89]); // A4
        }
      }

      // AI Quality check: Scan image objects (/Subtype /Image) for pixel dimensions (DPI/Resolution verification)
      if (content.indexOf("/Subtype") !== -1 && content.indexOf("/Image") !== -1) {
        const widthMatch = content.match(/\/Width\s+(\d+)/);
        const heightMatch = content.match(/\/Height\s+(\d+)/);
        
        if (widthMatch && heightMatch) {
          const w = parseInt(widthMatch[1]);
          const h = parseInt(heightMatch[1]);

          // Scan for low resolution elements
          if (w < 150 || h < 150) {
            lowDpiWarning = true;
            qualityScore = Math.min(qualityScore, 45); // Bad resolution
          } else if (w < 400 || h < 400) {
            lowDpiWarning = true;
            qualityScore = Math.min(qualityScore, 70); // Warning threshold
          }
        }
      }
    }

    while (pageBoxes.length < totalPages) {
      pageBoxes.push([595.27, 841.89]);
    }

    // 3. Evaluate Orientation and Blank pages
    for (let i = 0; i < totalPages; i++) {
      const box = pageBoxes[i] || [595.27, 841.89];
      const w = box[0];
      const h = box[1];

      if (w > h) {
        landscapePages++;
      }
    }

    streams.forEach((content) => {
      const hasText = content.indexOf("Tj") !== -1 || content.indexOf("TJ") !== -1 || content.indexOf("'") !== -1 || content.indexOf("\"") !== -1;
      const hasGraphics = content.indexOf("stroke") !== -1 || content.indexOf("fill") !== -1 || content.indexOf("Do") !== -1 || content.indexOf(" re ") !== -1 || content.indexOf(" l ") !== -1;
      
      if (!hasText && !hasGraphics && content.length < 50) {
        blankPages++;
      }
    });

    if (blankPages > totalPages) {
      blankPages = Math.round(totalPages * 0.1);
    }

    let orientation: 'portrait' | 'landscape' | 'mixed' = 'portrait';
    if (landscapePages === totalPages) {
      orientation = 'landscape';
    } else if (landscapePages > 0) {
      orientation = 'mixed';
    }

    return {
      totalPages,
      blankPages,
      landscapePages,
      isCorrupted: false,
      orientation,
      lowDpiWarning,
      qualityScore
    };

  } catch (err) {
    return {
      totalPages: 1,
      blankPages: 0,
      landscapePages: 0,
      isCorrupted: true,
      orientation: 'portrait',
      lowDpiWarning: false,
      qualityScore: 100
    };
  }
}
