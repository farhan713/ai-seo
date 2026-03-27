/**
 * Builds separate Word guides under docs/client-guide/:
 *   User-Guide-Starter.docx
 *   User-Guide-Growth.docx
 *   User-Guide-Elite.docx
 *   QA-Full-Product-Test-Matrix.docx
 * Run: npm run docs:user-guides-docx
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
} from "docx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const guideDir = path.join(root, "docs", "client-guide");

async function svgToImageRun(svgFile, maxWidth = 520) {
  const svgPath = path.join(guideDir, svgFile);
  const buf = await sharp(svgPath).resize({ width: maxWidth }).png().toBuffer();
  const meta = await sharp(buf).metadata();
  const w = meta.width ?? maxWidth;
  const h = meta.height ?? 360;
  return new ImageRun({
    data: buf,
    transformation: { width: w, height: h },
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, ...opts })],
    spacing: { after: 140 },
  });
}

function h1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 280, after: 200 },
  });
}

function h2(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 220, after: 160 },
  });
}

function h3(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 120 },
  });
}

function bullet(text) {
  return new Paragraph({
    children: [
      new TextRun({ text: "•  ", bold: true, size: 22 }),
      new TextRun({ text, size: 22 }),
    ],
    indent: { left: 400, hanging: 280 },
    spacing: { after: 100 },
  });
}

function cell(text, header = false, size = 20) {
  return new TableCell({
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    },
    width: { size: 25, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        children: [new TextRun({ text: String(text), bold: header, size: header ? 21 : size })],
      }),
    ],
  });
}

function tableFromRows(headerRow, dataRows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: headerRow.map((h, i) => cell(h, true)) }),
      ...dataRows.map((r) => new TableRow({ children: r.map((c) => cell(c, false)) })),
    ],
  });
}

function cover(mainTitle, subtitle, planLine) {
  const gen = new Date().toISOString().slice(0, 10);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: "AI SEO Tool", bold: true, size: 44 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: mainTitle, size: 32, bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: subtitle, size: 24 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 320 },
      children: [new TextRun({ text: planLine, size: 22, italics: true, color: "444444" })],
    }),
    p(`Document generated: ${gen}. Regenerate with: npm run docs:user-guides-docx`),
    p("Audience: Business clients using the platform."),
  ];
}

function footerNote() {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 360 },
    children: [
      new TextRun({
        text: "AI SEO Tool — end of document",
        italics: true,
        size: 18,
        color: "666666",
      }),
    ],
  });
}

async function writeDoc(filename, children) {
  const outPath = path.join(guideDir, filename);
  const doc = new Document({
    sections: [{ properties: {}, children }],
  });
  const buffer = await Packer.toBuffer(doc);
  fs.mkdirSync(guideDir, { recursive: true });
  fs.writeFileSync(outPath, buffer);
  console.log("Wrote", outPath);
}

async function buildStarterGuide(imgStarter) {
  const children = [
    ...cover("User guide", "Starter plan", "Starter · ₹499/mo"),
    h1("At a glance"),
    tableFromRows(
      ["Topic", "Your limit / note"],
      [
        ["Tracked keywords", "10 maximum"],
        ["Content calendar items", "2 maximum"],
        ["Competitor URLs", "1"],
        ["Social captions from audit", "LinkedIn only"],
        ["AI blogs", "Not included — upgrade to Growth"],
        ["GA4 / Campaign ideas", "Not included — upgrade to Growth"],
        ["Social ads / ad angles in audit", "Not included — upgrade to Elite"],
      ]
    ),

    h1("What makes Starter valuable"),
    bullet("Lowest tier with full SEO core: AI site audit, site crawl, Search Console, keyword tracking, calendar, on-page checklist, competitor watch, shareable report."),
    bullet("Business profile presets (industry vertical + marketing goal) tune every AI output to your model."),
    bullet("Strict caps encourage focus before you scale content volume on Growth."),

    h1("Before you start"),
    bullet("Complete Business profile: business name, website URL, description, industry vertical, marketing goal, target keywords."),
    bullet("Optional: Gemini and PageSpeed API keys on the same page (use ? tooltips). Otherwise the server keys apply when configured."),
    bullet("Optional: turn on Local SEO pack for Google Business Profile–style audit drafts when your profile is local."),

    h1("Features — how to use and benefits"),
    h2("Overview"),
    p("Shows unified growth score when you have audit data, and audit progress comparing early vs latest runs when you have two or more audits."),
    bullet("Benefit: One place to see momentum without building spreadsheets."),

    h2("Business profile"),
    p("Central place for brand facts, presets, optional API keys, and local SEO toggle."),
    bullet("Benefit: Audits, captions, and suggestions stay specific to you, not generic."),

    h2("Site audit"),
    p("Technical review plus AI blocks: keywords, meta, CTAs, FAQs, lead capture, LinkedIn-only social pack, Lighthouse when PageSpeed is available."),
    bullet("How: Confirm website in profile → run audit → copy blocks into your CMS."),
    bullet("Benefit: Actionable, brand-aware output in one session."),

    h2("Site crawl"),
    p("Crawls linked pages from your start URL (within app limits)."),
    bullet("Benefit: Broader health view than a single URL audit."),

    h2("Search performance"),
    p("Connect Google Search Console with OAuth; sync recent queries."),
    bullet("Benefit: Write and optimize for real queries."),
    bullet("Requires: Operator-configured Google OAuth on the server."),

    h2("Keywords"),
    p("Track up to 10 phrases; match to GSC when connected."),
    bullet("Benefit: One prioritized list tied to performance data."),

    h2("Content calendar"),
    p("Plan topics and dates; Starter allows 2 items total."),
    bullet("Benefit: Lightweight planning. Upgrade to Growth for large calendars."),

    h2("On-page checklist"),
    p("Per-URL checklist with saved checkboxes."),
    bullet("Benefit: Repeatable QA so pages do not regress."),

    h2("Competitors"),
    p("One competitor homepage; refresh to see title/meta/H1 diffs."),
    bullet("Benefit: Quick competitive intelligence. You cannot add your own domain."),

    h2("Share report"),
    p("Create a time-limited public link (no login) for stakeholders; revoke when done."),
    bullet("Benefit: Professional sharing without sharing passwords."),

    h1("Not included on Starter"),
    tableFromRows(
      ["Capability", "Available on"],
      [
        ["AI blogs", "Growth"],
        ["Backlinks checklist", "Growth"],
        ["Web analytics (GA4)", "Growth"],
        ["Campaign ideas", "Growth"],
        ["Campaign idea → Social draft in app", "Elite"],
        ["Social ads page", "Elite"],
        ["Ad creative angles in audit", "Elite"],
        ["Monthly executive email opt-in", "Growth / Elite"],
      ]
    ),

    h1("Journey diagram — Starter"),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [imgStarter],
      spacing: { after: 200 },
    }),

    h1("Troubleshooting"),
    tableFromRows(
      ["Issue", "What to check"],
      [
        ["Audit AI errors", "GEMINI_API_KEY on server or your Gemini key in profile"],
        ["Missing Lighthouse scores", "PageSpeed API key (server or BYOK)"],
        ["GSC will not connect", "OAuth client + redirect URI in Google Cloud"],
        ["Cannot add 3rd calendar item", "Starter cap is 2 — delete an item or upgrade"],
      ]
    ),
    footerNote(),
  ];
  await writeDoc("User-Guide-Starter.docx", children);
}

async function buildGrowthGuide(imgGrowth) {
  const children = [
    ...cover("User guide", "Growth plan", "Growth · ₹899/mo"),
    h1("At a glance"),
    p("Growth includes everything in the Starter guide, plus the capabilities below. This document focuses on what is added or different."),
    tableFromRows(
      ["Topic", "Growth limit / note"],
      [
        ["Tracked keywords", "50 maximum"],
        ["Content calendar items", "500 maximum"],
        ["Competitor URLs", "3"],
        ["Social captions", "LinkedIn + Instagram + Facebook on audits and blogs"],
        ["AI blogs", "Yes — weekly limits per subscription"],
        ["Backlinks checklist", "Yes"],
        ["Web analytics (GA4)", "Yes — OAuth + Property ID"],
        ["Campaign ideas", "Yes — ideas only (no in-app Social draft)"],
        ["Monthly email", "HTML opt-in when Resend configured"],
      ]
    ),

    h1("Growth-only features"),
    h2("Blogs"),
    bullet("AI-generated drafts aligned to your business profile presets."),
    bullet("How: Open Blogs from the sidebar; open or generate posts per your workflow."),
    bullet("Benefit: Faster first drafts for your CMS or site."),

    h2("Backlinks"),
    bullet("Structured checklist of directories and submission-style tasks."),
    bullet("Benefit: Off-page work stays organized."),

    h2("Web analytics (GA4)"),
    bullet("Read-only Google connection; enter numeric GA4 Property ID, then Sync."),
    bullet("Benefit: Sessions and top pages next to Search Console queries."),
    bullet("Note: Same Google OAuth app as Search Console; GA4 callback URI must be enabled in Cloud Console."),

    h2("Campaign ideas"),
    bullet("Optional free-text direction (up to 2,000 characters) + Get today’s campaign ideas."),
    bullet("Returns four hooks with format, rationale, hashtags. AI does not browse live news — verify dates before ad spend."),
    bullet("Growth does not show Create draft in Social ads (Elite only)."),

    h2("Monthly executive email"),
    bullet("Opt in under Business profile when your operator enabled email delivery (Resend + cron)."),

    h2("Higher limits and three-platform social packs"),
    bullet("Use Social post pack on blog posts and on audits for Instagram and Facebook as well as LinkedIn."),

    h1("Starter vs Growth (summary)"),
    tableFromRows(
      ["Area", "Starter", "Growth"],
      [
        ["Keywords", "10", "50"],
        ["Calendar", "2 items", "500 items"],
        ["Competitors", "1", "3"],
        ["Blogs", "—", "Yes"],
        ["Backlinks", "—", "Yes"],
        ["GA4", "—", "Yes"],
        ["Campaign ideas", "—", "Yes (ideas only)"],
        ["Audit social pack", "LinkedIn only", "3 platforms"],
      ]
    ),

    h1("Journey diagram — Growth"),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [imgGrowth],
      spacing: { after: 200 },
    }),
    p("For every Starter feature (audit, crawl, GSC, checklist, share report, etc.), follow the same steps as in the Starter user guide."),
    footerNote(),
  ];
  await writeDoc("User-Guide-Growth.docx", children);
}

async function buildEliteGuide(imgElite) {
  const children = [
    ...cover("User guide", "Elite plan", "Elite · ₹1,599/mo"),
    h1("At a glance"),
    p("Elite includes everything in Growth, plus paid-social depth and the highest client limits."),
    tableFromRows(
      ["Topic", "Elite limit / note"],
      [
        ["Tracked keywords", "100 maximum"],
        ["Competitor URLs", "5"],
        ["Ad creative angles in Site audit", "Yes — Meta + Google RSA-style blocks"],
        ["Social ads page", "Yes — Meta credentials JSON + draft gallery"],
        ["Campaign idea → Create draft", "Yes — writes today’s Social ad draft via second Gemini pass"],
        ["Monthly email", "HTML + optional PDF attachment when configured"],
      ]
    ),

    h1("Elite-only features"),
    h2("Ad creative angles (inside Site audit)"),
    bullet("Extra section with headline and body variants for Meta and Google RSA-style ads."),
    bullet("How: Run a new site audit; scroll to Ad creative angles; copy into Ads Manager."),
    bullet("Benefit: Organic fixes and paid creative stay aligned."),

    h2("Social ads"),
    bullet("Paste Meta credentials JSON (Page token, Instagram Business Account ID — see in-app tooltip)."),
    bullet("Review AI drafts: caption pack plus image (stock fallback or Imagen when server allows)."),
    bullet("Benefit: One hub for creative before publishing."),

    h2("Campaign ideas → Create draft in Social ads"),
    bullet("On Campaign ideas, Elite sees a button to generate full Meta copy from a chosen idea."),
    bullet("Saves as today’s Social ad row (same daily slot as admin-generated drafts; running again replaces that day’s draft)."),

    h1("Growth vs Elite (summary)"),
    tableFromRows(
      ["Area", "Growth", "Elite"],
      [
        ["Keywords", "50", "100"],
        ["Competitors", "3", "5"],
        ["Ad angles in audit", "No", "Yes"],
        ["Social ads page", "No", "Yes"],
        ["Draft from campaign idea", "No", "Yes"],
        ["Monthly email PDF", "No (HTML)", "Yes when configured"],
      ]
    ),

    h1("Journey diagram — Elite"),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [imgElite],
      spacing: { after: 200 },
    }),
    p("All Growth workflows (blogs, GA4, campaign ideas, backlinks, etc.) work the same as in the Growth user guide."),
    footerNote(),
  ];
  await writeDoc("User-Guide-Elite.docx", children);
}

function qaTable4Col(headers, rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: headers.map((h) => cell(h, true, 18)) }),
      ...rows.map(
        (r) =>
          new TableRow({
            children: r.map((c) => cell(c, false, 18)),
          })
      ),
    ],
  });
}

async function buildQADoc() {
  const children = [
    ...cover("QA test matrix", "Full product manual checks", "Internal QA — all roles"),
    p("Run after npm run build passes. Log in as each persona. Tick rows when pass. Assumes database, auth, and (where noted) GEMINI_API_KEY, Google OAuth, RESEND_API_KEY."),
    h1("Demo accounts (prisma seed)"),
    tableFromRows(
      ["Plan", "Example email", "Notes"],
      [
        ["Starter", "groottechnologies@guest.seoapp", "Password from seed / operator"],
        ["Growth", "roardata@guest.seoapp", "Password from seed / operator"],
        ["Elite", "oakwooduae@guest.seoapp", "Password from seed / operator"],
        ["Admin", "ADMIN_EMAIL from .env", "/admin routes"],
      ]
    ),

    h1("A. Starter client"),
    qaTable4Col(
      ["#", "Area", "Steps", "Pass criteria"],
      [
        ["S1", "Login", "/login", "Lands on /dashboard"],
        ["S2", "Overview", "Open Overview", "Growth score if audits exist; nav matches Starter"],
        ["S3", "Business profile", "Edit presets, URL, keywords, JSON", "Save OK; tooltips on API keys"],
        ["S4", "BYOK", "Add/clear Gemini or PageSpeed", "Save; audit works"],
        ["S5", "Local SEO toggle", "Toggle, save", "Persists after refresh"],
        ["S6", "Site audit", "Run on businessUrl", "CTA, FAQ, lead blocks, Lighthouse"],
        ["S7", "Site crawl", "Start crawl", "Completes or clear errors"],
        ["S8", "Search performance", "Connect Google if configured", "Sync or clear error"],
        ["S9", "Keywords", "Add phrases", "Cap 10"],
        ["S10", "Calendar", "Add 2 items, try third", "Third blocked / 403"],
        ["S11", "On-page checklist", "URL + toggle tasks", "Persists on reload"],
        ["S12", "Competitors", "1 URL + refresh", "Cap 1; block own domain"],
        ["S13", "Social pack (audit)", "Generate from audit", "LinkedIn only"],
        ["S14", "Share report", "Create link; open /r in private", "Read-only; revoke works"],
        ["S15", "Blogs URL", "Open /dashboard/blogs direct", "May load empty; generation is Growth+"],
        ["S16", "Campaign ideas URL", "/dashboard/campaign-ideas", "Redirect for Starter"],
        ["S17", "Analytics URL", "/dashboard/analytics as Starter", "Upgrade message"],
      ]
    ),

    h1("B. Growth client"),
    qaTable4Col(
      ["#", "Area", "Steps", "Pass criteria"],
      [
        ["G1", "Nav", "Sidebar", "Blogs, Backlinks, Web analytics, Campaign ideas"],
        ["G2", "Blogs", "List + draft", "Presets reflected"],
        ["G3", "Social pack (blog)", "Generate on blog", "3 platforms"],
        ["G4", "Backlinks", "View + mark", "Persists"],
        ["G5", "Calendar", "Add many items", "Above Starter cap"],
        ["G6", "Keywords", "Add phrases", "Cap 50"],
        ["G7", "Competitors", "Add 3, try 4th", "4th rejected"],
        ["G8", "GA4", "/dashboard/analytics", "Connect + Property ID + Sync"],
        ["G9", "Campaign ideas", "Focus + Generate", "4 ideas; no Create draft"],
        ["G10", "Monthly email", "Profile opt-in", "Checkbox visible; save"],
        ["G11", "Social page", "/dashboard/social", "Elite-only message"],
        ["G12", "Audit", "Run audit", "No ad creative angles section"],
      ]
    ),

    h1("C. Elite client"),
    qaTable4Col(
      ["#", "Area", "Steps", "Pass criteria"],
      [
        ["E1", "Nav", "Sidebar", "Social ads present"],
        ["E2", "Keywords", "Add many", "Cap 100"],
        ["E3", "Competitors", "5 URLs, try 6th", "6th rejected"],
        ["E4", "Site audit", "Run audit", "Ad creative angles when present"],
        ["E5", "Social ads", "Save Meta JSON", "Save OK; list loads"],
        ["E6", "Campaign → draft", "Create draft in Social ads", "Today’s SocialAd updated"],
        ["E7", "Social draft", "Copy caption/image", "UI OK"],
        ["E8", "Monthly email", "Cron + Resend staging", "PDF for Elite when configured"],
      ]
    ),

    h1("D. Admin user"),
    qaTable4Col(
      ["#", "Area", "Steps", "Pass criteria"],
      [
        ["A1", "Login", "Admin credentials", "Redirect /admin"],
        ["A2", "Users", "List + open user", "Edit as per UI"],
        ["A3", "Subscriptions", "Assign plan", "Client nav updates"],
        ["A4", "Generate", "Blog/audit/social for user", "Completes or clear error"],
        ["A5", "Negative", "/dashboard as admin", "Redirect from client dashboard"],
      ]
    ),

    h1("E. Cross-cutting"),
    qaTable4Col(
      ["#", "Area", "Steps", "Pass criteria"],
      [
        ["X1", "Auth", "Logout / session", "Cannot access dashboard"],
        ["X2", "Register", "New account", "Profile OK; plan may need admin"],
        ["X3", "Build", "npm run build", "No type errors"],
      ]
    ),

    h1("F. Optional integrations (staging)"),
    tableFromRows(
      ["#", "Integration", "Notes"],
      [
        ["I1", "Google OAuth", "GSC + GA4 redirect URIs in Cloud Console"],
        ["I2", "Gemini", "Audits, blogs, campaign ideas, social copy"],
        ["I3", "PageSpeed", "Lighthouse scores in audit"],
        ["I4", "Resend + cron", "Monthly report email"],
      ]
    ),

    footerNote(),
  ];
  await writeDoc("QA-Full-Product-Test-Matrix.docx", children);
}

async function main() {
  const imgStarter = await svgToImageRun("flowchart-starter.svg");
  const imgGrowth = await svgToImageRun("flowchart-growth.svg");
  const imgElite = await svgToImageRun("flowchart-elite.svg");

  await buildStarterGuide(imgStarter);
  await buildGrowthGuide(imgGrowth);
  await buildEliteGuide(imgElite);
  await buildQADoc();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
