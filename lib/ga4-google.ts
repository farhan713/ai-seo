import { google } from "googleapis";

const GA4_SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"];

export function getGa4RedirectUri(): string {
  const base = (process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/api/integrations/ga4/callback`;
}

/** Reuses the same Google OAuth client as Search Console; add this redirect URI in Google Cloud Console. */
export function ga4OAuthConfigured(): boolean {
  return !!(
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID?.trim() &&
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET?.trim()
  );
}

export function createGa4OAuth2() {
  const clientId = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("Set GOOGLE_SEARCH_CONSOLE_CLIENT_ID and GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET");
  }
  return new google.auth.OAuth2(clientId, clientSecret, getGa4RedirectUri());
}

export function generateGa4AuthUrl(state: string): string {
  const oauth2 = createGa4OAuth2();
  return oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GA4_SCOPES,
    state,
    include_granted_scopes: true,
  });
}

export async function exchangeGa4Code(code: string) {
  const oauth2 = createGa4OAuth2();
  const { tokens } = await oauth2.getToken(code);
  return tokens;
}

export type Ga4SummaryRow = { pagePath: string; views: number };

export type Ga4SummaryPayload = {
  syncedAt: string;
  dateRangeLabel: string;
  sessions: number | null;
  activeUsers: number | null;
  screenPageViews: number | null;
  topPages: Ga4SummaryRow[];
  error?: string;
};

function numValue(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function fetchGa4Summary(params: {
  refreshToken: string;
  accessToken?: string | null;
  accessTokenExpiresAt?: Date | null;
  propertyId: string;
}): Promise<{ summary: Ga4SummaryPayload; credentials: { access_token?: string | null; expiry_date?: number | null } }> {
  const oauth2 = createGa4OAuth2();
  oauth2.setCredentials({
    refresh_token: params.refreshToken,
    access_token: params.accessToken ?? undefined,
    expiry_date: params.accessTokenExpiresAt?.getTime(),
  });

  const pid = params.propertyId.replace(/^properties\//, "").trim();
  const property = `properties/${pid}`;

  const analyticsdata = google.analyticsdata({ version: "v1beta", auth: oauth2 });

  const totalsRes = await analyticsdata.properties.runReport({
    property,
    requestBody: {
      dateRanges: [{ startDate: "28daysAgo", endDate: "yesterday" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "screenPageViews" }],
    },
  });

  const pagesRaw = await analyticsdata.properties.runReport({
    property,
    requestBody: {
      dateRanges: [{ startDate: "28daysAgo", endDate: "yesterday" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "screenPageViews" }],
      dimensions: [{ name: "pagePath" }],
      limit: "15",
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    },
  });
  const pagesRes = pagesRaw as unknown as { data: { rows?: typeof totalsRes.data.rows } };

  const creds = oauth2.credentials;
  const tm = totalsRes.data.rows?.[0]?.metricValues;
  const sessions = tm?.[0] ? numValue(tm[0].value) : null;
  const activeUsers = tm?.[1] ? numValue(tm[1].value) : null;
  const screenPageViews = tm?.[2] ? numValue(tm[2].value) : null;

  const rows = pagesRes.data.rows ?? [];
  const topPages: Ga4SummaryRow[] = rows.map((r) => {
    const path = r.dimensionValues?.[0]?.value ?? "";
    const views = numValue(r.metricValues?.[2]?.value) ?? 0;
    return { pagePath: path || "/", views };
  });

  const summary: Ga4SummaryPayload = {
    syncedAt: new Date().toISOString(),
    dateRangeLabel: "Last 28 days (excluding today)",
    sessions,
    activeUsers,
    screenPageViews,
    topPages,
  };

  return {
    summary,
    credentials: {
      access_token: creds.access_token ?? null,
      expiry_date: creds.expiry_date ?? null,
    },
  };
}
