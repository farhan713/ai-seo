import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"];

export function getSearchConsoleRedirectUri(): string {
  const base = (process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/api/integrations/search-console/callback`;
}

export function searchConsoleOAuthConfigured(): boolean {
  return !!(
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID?.trim() &&
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET?.trim()
  );
}

export function createSearchConsoleOAuth2() {
  const clientId = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("Set GOOGLE_SEARCH_CONSOLE_CLIENT_ID and GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET");
  }
  return new google.auth.OAuth2(clientId, clientSecret, getSearchConsoleRedirectUri());
}

export function generateSearchConsoleAuthUrl(state: string): string {
  const oauth2 = createSearchConsoleOAuth2();
  return oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
    include_granted_scopes: true,
  });
}

export async function exchangeSearchConsoleCode(code: string) {
  const oauth2 = createSearchConsoleOAuth2();
  const { tokens } = await oauth2.getToken(code);
  return tokens;
}

export function hostnameFromBusinessUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    const u = new URL(url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`);
    return u.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

/** Pick a GSC property that matches the business site host. */
export function pickSearchConsoleSiteUrl(
  siteEntries: { siteUrl?: string | null }[],
  businessUrl: string | null | undefined
): string | null {
  const urls = siteEntries.map((s) => s.siteUrl).filter((u): u is string => !!u);
  if (urls.length === 0) return null;
  const host = hostnameFromBusinessUrl(businessUrl);
  if (!host) {
    return urls.find((u) => u.startsWith("https://")) ?? urls[0] ?? null;
  }

  function matches(u: string, h: string): boolean {
    if (u.startsWith("sc-domain:")) {
      const dom = u.slice("sc-domain:".length).toLowerCase().replace(/\.$/, "");
      return dom === h || h === dom || h.endsWith(`.${dom}`);
    }
    try {
      const sh = new URL(u).hostname.replace(/^www\./i, "").toLowerCase();
      return sh === h || sh.endsWith(`.${h}`) || h.endsWith(`.${sh}`);
    } catch {
      return false;
    }
  }

  const hit = urls.find((u) => matches(u, host));
  return hit ?? urls[0] ?? null;
}

export async function listSearchConsoleSites(refreshToken: string, accessToken?: string | null, expiresAt?: Date | null) {
  const oauth2 = createSearchConsoleOAuth2();
  oauth2.setCredentials({
    refresh_token: refreshToken,
    access_token: accessToken ?? undefined,
    expiry_date: expiresAt?.getTime(),
  });
  const webmasters = google.webmasters({ version: "v3", auth: oauth2 });
  const { data } = await webmasters.sites.list();
  return data.siteEntry ?? [];
}

export type SearchAnalyticsRow = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number };

export async function fetchSearchAnalyticsQueries(params: {
  refreshToken: string;
  accessToken?: string | null;
  accessTokenExpiresAt?: Date | null;
  siteUrl: string;
  startDate: string;
  endDate: string;
  rowLimit?: number;
}): Promise<{ rows: SearchAnalyticsRow[]; credentials: { access_token?: string | null; expiry_date?: number | null } }> {
  const oauth2 = createSearchConsoleOAuth2();
  oauth2.setCredentials({
    refresh_token: params.refreshToken,
    access_token: params.accessToken ?? undefined,
    expiry_date: params.accessTokenExpiresAt?.getTime(),
  });

  const webmasters = google.webmasters({ version: "v3", auth: oauth2 });
  const { data } = await webmasters.searchanalytics.query({
    siteUrl: params.siteUrl,
    requestBody: {
      startDate: params.startDate,
      endDate: params.endDate,
      dimensions: ["query"],
      rowLimit: params.rowLimit ?? 250,
    },
  });

  const creds = oauth2.credentials;
  return {
    rows: (data.rows ?? []) as SearchAnalyticsRow[],
    credentials: {
      access_token: creds.access_token ?? null,
      expiry_date: creds.expiry_date ?? null,
    },
  };
}
