/**
 * Builds docs/client-guide/Client-Product-Guide.docx with embedded PNG flowcharts (from SVG).
 * Run: npm run docs:client-guide-docx
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableCell,
  TableRow,
  WidthType,
  HeadingLevel,
  AlignmentType,
  ImageRun,
  BorderStyle,
  PageBreak,
} from "docx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const guideDir = path.join(root, "docs", "client-guide");
const outPath = path.join(guideDir, "Client-Product-Guide.docx");

/** Twip width for full table (~6.5in). Avoid WidthType.PERCENTAGE — docx emits invalid w:w="25%" for Pages. */
const TABLE_TOTAL_DXA = 9360;

function columnWidthsEqual(nCols) {
  const base = Math.floor(TABLE_TOTAL_DXA / nCols);
  const widths = Array.from({ length: nCols }, () => base);
  widths[nCols - 1] += TABLE_TOTAL_DXA - base * nCols;
  return widths;
}

const PLAN_COMPARE_COL_WIDTHS = columnWidthsEqual(4);

async function svgToImageRun(svgFile, maxWidth = 560) {
  const svgPath = path.join(guideDir, svgFile);
  const buf = await sharp(svgPath).resize({ width: maxWidth }).png().toBuffer();
  const meta = await sharp(buf).metadata();
  const w = meta.width ?? maxWidth;
  const h = meta.height ?? 400;
  return new ImageRun({
    data: buf,
    transformation: { width: w, height: h },
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, ...opts })],
    spacing: { after: 120 },
  });
}

function h1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 200 },
    thematicBreak: false,
  });
}

function h2(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 160 },
  });
}

function h3(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 160, after: 120 },
  });
}

function cell(text, header = false, colIndex = 0) {
  return new TableCell({
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    },
    width: { size: PLAN_COMPARE_COL_WIDTHS[colIndex], type: WidthType.DXA },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: header,
            size: header ? 22 : 20,
          }),
        ],
      }),
    ],
  });
}

function tableRow4(texts, header = false) {
  return new TableRow({
    children: texts.map((t, i) => cell(t, header, i)),
  });
}

