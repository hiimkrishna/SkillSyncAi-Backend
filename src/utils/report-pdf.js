// src/utils/report-pdf.js
// Elegant, professional PDF reports for SkillSync AI (supervisor mod #6).
// Design language: deep-navy brand band with gold accent, serif display
// type, KPI cards, bar visualizations, navy-header tables with zebra
// rows, and a discreet footer. Built on pdfkit. Returns a Buffer.

import PDFDocument from "pdfkit";

// ============================================
// PALETTE & TYPE
// ============================================

const NAVY = "#0F1E33";
const NAVY_LIGHT = "#1B2F4D";
const GOLD = "#B79A6A";
const GOLD_DARK = "#9A7F52";
const INK = "#1E293B";
const MUTED = "#64748B";
const FAINT = "#94A3B8";
const LINE = "#E2E8F0";
const CARD_BG = "#F8FAFC";
const WHITE = "#FFFFFF";

const SERIF = "Times-Roman";
const SERIF_BOLD = "Times-Bold";
const SANS = "Helvetica";
const SANS_BOLD = "Helvetica-Bold";
const SANS_OBLIQUE = "Helvetica-Oblique";

const PAGE_MARGIN = 48;

// ============================================
// FORMATTERS
// ============================================

const fmtDate = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const fmtDateShort = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const fmtDateTime = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const prettyLabel = (key) =>
  String(key ?? "")
    .replace(/([A-Z])/g, " $1")
    .replace(/[_\-]+/g, " ")
    .replace(/^./, (c) => c.toUpperCase())
    .trim() || "—";

// ============================================
// DOCUMENT SCAFFOLD
// ============================================

const startDoc = (title) => {
  const doc = new PDFDocument({
    size: "A4",
    margin: PAGE_MARGIN,
    info: { Title: title, Author: "SkillSync AI" },
  });
  doc._pageNo = 1;
  doc._generatedAt = fmtDateTime(new Date());
  doc.on("pageAdded", () => {
    doc._pageNo += 1;
    stampFooter(doc);
  });
  return doc;
};

const contentWidth = (doc) =>
  doc.page.width - doc.page.margins.left - doc.page.margins.right;

const ensureSpace = (doc, heightNeeded) => {
  if (doc.y + heightNeeded > doc.page.height - doc.page.margins.bottom - 28) {
    doc.addPage();
  }
};

// Tables/bars position text with explicit x — restore the flow cursor
// afterwards so following paragraphs use the full content width.
const resetCursor = (doc) => {
  doc.x = doc.page.margins.left;
};

// Discreet footer: gold hairline + brand left / page right.
// Guarded: writing below the content area would otherwise trigger
// another pageAdded → infinite loop.
const stampFooter = (doc) => {
  if (doc._stampingFooter) return;
  doc._stampingFooter = true;
  const y = doc.y;
  const x = doc.x;
  // Footer sits inside the bottom margin: shrink the margin for this
  // write so pdfkit doesn't spawn a blank page underneath us.
  const margins = doc.page.margins;
  const savedBottom = margins.bottom;
  margins.bottom = 5;
  try {
    const left = doc.page.margins.left;
    const w = contentWidth(doc);
    const fy = doc.page.height - 30;
    doc
      .strokeColor(GOLD)
      .lineWidth(0.75)
      .moveTo(left, fy - 8)
      .lineTo(left + w, fy - 8)
      .stroke();
    doc.fontSize(7.5).fillColor(FAINT).font(SANS);
    doc.text("SkillSync AI  •  Confidential", left, fy, {
      width: w / 2,
    });
    doc.text(`Page ${doc._pageNo}  •  ${doc._generatedAt}`, left + w / 2, fy, {
      width: w / 2,
      align: "right",
    });
  } finally {
    margins.bottom = savedBottom;
    doc._stampingFooter = false;
    doc.y = y;
    doc.x = x;
  }
};

const toBuffer = (doc) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });

// ============================================
// BRAND BAND HEADER
// ============================================

