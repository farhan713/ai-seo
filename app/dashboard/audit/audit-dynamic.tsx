"use client";

import dynamic from "next/dynamic";

/** Client-only chunk load avoids Turbopack SSR failures on this route in dev. */
const AuditClientPage = dynamic(() => import("./audit-client"), {
  ssr: false,
  loading: () => <p className="text-sm text-muted">Loading…</p>,
});

export default function AuditDynamic() {
  return <AuditClientPage />;
}
