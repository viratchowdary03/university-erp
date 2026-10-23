// Minimal PDF writer (no dependencies): A4 pages of text lines, for receipts, certificates and marksheets.
// blocks: [{ text, size = 11, bold = false, align = "left" | "center", gap = 6, rule = false, cols = [x positions], cells = [] }]
const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 50;

// Only Latin-1 characters exist in the built-in fonts; anything else becomes "?"
const clean = (s) =>
  String(s ?? "")
    .replace(/₹/g, "Rs. ")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
const esc = (s) => clean(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

// rough width of Helvetica text, good enough for centring and wrapping
const width = (text, size, bold) => clean(text).length * size * (bold ? 0.56 : 0.5);

function wrap(text, size, bold, maxWidth) {
  const out = [];
  let line = "";
  for (const word of clean(text).split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && width(next, size, bold) > maxWidth) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out.length ? out : [""];
}

export function buildPdf(blocks) {
  const pages = [[]];
  let y = PAGE_H - MARGIN;
  const emit = (op) => pages[pages.length - 1].push(op);
  const need = (h) => {
    if (y - h < MARGIN) {
      pages.push([]);
      y = PAGE_H - MARGIN;
    }
  };

  for (const b of blocks) {
    const size = b.size || 11;
    const bold = Boolean(b.bold);
    const font = bold ? "F2" : "F1";
    const lead = size * 1.35;
    if (b.rule) {
      need(10);
      emit(`0.7 w ${MARGIN} ${y} m ${PAGE_W - MARGIN} ${y} l S`);
      y -= b.gap ?? 10;
      continue;
    }
    if (b.cells) {
      need(lead);
      b.cells.forEach((cell, i) => emit(`BT /${font} ${size} Tf ${b.cols[i]} ${y} Td (${esc(String(cell).slice(0, 60))}) Tj ET`));
      y -= lead + (b.gap ?? 2);
      continue;
    }
    for (const line of wrap(b.text ?? "", size, bold, PAGE_W - 2 * MARGIN)) {
      need(lead);
      const x = b.align === "center" ? (PAGE_W - width(line, size, bold)) / 2 : MARGIN;
      emit(`BT /${font} ${size} Tf ${Math.max(MARGIN, x).toFixed(1)} ${y.toFixed(1)} Td (${esc(line)}) Tj ET`);
      y -= lead;
    }
    y -= b.gap ?? 6;
  }

  // objects: 1 catalog, 2 pages, 3-4 fonts, then (page, content) pairs
  const objects = [];
  const pageIds = pages.map((_, i) => 5 + i * 2);
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  pages.forEach((ops, i) => {
    const stream = ops.join("\n");
    objects[5 + i * 2] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + i * 2} 0 R >>`;
    objects[6 + i * 2] = `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`;
  });

  let out = "%PDF-1.4\n";
  const offsets = [];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = Buffer.byteLength(out, "latin1");
    out += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) out += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, "latin1");
}

export function sendPdf(res, filename, blocks) {
  const pdf = buildPdf(blocks);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename.replace(/[^\w.-]/g, "_")}"`);
  res.setHeader("Content-Length", pdf.length);
  res.end(pdf);
}