const drawBrandBand = (doc, kicker, title, subtitle) => {
  const { width } = doc.page;
  const bandH = 118;

  doc.save();
  doc.rect(0, 0, width, bandH).fill(NAVY);
  // Gold accent bar + faint oversized watermark initial.
  doc.rect(0, bandH - 4, width, 4).fill(GOLD);
  doc
    .fontSize(96)
    .fillColor(NAVY_LIGHT)
    .font(SERIF_BOLD)
    .text("S", width - 92, -6, { width: 90, align: "right" });
  doc.restore();

  const left = doc.page.margins.left;
  doc.fillColor(GOLD).font(SANS_BOLD).fontSize(9);
  doc.text(kicker.toUpperCase(), left, 26, { characterSpacing: 2.5 });

  doc.fillColor(WHITE).font(SERIF_BOLD).fontSize(26);
  doc.text(title, left, 44, { width: width - left - 120 });

  if (subtitle) {
    doc.fillColor("#CBD5E1").font(SANS).fontSize(9.5);
    doc.text(subtitle, left, 78, {
      width: width - left - doc.page.margins.right,
    });
  }

  doc.y = bandH + 18;
  stampFooter(doc);
};

// Three-column meta strip under the band.
const drawMetaStrip = (doc, items) => {
  const left = doc.page.margins.left;
  const w = contentWidth(doc);
  const colW = w / Math.max(items.length, 1);
  const top = doc.y;
  let maxH = 0;

  items.forEach(([label, value], i) => {
    const x = left + i * colW;
    doc.fontSize(8).fillColor(MUTED).font(SANS_BOLD);
    doc.text(label.toUpperCase(), x, top, {
      width: colW - 12,
      characterSpacing: 1.2,
    });
    doc.fontSize(10).fillColor(INK).font(SANS);
    doc.text(String(value ?? "—"), x, doc.y + 2, { width: colW - 12 });
    maxH = Math.max(maxH, doc.y - top);
  });

  doc.y = top + maxH + 6;
  doc
    .strokeColor(LINE)
    .lineWidth(1)
    .moveTo(left, doc.y)
    .lineTo(left + w, doc.y)
    .stroke();
  doc.y += 14;
};

// ============================================
// SECTIONS, KPI CARDS, BARS, TABLES
// ============================================

const sectionTitle = (doc, title, hint) => {
  ensureSpace(doc, 60);
  const left = doc.page.margins.left;
  doc.fontSize(10).fillColor(NAVY).font(SANS_BOLD);
  doc.text(title.toUpperCase(), left, doc.y, { characterSpacing: 1.6 });
  if (hint) {
    doc.fontSize(8.5).fillColor(MUTED).font(SANS);
    doc.text(hint, left, doc.y + 2);
  }
  const ruleY = doc.y + 6;
  doc
    .strokeColor(GOLD)
    .lineWidth(2)
    .moveTo(left, ruleY)
    .lineTo(left + 44, ruleY)
    .stroke();
  doc.y = ruleY + 12;
};

// KPI stat cards, up to 4 per row.
const drawKpiCards = (doc, entries) => {
  if (!entries.length) return;
  const left = doc.page.margins.left;
  const w = contentWidth(doc);
  const gap = 10;
  const perRow = Math.min(4, entries.length);
  const cardW = (w - gap * (perRow - 1)) / perRow;
  const cardH = 64;

  const rows = [];
  for (let i = 0; i < entries.length; i += perRow) {
    rows.push(entries.slice(i, i + perRow));
  }

  for (const row of rows) {
    ensureSpace(doc, cardH + 10);
    const top = doc.y;
    row.forEach(([label, value], i) => {
      const x = left + i * (cardW + gap);
      doc
        .roundedRect(x, top, cardW, cardH, 8)
        .fillAndStroke(CARD_BG, LINE);
      // Gold tick at the top of each card.
      doc
        .roundedRect(x + 12, top + 10, 22, 3, 1.5)
        .fill(GOLD);
      doc.fontSize(20).fillColor(NAVY).font(SERIF_BOLD);
      doc.text(String(value ?? 0), x + 12, top + 18, { width: cardW - 24 });
      doc.fontSize(8).fillColor(MUTED).font(SANS_BOLD);
      doc.text(String(label).toUpperCase(), x + 12, top + 42, {
        width: cardW - 24,
        characterSpacing: 0.8,
      });
    });
    doc.y = top + cardH + 10;
  }
  doc.y += 4;
  resetCursor(doc);
};

