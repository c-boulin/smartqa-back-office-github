import type jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

export type CsvCell = string | number | null | undefined;

export function toCsv(rows: CsvCell[][]): string {
  const escape = (v: CsvCell) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return '\uFEFF' + rows.map(r => r.map(escape).join(',')).join('\n');
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// PDF DOM-capture helpers
// ---------------------------------------------------------------------------

export function waitForElementsToRender(): Promise<void> {
  return new Promise(resolve => {
    setTimeout(() => {
      requestAnimationFrame(() => {
        setTimeout(resolve, 800);
      });
    }, 500);
  });
}

const HTML2CANVAS_ONCLONE_CSS = `
  * {
    -webkit-print-color-adjust: exact !important;
    color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .lucide-info, svg[data-lucide="info"], .info-icon { display: none !important; }
  html, body { background-color: #FFFFFF !important; color: #111827 !important; }
  table { border-collapse: collapse !important; width: 100% !important; }
  th, td { border: 1px solid #E5E7EB !important; padding: 6px !important; text-align: left !important; }
  th { background-color: #F3F4F6 !important; font-weight: bold !important; }
  /* html2canvas clips glyph bottoms when overflow:hidden meets tight line-height —
     disable ellipsis-style clipping so labels render whole in the PDF. */
  .truncate, [class*="truncate"] {
    overflow: visible !important;
    text-overflow: clip !important;
  }
  /* Guarantee text has enough vertical room for descenders / bold ascenders. */
  h1, h2, h3, h4, h5, h6, p, span, div, li, a, button, label {
    line-height: 1.5 !important;
  }
`;

async function elementToCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  const rect = element.getBoundingClientRect();
  return html2canvas(element, {
    backgroundColor: '#FFFFFF',
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    width: rect.width,
    height: rect.height,
    windowWidth: Math.max(window.innerWidth, 1200),
    windowHeight: Math.max(window.innerHeight, 800),
    scrollX: 0,
    scrollY: 0,
    foreignObjectRendering: false,
    onclone: clonedDoc => {
      // Force light theme on the cloned document only — leaves the live app untouched.
      clonedDoc.documentElement.classList.remove('dark');
      clonedDoc.body.classList.remove('dark');
      const style = clonedDoc.createElement('style');
      style.textContent = HTML2CANVAS_ONCLONE_CSS;
      clonedDoc.head.appendChild(style);
    },
    ignoreElements: node => {
      if (node.classList?.contains('lucide-info') || node.classList?.contains('info-icon')) return true;
      return (
        node.classList?.contains('tooltip') ||
        node.classList?.contains('dropdown') ||
        (node as HTMLElement).style?.position === 'fixed'
      );
    },
  });
}

/**
 * Captures a DOM element into a single scaled image on the current page.
 * Returns the next y-cursor. Not suitable for tall elements — use
 * {@link captureElementAsPaginatedImage} instead for full-panel screenshots.
 */
export async function captureElementAsImage(
  element: HTMLElement,
  pdf: jsPDF,
  x: number,
  y: number,
  maxWidth: number,
  options: { addPageIfNeeded?: boolean; minHeight?: number; pageHeight?: number; topMargin?: number } = {},
): Promise<number> {
  const { addPageIfNeeded = true, minHeight = 50, pageHeight = 280, topMargin = 20 } = options;
  try {
    const canvas = await elementToCanvas(element);
    const scale = Math.min(maxWidth / (canvas.width / 2), 1);
    const scaledWidth = (canvas.width / 2) * scale;
    const scaledHeight = (canvas.height / 2) * scale;

    if (addPageIfNeeded && y + Math.max(scaledHeight, minHeight) > pageHeight - 15) {
      pdf.addPage();
      y = topMargin;
    }
    pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', x, y, scaledWidth, scaledHeight);
    return y + Math.max(scaledHeight, minHeight) + 10;
  } catch (err) {
    console.error('captureElementAsImage failed', err);
    return y + 40;
  }
}

/**
 * Captures a possibly-tall DOM element and slices the resulting image across
 * multiple A4 PDF pages so its on-screen layout is preserved at readable size.
 * Assumes A4 portrait (~210mm × ~297mm).
 */
