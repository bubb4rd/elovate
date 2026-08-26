export type OcrWord = {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

type VisionVertex = { x?: number | null; y?: number | null };

type VisionWord = {
  boundingBox?: { vertices?: VisionVertex[] | null } | null;
  symbols?: Array<{ text?: string | null }> | null;
};

type VisionPage = {
  blocks?: Array<{
    paragraphs?: Array<{ words?: VisionWord[] | null }> | null;
  }> | null;
};

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

function boxOf(word: VisionWord): { x: number; y: number; w: number; h: number } | null {
  const verts = word.boundingBox?.vertices ?? [];
  if (verts.length < 2) return null;
  const xs = verts.map((v) => v.x ?? 0);
  const ys = verts.map((v) => v.y ?? 0);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

export function wordsFromVisionPages(pages: VisionPage[] | null | undefined): OcrWord[] {
  const words: OcrWord[] = [];
  for (const page of pages ?? []) {
    for (const block of page.blocks ?? []) {
      for (const para of block.paragraphs ?? []) {
        for (const word of para.words ?? []) {
          const text = (word.symbols ?? [])
            .map((s) => s.text ?? "")
            .join("")
            .trim();
          if (!text) continue;
          const box = boxOf(word);
          if (!box) continue;
          words.push({ text, ...box });
        }
      }
    }
  }
  return words;
}

/** Drop giant background watermarks (PLACEMENT / ELIMINATIONS) that dwarf row text. */
export function withoutWatermarks(words: readonly OcrWord[]): OcrWord[] {
  if (words.length < 4) return [...words];
  const med = median(words.map((w) => w.h));
  if (med <= 0) return [...words];
  const cap = med * 2.2;
  return words.filter((w) => w.h <= cap);
}

/** Cluster words into visual rows (top-to-bottom, then left-to-right). */
export function linesFromOcrWords(words: readonly OcrWord[]): string[] {
  const usable = withoutWatermarks(words);
  if (!usable.length) return [];
  const medH = median(usable.map((w) => w.h)) || 12;
  const yTol = Math.max(8, medH * 0.65);
  const sorted = [...usable].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: OcrWord[][] = [];
  for (const word of sorted) {
    const last = rows[rows.length - 1];
    if (!last) {
      rows.push([word]);
      continue;
    }
    const rowY = last.reduce((sum, w) => sum + w.y, 0) / last.length;
    if (Math.abs(word.y - rowY) <= yTol) last.push(word);
    else rows.push([word]);
  }
  return rows
    .map((row) =>
      row
        .sort((a, b) => a.x - b.x)
        .map((w) => w.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}

export function readingOrderText(words: readonly OcrWord[]): string {
  return linesFromOcrWords(words).join("\n");
}