// Horizontal bar breakdown with counts + percentages.
const drawBars = (doc, entries, { emptyText = "No records." } = {}) => {
  const left = doc.page.margins.left;
  const w = contentWidth(doc);

  if (!entries.length) {
    resetCursor(doc);
    doc.fontSize(9).fillColor(MUTED).font(SANS_OBLIQUE).text(emptyText);
    doc.moveDown(0.5);
    return;
  }

  const total = entries.reduce((sum, [, v]) => sum + Number(v || 0), 0) || 1;
  const max = Math.max(...entries.map(([, v]) => Number(v || 0)), 1);

  for (const [label, rawValue] of entries) {
    const value = Number(rawValue || 0);
    const pct = Math.round((value / total) * 100);
    ensureSpace(doc, 34);

    doc.fontSize(9).fillColor(INK).font(SANS_BOLD);
    doc.text(prettyLabel(label), left, doc.y, { width: 150, continued: false });
    const labelY = doc.y;
    doc.fontSize(9).fillColor(MUTED).font(SANS);
    doc.text(`${value}  •  ${pct}%`, left + w - 90, labelY - 12, {
      width: 90,
      align: "right",
    });

    const barX = left + 160;
    const barW = w - 160 - 96;
    const barY = doc.y + 2;
    const barH = 8;
    doc.roundedRect(barX, barY, barW, barH, 4).fill("#EDF1F6");
    if (value > 0) {
      doc
        .roundedRect(barX, barY, Math.max((barW * value) / max, 10), barH, 4)
        .fill(GOLD);
    }
    doc.y = barY + barH + 10;
  }
  doc.y += 4;
  resetCursor(doc);
};

// Polished data table: navy header, zebra rows, generous padding.
const drawTable = (doc, columns, rows, { emptyText = "No records." } = {}) => {
  const left = doc.page.margins.left;
  const w = contentWidth(doc);
  const widths = columns.map((c) => (w * c.width) / 100);
  const pad = 7;
  const headerH = 24;

  const rowHeight = (cells) => {
    doc.font(SANS).fontSize(9);
    let max = 13;
    cells.forEach((cell, i) => {
      const h = doc.heightOfString(String(cell ?? "—"), {
        width: widths[i] - pad * 2,
      });
      if (h > max) max = h;
    });
    return max + pad * 2;
  };

  const paintRow = (cells, { header = false, zebra = false } = {}) => {
    const h = header ? headerH : rowHeight(cells);
    ensureSpace(doc, h + 2);
    const top = doc.y;
    if (header) {
      doc.rect(left, top, w, h).fill(NAVY);
    } else if (zebra) {
      doc.rect(left, top, w, h).fill(CARD_BG);
    }
    let x = left;
    cells.forEach((cell, i) => {
      doc
        .fontSize(header ? 8.5 : 9)
        .fillColor(header ? WHITE : INK)
        .font(header ? SANS_BOLD : SANS);
      const textTop = top + (header ? 7 : pad);
      const align = columns[i].align || "left";
      doc.text(String(cell ?? "—"), x + pad, textTop, {
        width: widths[i] - pad * 2,
        align,
      });
      x += widths[i];
    });
    doc.y = top + h;
    if (!header) {
      doc
        .strokeColor(LINE)
        .lineWidth(0.5)
        .moveTo(left, doc.y)
        .lineTo(left + w, doc.y)
        .stroke();
    }
  };

  paintRow(columns.map((c) => c.title.toUpperCase()), { header: true });
  if (!rows.length) {
    doc.moveDown(0.4);
    resetCursor(doc);
    doc.fontSize(9).fillColor(MUTED).font(SANS_OBLIQUE).text(emptyText);
    doc.moveDown(0.4);
    return;
  }
  rows.forEach((row, i) => paintRow(row, { zebra: i % 2 === 1 }));
  doc.y += 8;
  resetCursor(doc);
};

// ============================================
// ROLE REPORT (candidate / recruiter)
// ============================================

