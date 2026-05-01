import type { BacklinkPriority, IndustryVertical } from "@prisma/client";

export type DirectoryRegion = "GLOBAL" | "US" | "IN" | "UK" | "AE" | "AU" | "CA";

export type DirectoryEntry = {
  directoryName: string;
  directoryUrl: string;
  priority: BacklinkPriority;
  verticals?: IndustryVertical[];
  regions?: DirectoryRegion[];
};

export type UserProfileForDirectories = {
  businessUrl: string | null;
  industry: string | null;
  industryVertical: IndustryVertical;
};

export const BACKLINK_BATCH_SIZE = 10;

const UNIVERSAL: DirectoryEntry[] = [
  { directoryName: "Google Business Profile", directoryUrl: "https://business.google.com/", priority: "HIGH" },
  { directoryName: "Bing Places for Business", directoryUrl: "https://www.bingplaces.com/", priority: "HIGH" },
  { directoryName: "Apple Maps (Maps Connect)", directoryUrl: "https://mapsconnect.apple.com/", priority: "HIGH" },
  { directoryName: "Facebook Business", directoryUrl: "https://www.facebook.com/business", priority: "MEDIUM" },
  { directoryName: "LinkedIn Company Page", directoryUrl: "https://www.linkedin.com/company/setup/", priority: "MEDIUM" },
  { directoryName: "Trustpilot", directoryUrl: "https://business.trustpilot.com/", priority: "MEDIUM" },
];

