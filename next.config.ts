import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // VPS / Docker only — Vercel uses its own Next output (VERCEL=1 during build)
  ...(!process.env.VERCEL ? { output: "standalone" as const } : {}),
  // Prisma + bcryptjs must not be bundled into Route Handlers (fixes Auth "Configuration" / 500 on sign-in with Turbopack)
  serverExternalPackages: ["@prisma/client", "bcryptjs", "pdfkit"],
};

export default nextConfig;
