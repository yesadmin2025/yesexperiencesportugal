/**
 * Minimal dependency-free PDF writer.
 *
 * Runs inside the Cloudflare Worker runtime (no native modules, no canvas):
 * emits a valid multi-page PDF using the base-14 Helvetica fonts and returns
 * it as a base64 string ready to be attached to a transactional email.
 */

export type PdfFont = "regular" | "bold" | "italic";

export interface PdfLine {
  text?: string;
  font?: PdfFont;
  size?: number;
  /** Extra vertical space (pt) before this line. */
  spaceBefore?: number;
  color?: [number, number, number];
  /** Draw a thin horizontal rule instead of text. */
  rule?: boolean;
}

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN_X = 56;
const MARGIN_TOP = 64;
const MARGIN_BOTTOM = 64;

const FONT_RES: Record<PdfFont, string> = {
  regular: "F1",
  bold: "F2",
  italic: "F3",
};

const FONT_BASE: Record<string, string> = {
  F1: "Helvetica",
  F2: "Helvetica-Bold",
  F3: "Helvetica-Oblique",
};

/** Approximate Helvetica advance widths (fraction of font size). */
function charWidth(ch: string, bold: boolean): number {
  const code = ch.charCodeAt(0);
  let w: number;
  if (ch === " ") w = 0.278;
  else if ("iljItf.,:;'|!".includes(ch)) w = 0.29;
  else if ("mwMW".includes(ch)) w = 0.86;
  else if (code >= 65 && code <= 90) w = 0.68;
  else w = 0.53;
  return bold ? w * 1.05 : w;
}

function textWidth(text: string, size: number, bold: boolean): number {
  let total = 0;
  for (const ch of text) total += charWidth(ch, bold);
  return total * size;
}

/** Latin-1 escape — PDF string literals need (, ) and \ escaped. */
function escapePdfText(text: string): string {
  return text
    .normalize("NFKD")
    // Strip anything outside Latin-1, which WinAnsiEncoding cannot render.
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrap(text: string, size: number, bold: boolean, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (textWidth(candidate, size, bold) <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Build a PDF from a flat list of lines and return it base64-encoded. */
export function renderSimplePdf(lines: PdfLine[]): string {
  const contentWidth = PAGE_W - MARGIN_X * 2;
  const pages: string[] = [];
  let ops: string[] = [];
  let y = PAGE_H - MARGIN_TOP;

  const newPage = () => {
    pages.push(ops.join("\n"));
    ops = [];
    y = PAGE_H - MARGIN_TOP;
  };

  for (const line of lines) {
    const size = line.size ?? 10.5;
    const font = line.font ?? "regular";
    const bold = font === "bold";
    const leading = size * 1.45;
    y -= line.spaceBefore ?? 0;

    if (line.rule) {
      if (y < MARGIN_BOTTOM) newPage();
      const [r, g, b] = line.color ?? [0.79, 0.66, 0.42];
      ops.push(
        `q ${r} ${g} ${b} RG 0.6 w ${MARGIN_X} ${y.toFixed(2)} m ${(PAGE_W - MARGIN_X).toFixed(2)} ${y.toFixed(2)} l S Q`,
      );
      y -= 8;
      continue;
    }

    const parts = wrap(line.text, size, bold, contentWidth);
    for (const part of parts) {
      if (y - leading < MARGIN_BOTTOM) newPage();
      const [r, g, b] = line.color ?? [0.18, 0.18, 0.18];
      ops.push(
        `BT ${r} ${g} ${b} rg /${FONT_RES[font]} ${size} Tf ${MARGIN_X} ${y.toFixed(2)} Td (${escapePdfText(part)}) Tj ET`,
      );
      y -= leading;
    }
  }
  pages.push(ops.join("\n"));

  // ── Assemble objects ────────────────────────────────────────────────────
  const objects: string[] = [];
  const pageCount = pages.length;
  const kidRefs: string[] = [];
  // 1: Catalog, 2: Pages, 3-5: fonts, then page + content pairs.
  const firstPageObj = 6;
  for (let i = 0; i < pageCount; i++) kidRefs.push(`${firstPageObj + i * 2} 0 R`);

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Count ${pageCount} /Kids [${kidRefs.join(" ")}] >>`;
  let fontObj = 3;
  for (const res of ["F1", "F2", "F3"]) {
    objects[fontObj] =
      `<< /Type /Font /Subtype /Type1 /BaseFont /${FONT_BASE[res]} /Encoding /WinAnsiEncoding >>`;
    fontObj += 1;
  }

  pages.forEach((content, i) => {
    const pageNum = firstPageObj + i * 2;
    objects[pageNum] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${pageNum + 1} 0 R >>`;
    objects[pageNum + 1] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  });

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let i = 1; i < objects.length; i++) {
    offsets[i] = pdf.length;
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = pdf.length;
  const total = objects.length;
  pdf += `xref\n0 ${total}\n0000000000 65535 f \n`;
  for (let i = 1; i < total; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return base64FromLatin1(pdf);
}

function base64FromLatin1(input: string): string {
  const bytes = new Uint8Array(input.length);
  for (let i = 0; i < input.length; i++) bytes[i] = input.charCodeAt(i) & 0xff;
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  // btoa exists in the Worker runtime and in Node 18+.
  return btoa(binary);
}