const POOL: DirectoryEntry[] = [
  ...UNIVERSAL,

  // LOCAL SERVICES — neighbourhood / trades / home services
  { directoryName: "Yelp for Business", directoryUrl: "https://biz.yelp.com/", priority: "MEDIUM", verticals: ["LOCAL_SERVICES", "HOSPITALITY", "PROFESSIONAL_SERVICES"], regions: ["US", "CA", "UK", "AU"] },
  { directoryName: "Yellow Pages", directoryUrl: "https://www.yellowpages.com/", priority: "MEDIUM", verticals: ["LOCAL_SERVICES", "PROFESSIONAL_SERVICES"], regions: ["US"] },
  { directoryName: "Better Business Bureau", directoryUrl: "https://www.bbb.org/", priority: "LOW", verticals: ["LOCAL_SERVICES", "PROFESSIONAL_SERVICES"], regions: ["US", "CA"] },
  { directoryName: "Angi (formerly Angie’s List)", directoryUrl: "https://www.angi.com/", priority: "LOW", verticals: ["LOCAL_SERVICES"], regions: ["US"] },
  { directoryName: "Nextdoor Business", directoryUrl: "https://business.nextdoor.com/", priority: "LOW", verticals: ["LOCAL_SERVICES"], regions: ["US", "UK", "AU"] },
  { directoryName: "JustDial", directoryUrl: "https://www.justdial.com/", priority: "MEDIUM", verticals: ["LOCAL_SERVICES", "PROFESSIONAL_SERVICES", "HOSPITALITY"], regions: ["IN"] },
  { directoryName: "Sulekha", directoryUrl: "https://www.sulekha.com/", priority: "LOW", verticals: ["LOCAL_SERVICES"], regions: ["IN"] },
  { directoryName: "IndiaMART", directoryUrl: "https://seller.indiamart.com/", priority: "LOW", verticals: ["LOCAL_SERVICES", "PROFESSIONAL_SERVICES", "ECOMMERCE"], regions: ["IN"] },
  { directoryName: "Yell.com", directoryUrl: "https://www.yell.com/", priority: "MEDIUM", verticals: ["LOCAL_SERVICES", "PROFESSIONAL_SERVICES"], regions: ["UK"] },
  { directoryName: "True Local", directoryUrl: "https://www.truelocal.com.au/", priority: "LOW", verticals: ["LOCAL_SERVICES"], regions: ["AU"] },
  { directoryName: "Yellow Pages Canada", directoryUrl: "https://www.yellowpages.ca/", priority: "MEDIUM", verticals: ["LOCAL_SERVICES"], regions: ["CA"] },

  // ECOMMERCE
  { directoryName: "Google Merchant Center", directoryUrl: "https://merchants.google.com/", priority: "HIGH", verticals: ["ECOMMERCE"] },
  { directoryName: "Sitejabber", directoryUrl: "https://www.sitejabber.com/online-business", priority: "MEDIUM", verticals: ["ECOMMERCE"] },
  { directoryName: "ResellerRatings", directoryUrl: "https://www.resellerratings.com/", priority: "LOW", verticals: ["ECOMMERCE"] },
  { directoryName: "BizRate", directoryUrl: "https://www.bizrate.com/", priority: "LOW", verticals: ["ECOMMERCE"] },

  // SAAS / SOFTWARE
  { directoryName: "G2", directoryUrl: "https://sell.g2.com/", priority: "HIGH", verticals: ["SAAS", "CREATIVE_TECH"] },
  { directoryName: "Capterra", directoryUrl: "https://www.capterra.com/vendors/sign-up", priority: "HIGH", verticals: ["SAAS", "CREATIVE_TECH"] },
  { directoryName: "GetApp", directoryUrl: "https://www.getapp.com/", priority: "MEDIUM", verticals: ["SAAS"] },
  { directoryName: "Software Advice", directoryUrl: "https://www.softwareadvice.com/", priority: "MEDIUM", verticals: ["SAAS"] },
  { directoryName: "Product Hunt", directoryUrl: "https://www.producthunt.com/", priority: "LOW", verticals: ["SAAS", "CREATIVE_TECH"] },
  { directoryName: "TrustRadius", directoryUrl: "https://www.trustradius.com/", priority: "LOW", verticals: ["SAAS"] },

  // PROFESSIONAL SERVICES / AGENCY / B2B
  { directoryName: "Clutch", directoryUrl: "https://clutch.co/get_listed", priority: "HIGH", verticals: ["PROFESSIONAL_SERVICES", "CREATIVE_TECH"] },
  { directoryName: "GoodFirms", directoryUrl: "https://www.goodfirms.co/", priority: "MEDIUM", verticals: ["PROFESSIONAL_SERVICES", "CREATIVE_TECH"] },
  { directoryName: "DesignRush", directoryUrl: "https://www.designrush.com/", priority: "LOW", verticals: ["CREATIVE_TECH", "PROFESSIONAL_SERVICES"] },
  { directoryName: "Manta", directoryUrl: "https://www.manta.com/", priority: "LOW", verticals: ["PROFESSIONAL_SERVICES"], regions: ["US"] },
  { directoryName: "Crunchbase", directoryUrl: "https://www.crunchbase.com/", priority: "MEDIUM", verticals: ["SAAS", "PROFESSIONAL_SERVICES", "CREATIVE_TECH"] },

  // HEALTHCARE
  { directoryName: "Healthgrades", directoryUrl: "https://www.healthgrades.com/", priority: "HIGH", verticals: ["HEALTHCARE"], regions: ["US"] },
  { directoryName: "Vitals", directoryUrl: "https://www.vitals.com/", priority: "MEDIUM", verticals: ["HEALTHCARE"], regions: ["US"] },
  { directoryName: "RateMDs", directoryUrl: "https://www.ratemds.com/", priority: "MEDIUM", verticals: ["HEALTHCARE"] },
  { directoryName: "Zocdoc", directoryUrl: "https://www.zocdoc.com/", priority: "MEDIUM", verticals: ["HEALTHCARE"], regions: ["US"] },
  { directoryName: "Practo", directoryUrl: "https://providers.practo.com/", priority: "MEDIUM", verticals: ["HEALTHCARE"], regions: ["IN"] },

  // HOSPITALITY / EVENTS / RESTAURANTS / HOTELS
  { directoryName: "TripAdvisor", directoryUrl: "https://www.tripadvisor.com/Owners", priority: "HIGH", verticals: ["HOSPITALITY"] },
  { directoryName: "OpenTable", directoryUrl: "https://restaurant.opentable.com/", priority: "MEDIUM", verticals: ["HOSPITALITY"] },
  { directoryName: "Zomato Business", directoryUrl: "https://www.zomato.com/business", priority: "MEDIUM", verticals: ["HOSPITALITY"], regions: ["IN", "AE"] },
  { directoryName: "Booking.com (Partner Hub)", directoryUrl: "https://join.booking.com/", priority: "MEDIUM", verticals: ["HOSPITALITY"] },
  { directoryName: "Expedia Partner Central", directoryUrl: "https://www.expediapartnercentral.com/", priority: "LOW", verticals: ["HOSPITALITY"] },
];