export async function captureElementAsPaginatedImage(
  element: HTMLElement,
  pdf: jsPDF,
  options: {
    x?: number;
    startY?: number;
    contentWidth?: number;
    pageHeight?: number;
    topMargin?: number;
    bottomMargin?: number;
  } = {},
): Promise<void> {
  const {
    x = 15,
    startY = 15,
    contentWidth = 180,
    pageHeight = 297,
    topMargin = 15,
    bottomMargin = 15,
  } = options;

  const canvas = await elementToCanvas(element);
  const imgData = canvas.toDataURL('image/png', 1.0);

  const canvasAspect = canvas.height / canvas.width;
  const totalImgHeightMm = contentWidth * canvasAspect;
  const availableFirst = pageHeight - startY - bottomMargin;
  const availableRest = pageHeight - topMargin - bottomMargin;

  if (totalImgHeightMm <= availableFirst) {
    pdf.addImage(imgData, 'PNG', x, startY, contentWidth, totalImgHeightMm);
    return;
  }

  const pxPerMm = canvas.height / totalImgHeightMm;
  const whitespaceRows = findWhitespaceRows(canvas);
  const shiftToleranceMm = 18;

  let renderedMm = 0;
  let firstPage = true;
  while (renderedMm < totalImgHeightMm) {
    const available = firstPage ? availableFirst : availableRest;
    const yOffset = firstPage ? startY : topMargin;

    const naturalCutMm = renderedMm + available;
    let sliceHeightMm = available;
    if (naturalCutMm < totalImgHeightMm) {
      const safeCutMm = findSafeCutMm(whitespaceRows, pxPerMm, naturalCutMm, renderedMm, shiftToleranceMm);
      sliceHeightMm = safeCutMm - renderedMm;
    } else {
      sliceHeightMm = totalImgHeightMm - renderedMm;
    }

    const drawY = yOffset - renderedMm;
    pdf.addImage(imgData, 'PNG', x, drawY, contentWidth, totalImgHeightMm);

    pdf.setFillColor(255, 255, 255);
    if (drawY < yOffset) {
      pdf.rect(0, 0, pageHeight * 2, yOffset, 'F');
    }
    const bottomOfSlice = yOffset + sliceHeightMm;
    pdf.rect(0, bottomOfSlice, pageHeight * 2, pageHeight, 'F');

    renderedMm += sliceHeightMm;
    if (renderedMm < totalImgHeightMm) {
      pdf.addPage();
      firstPage = false;
    }
  }
}

/**
 * Scans the canvas top-to-bottom and returns the pixel-Y of rows that are
 * (near-)white — good candidates to slice through without cutting text.
 */
function findWhitespaceRows(canvas: HTMLCanvasElement): number[] {
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  let data: ImageData;
  try {
    data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch {
    return [];
  }
  const { width, height } = canvas;
  const rows: number[] = [];
  const step = Math.max(1, Math.floor(width / 200));
  const whiteThreshold = 245;
  for (let y = 0; y < height; y++) {
    let allWhite = true;
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const r = data.data[i];
      const g = data.data[i + 1];
      const b = data.data[i + 2];
      if (r < whiteThreshold || g < whiteThreshold || b < whiteThreshold) {
        allWhite = false;
        break;
      }
    }
    if (allWhite) rows.push(y);
  }
  return rows;
}

function findSafeCutMm(
  whitespaceRows: number[],
  pxPerMm: number,
  naturalCutMm: number,
  renderedMm: number,
  toleranceMm: number,
): number {
  if (whitespaceRows.length === 0) return naturalCutMm;
  const naturalCutPx = naturalCutMm * pxPerMm;
  const minCutPx = Math.max(renderedMm * pxPerMm + 20, (naturalCutMm - toleranceMm) * pxPerMm);
  let candidate = naturalCutMm;
  for (let i = whitespaceRows.length - 1; i >= 0; i--) {
    const row = whitespaceRows[i];
    if (row > naturalCutPx) continue;
    if (row < minCutPx) break;
    candidate = row / pxPerMm;
    break;
  }
  return candidate;
}