export const buildRoleReportPdf = async (data, { generatedFor } = {}) => {
  const isRecruiter = data?.role === "recruiter";
  const title = isRecruiter ? "Hiring Report" : "My Applications Report";
  const doc = startDoc(`SkillSync AI — ${title}`);

  const range = data?.range ?? {};
  drawBrandBand(
    doc,
    isRecruiter ? "Recruiter  •  Hiring" : "Candidate  •  Applications",
    title,
    isRecruiter
      ? "Applications received on your jobs for the selected period."
      : "Your job applications for the selected period.",
  );
  drawMetaStrip(doc, [
    ["Prepared for", generatedFor ?? "—"],
    ["Period", `${fmtDateShort(range.from)}  →  ${fmtDateShort(range.to)}`],
    ["Applications", String(data?.applications?.length ?? 0)],
  ]);

  sectionTitle(doc, "At a glance", "Key totals for this period");
  drawKpiCards(
    doc,
    Object.entries(data?.totals ?? {}).map(([k, v]) => [prettyLabel(k), v]),
  );

  sectionTitle(doc, "Applications by status", "Share of each hiring stage");
  drawBars(
    doc,
    Object.entries(data?.byStatus ?? {}),
    { emptyText: "No applications in this period." },
  );

  if (isRecruiter && Array.isArray(data?.byJob)) {
    sectionTitle(doc, "Performance by job", "Ranked by applications received");
    drawTable(
      doc,
      [
        { title: "Job", width: 40 },
        { title: "Applications", width: 15, align: "right" },
        { title: "Shortlisted", width: 15, align: "right" },
        { title: "Hired", width: 15, align: "right" },
        { title: "Rejected", width: 15, align: "right" },
      ],
      data.byJob.map((j) => [
        j.title,
        j.applications,
        j.shortlisted,
        j.hired,
        j.rejected,
      ]),
      { emptyText: "No jobs with applications in this period." },
    );
  }

  sectionTitle(
    doc,
    isRecruiter ? "Applications received" : "Application history",
    "Most recent first · up to 200 shown",
  );
  const apps = [...(Array.isArray(data?.applications) ? data.applications : [])]
    .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt))
    .slice(0, 200);
  drawTable(
    doc,
    isRecruiter
      ? [
          { title: "Candidate", width: 24 },
          { title: "Position", width: 30 },
          { title: "Status", width: 18 },
          { title: "Applied", width: 28, align: "right" },
        ]
      : [
          { title: "Position", width: 32 },
          { title: "Company", width: 26 },
          { title: "Status", width: 16 },
          { title: "Applied", width: 26, align: "right" },
        ],
    apps.map((a) =>
      isRecruiter
        ? [a.candidateName, a.position, prettyLabel(a.status), fmtDate(a.appliedAt)]
        : [a.position, a.company, prettyLabel(a.status), fmtDate(a.appliedAt)],
    ),
    { emptyText: "No applications in this period." },
  );

  // Closing note.
  resetCursor(doc);
  doc.fontSize(8.5).fillColor(MUTED).font(SANS_OBLIQUE);
  doc.text(
    "This report was generated automatically by SkillSync AI from live platform data.",
    doc.page.margins.left,
    doc.y,
    { width: contentWidth(doc), align: "center" },
  );

  return toBuffer(doc);
};

// ============================================
// ADMIN PLATFORM REPORT
// ============================================

export const buildAdminReportPdf = async (data, { generatedFor } = {}) => {
  const doc = startDoc("SkillSync AI — Platform Report");

  drawBrandBand(
    doc,
    "Administration  •  Platform",
    "Platform Report",
    "SkillSync AI at a glance — trailing 30 days.",
  );
  drawMetaStrip(doc, [
    ["Prepared for", generatedFor ?? "—"],
    ["Window", "Trailing 30 days"],
    ["Top jobs shown", String(data?.topJobs?.length ?? 0)],
  ]);

  const growth = data?.growth?.last30Days ?? {};
  sectionTitle(doc, "Growth", "New activity in the last 30 days");
  drawKpiCards(doc, [
    ["New users", growth.newUsers ?? 0],
    ["New jobs", growth.newJobs ?? 0],
    ["New applications", growth.newApplications ?? 0],
  ]);

  sectionTitle(doc, "Applications by status", "Platform-wide pipeline");
  drawBars(doc, Object.entries(data?.applicationsByStatus ?? {}));

  sectionTitle(doc, "Jobs by status", "Open versus closed");
  drawBars(doc, Object.entries(data?.jobsByStatus ?? {}));

  sectionTitle(doc, "Top jobs", "Ranked by applicant volume");
  const topJobs = Array.isArray(data?.topJobs) ? data.topJobs : [];
  drawTable(
    doc,
    [
      { title: "#", width: 8, align: "right" },
      { title: "Job", width: 42 },
      { title: "Company", width: 30 },
      { title: "Applicants", width: 20, align: "right" },
    ],
    topJobs.map((j, i) => [i + 1, j.title, j.company, j.applicantCount ?? 0]),
    { emptyText: "No jobs yet." },
  );

  resetCursor(doc);
  doc.fontSize(8.5).fillColor(MUTED).font(SANS_OBLIQUE);
  doc.text(
    "This report was generated automatically by SkillSync AI from live platform data.",
    doc.page.margins.left,
    doc.y,
    { width: contentWidth(doc), align: "center" },
  );

  return toBuffer(doc);
};