async function main() {
  const imgStarter = await svgToImageRun("flowchart-starter.svg");
  const imgGrowth = await svgToImageRun("flowchart-growth.svg");
  const imgElite = await svgToImageRun("flowchart-elite.svg");

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: "AI SEO Tool — Client Product Guide",
                bold: true,
                size: 36,
              }),
            ],
          }),
          p("Audience: Business clients using the platform"),
          p(
            "Scope: Phase 0 (presets), Phase 2 (Search Console, keywords, audit before/after), Phase 3 (execution calendar/checklist/social/audit blocks), Phase 4 (unified growth score, competitor watchlist, lead-magnet landing copy, social proof lines, monthly executive email with optional PDF on Elite)."
          ),
          p("Updated: March 2026"),
          new Paragraph({ spacing: { after: 200 }, children: [] }),

          h1("1. What this tool does"),
          p(
            "AI SEO Tool helps you understand how your website is performing, see what people search for when you connect Google Search Console, and track important keywords next to real click and ranking data. Your business profile (industry, goals, target keywords) tunes AI audits and suggestions."
          ),
          p(
            "Depending on your plan, you may also get AI blog drafts, a backlink checklist, and (Elite) social ads workflows—usually coordinated with your agency."
          ),

          h1("2. Plan comparison"),
          new Table({
            width: { size: TABLE_TOTAL_DXA, type: WidthType.DXA },
            rows: [
              tableRow4(["Capability", "Starter ₹499", "Growth ₹899", "Elite ₹1,599"], true),
              tableRow4(["Dashboard & business profile", "Yes", "Yes", "Yes"]),
              tableRow4(["Industry vertical & marketing goal presets", "Yes", "Yes", "Yes"]),
              tableRow4(["Site audit (AI + Lighthouse)", "Yes", "Yes", "Yes"]),
              tableRow4(["Site crawl", "Yes", "Yes", "Yes"]),
              tableRow4([
                "Search performance (Google Search Console)",
                "Yes",
                "Yes",
                "Yes",
              ]),
              tableRow4(["Keywords & topics + GSC match", "Up to 10", "Up to 50", "Up to 100"]),
              tableRow4(["Audit progress (before / after)", "Yes", "Yes", "Yes"]),
              tableRow4(["Unified growth score (Overview)", "Yes", "Yes", "Yes"]),
              tableRow4(["Competitor homepage watchlist + diff", "1 URL", "3 URLs", "5 URLs"]),
              tableRow4(["Lead magnet landing blocks (Site audit)", "Yes", "Yes", "Yes"]),
              tableRow4(["Social proof lines (needs two audits)", "Yes", "Yes", "Yes"]),
              tableRow4(["Monthly executive email (+ PDF Elite)", "—", "Opt-in", "Opt-in + PDF"]),
              tableRow4(["AI blogs", "—", "Yes (weekly limit)", "Yes"]),
              tableRow4(["Backlink checklist", "—", "Yes", "Yes"]),
              tableRow4([
                "Content calendar (from pillars + manual)",
                "Up to 2 items",
                "Large capacity",
                "Large capacity",
              ]),
              tableRow4(["On-page checklist per URL", "Yes", "Yes", "Yes"]),
              tableRow4([
                "Social caption packs",
                "Audit: LinkedIn only",
                "Audit + blog: 3 platforms",
                "Audit + blog: 3 platforms",
              ]),
              tableRow4(["Audit: CTA, FAQ, objections, lead capture", "Yes", "Yes", "Yes"]),
              tableRow4(["Social ads (Meta/Instagram)", "—", "—", "Yes"]),
            ],
          }),
          p("Your agency activates the plan. Search Console requires your Google account and a verified property."),

          h1("3. Starter plan — how to use it"),
          h3("Flowchart — Starter journey"),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [imgStarter],
            spacing: { after: 200 },
          }),
          h2("Step by step"),
          p("1. Receive access — your admin creates your account and assigns Starter."),
          p("2. Log in with email and password."),
          p(
            "3. Business profile — Dashboard → Business profile. Add website URL, business name, industry, target keywords (comma-separated), industry vertical, and marketing goal. Save."
          ),
          p("4. Site audit — run an audit on your URL; review findings and Lighthouse scores. Re-run later to track progress."),
          p("5. Site crawl — use multi-page crawl when you need a wider site health view."),
          p(
            "6. Search performance — connect Google Search Console (read-only), sync, and review top queries for ~28 days."
          ),
          p(
            "7. Keywords — review auto-suggested terms (profile, audit pillars, GSC) within the 10-keyword cap; edit, add, or export CSV."
          ),
          p("8. Overview — read audit summary, Audit progress card, and the Unified growth score with optional breakdown."),
          p(
            "9. Competitors — save competitor homepages under Competitors; refresh snapshots to diff title, meta description, and H1 counts (plan limits apply)."
          ),
          p(
            "10. Content calendar — plan posts; Starter has a small item cap, Growth/Elite a large cap. Seed rows from Site audit content pillars when available."
          ),
          p(
            "11. On-page checklist — open the checklist page, confirm the URL, save, and tick off meta, headings, schema, speed, links, and conversion tasks. Progress is stored per URL."
          ),
          p(
            "12. Site audit extras — CTA and form tips, FAQ blocks, objection handlers, lead capture score, lead-magnet landing blocks, and social proof lines when two audits exist. Copy from the audit screen."
          ),
          p(
            "13. Social captions — from any audit run use Generate captions (Starter: LinkedIn only; Growth/Elite: three platforms). On Growth/Elite, open a blog post and use Social post pack."
          ),

          new Paragraph({ children: [new PageBreak()] }),

          h1("4. Growth plan — how to use it"),
          p("Everything in Starter, plus blogs and backlinks."),
          h3("Flowchart — Growth journey"),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [imgGrowth],
            spacing: { after: 200 },
          }),
          h2("Additional steps"),
          p(
            "9. Blogs — open Blogs; your agency may generate AI articles aligned to your presets. Respect your weekly blog limit shown on the dashboard."
          ),
          p(
            "10. Backlinks — work the directory checklist; mark submissions verified where applicable. Overview shows batch progress."
          ),
          p("11. Keywords — up to 50 tracked terms; use Refresh suggestions after profile or GSC updates."),
          p(
            "12. Phase 3–4 execution — same as Starter with a higher calendar cap; Social post pack on each blog; audit-based captions on every audit run."
          ),
          p(
            "13. Monthly executive email — Business profile: opt in for a scheduled HTML summary (server needs Resend). Elite adds a PDF attachment."
          ),

          new Paragraph({ children: [new PageBreak()] }),

          h1("5. Elite plan — how to use it"),
          p("Everything in Growth, plus Social ads for Meta/Instagram workflows."),
          h3("Flowchart — Elite journey"),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [imgElite],
            spacing: { after: 200 },
          }),
          h2("Additional steps"),
          p(
            "12. Social ads — connect Meta/Instagram where the UI allows; your agency coordinates drafts and posting depends on Meta app setup."
          ),
          p("13. Keywords — up to 100 tracked terms."),
          p(
            "14. Full Growth stack plus Elite social ads for paid campaigns; monthly email includes PDF attachment when opt-in is enabled."
          ),

          h1("6. Automatic keyword suggestions"),
          p(
            "Suggestions come from: target keywords field, industry text, business name, vertical label, content pillar ideas from your latest audit, and top Search Console queries (after sync), up to your plan limit."
          ),
          p("Saving an edited phrase marks it as yours (manual). Refresh suggestions merges new ideas without removing your manual rows arbitrarily."),

          h1("7. Roles"),
          p("You: edit profile, run audits, connect Search Console, manage keywords, use blogs/backlinks/social per plan."),
          p("Agency: assigns plan, may generate blogs or ad drafts, can adjust your profile if agreed."),

          h1("8. Phase 4 summary"),
          p(
            "Unified growth score narrates progress in one number. Competitor watchlist keeps homepage signals honest. Lead-magnet blocks and social proof lines reuse audit output. Growth and Elite can receive a monthly email; Elite may attach a PDF brief."
          ),

          h1("9. Phase 3 recap"),
          p(
            "Content calendar, on-page checklist, and social caption packs turn audits and blogs into weekly work. CTA, FAQ, objection, and lead capture blocks ship with every new Site audit."
          ),

          h1("10. Glossary"),
          p("Lighthouse / lab scores — automated quality scores (performance, SEO, accessibility, best practices)."),
          p("Search Console — Google query data; we import recent aggregates after you authorize read-only access."),
          p("Tracked keyword — a phrase you track; we match it to Search Console queries when possible."),
          p("Audit progress — compares your first saved audit to your latest to show change over time."),
          p(
            "Growth score (v1) — weighted blend of latest lab SEO, opportunity index, trajectory between audits, checklist completion, and (Growth+) blog cadence, minus a small deduction for unresolved high-severity findings."
          ),
          p(
            "Competitor snapshot — stored title, meta description, and H1 count from a competitor URL; refreshing replaces it and shows a diff from the previous capture."
          ),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 400 },
            children: [
              new TextRun({
                text: "AI SEO Tool — Client Product Guide · Phases 0, 2, 3 & 4",
                italics: true,
                size: 18,
                color: "888888",
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outPath, buffer);
  console.log("Wrote", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