function regionFromBusinessUrl(url: string | null): DirectoryRegion {
  if (!url) return "GLOBAL";
  const lower = url.toLowerCase();
  if (/\.in(\/|$|\?)/.test(lower) || /\.co\.in/.test(lower)) return "IN";
  if (/\.ae(\/|$|\?)/.test(lower) || /\.co\.ae/.test(lower)) return "AE";
  if (/\.co\.uk/.test(lower) || /\.uk(\/|$|\?)/.test(lower)) return "UK";
  if (/\.com\.au/.test(lower) || /\.au(\/|$|\?)/.test(lower)) return "AU";
  if (/\.ca(\/|$|\?)/.test(lower)) return "CA";
  return "US";
}

function regionFromIndustryText(text: string | null): DirectoryRegion | null {
  if (!text) return null;
  const t = text.toLowerCase();
  if (/\b(uae|dubai|abu dhabi|sharjah)\b/.test(t)) return "AE";
  if (/\b(india|mumbai|delhi|bangalore|bengaluru|chennai|hyderabad|pune)\b/.test(t)) return "IN";
  if (/\b(uk|united kingdom|london|manchester)\b/.test(t)) return "UK";
  if (/\b(australia|sydney|melbourne)\b/.test(t)) return "AU";
  if (/\b(canada|toronto|vancouver)\b/.test(t)) return "CA";
  return null;
}

function detectRegion(profile: UserProfileForDirectories): DirectoryRegion {
  return (
    regionFromIndustryText(profile.industry) ??
    regionFromBusinessUrl(profile.businessUrl)
  );
}

function entryMatchesRegion(entry: DirectoryEntry, region: DirectoryRegion): boolean {
  if (!entry.regions || entry.regions.length === 0) return true;
  if (entry.regions.includes("GLOBAL")) return true;
  return entry.regions.includes(region);
}

function entryMatchesVertical(entry: DirectoryEntry, vertical: IndustryVertical): boolean {
  if (!entry.verticals || entry.verticals.length === 0) return true;
  return entry.verticals.includes(vertical);
}

const PRIORITY_RANK: Record<BacklinkPriority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

/** Pick a stable, ordered batch of directories that fit the user's vertical and region. */
export function pickDirectoriesForUser(profile: UserProfileForDirectories): DirectoryEntry[] {
  const region = detectRegion(profile);
  const vertical = profile.industryVertical;

  const matches = POOL.filter(
    (e) => entryMatchesRegion(e, region) && entryMatchesVertical(e, vertical)
  );

  matches.sort((a, b) => {
    const p = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (p !== 0) return p;
    return a.directoryName.localeCompare(b.directoryName);
  });

  if (matches.length >= BACKLINK_BATCH_SIZE) {
    return matches.slice(0, BACKLINK_BATCH_SIZE);
  }

  // Top up with universal entries already in matches first; then any region-matching, vertical-agnostic;
  // de-duplicate by directoryUrl.
  const seen = new Set(matches.map((m) => m.directoryUrl));
  const fillers = POOL.filter(
    (e) => !seen.has(e.directoryUrl) && entryMatchesRegion(e, region)
  ).sort(
    (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
  );
  for (const f of fillers) {
    if (matches.length >= BACKLINK_BATCH_SIZE) break;
    matches.push(f);
    seen.add(f.directoryUrl);
  }

  return matches.slice(0, BACKLINK_BATCH_SIZE);
}

/** Back-compat default for any code path that still expects a flat list (universal-only). */
export const DEFAULT_BACKLINK_DIRECTORIES: DirectoryEntry[] = UNIVERSAL;

function dayOfYearUtc(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  const diff = d.getTime() - start;
  return Math.floor(diff / 86_400_000);
}

/**
 * Used by the daily Elite cron to drop a fresh batch of `count` directories
 * deterministically based on the calendar day. Same day → same slice, so the
 * cron is idempotent if it runs twice. Wraps around the pool, dedup by URL.
 *
 * Note: this picker is not user-aware. The dashboard "Refresh for my business"
 * flow uses `pickDirectoriesForUser` (deterministic) or `generateBusinessBacklinkPlan`
 * (Gemini, website-driven) instead.
 */
export function pickDailyBacklinkSlice(date: Date, count: number): DirectoryEntry[] {
  const sorted = [...POOL].sort((a, b) => {
    const p = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (p !== 0) return p;
    return a.directoryName.localeCompare(b.directoryName);
  });
  if (sorted.length === 0) return [];

  const start = dayOfYearUtc(date) % sorted.length;
  const out: DirectoryEntry[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < sorted.length && out.length < count; i++) {
    const entry = sorted[(start + i) % sorted.length];
    if (seen.has(entry.directoryUrl)) continue;
    seen.add(entry.directoryUrl);
    out.push(entry);
  }
  return out;
}
