import { PrismaClient, type IndustryVertical, type MarketingGoal, type Plan } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_BACKLINK_DIRECTORIES } from "../lib/backlinks-default";
import { defaultsForPlan } from "../lib/subscription-defaults";
import { hasGrowthFeatures } from "../lib/plan-access";
import { ensureTrackedKeywordsSeeded } from "../lib/tracked-keywords-bootstrap";

const prisma = new PrismaClient();

type SeedClient = {
  email: string;
  password: string;
  name: string;
  businessName: string;
  businessUrl: string;
  businessDescription: string;
  industry: string;
  targetKeywords: string;
  plan: Plan;
  industryVertical?: IndustryVertical;
  marketingGoal?: MarketingGoal;
};

const PORTFOLIO_CLIENTS: SeedClient[] = [
  {
    email: "groottechnologies@guest.seoapp",
    password: "Groot499!Audit",
    name: "Groot Technologies",
    businessName: "Groot Technologies",
    businessUrl: "https://groottechnologies.com",
    businessDescription:
      "Technology and digital solutions company helping businesses scale with modern web and software.",
    industry: "Technology",
    targetKeywords: "web development, IT solutions, digital transformation",
    plan: "STARTER_499",
    industryVertical: "SAAS",
    marketingGoal: "PRODUCT_SIGNUPS",
  },
  {
    email: "roardata@guest.seoapp",
    password: "Roar899!Blogs",
    name: "Roar Data",
    businessName: "Roar Data",
    businessUrl: "https://roardata.com.au",
    businessDescription:
      "Brisbane-based data analytics and Power BI consultancy for healthcare, construction, and operations teams.",
    industry: "Data analytics",
    targetKeywords: "Power BI Brisbane, healthcare analytics, operational dashboards",
    plan: "GROWTH_899",
    industryVertical: "PROFESSIONAL_SERVICES",
    marketingGoal: "GENERATE_LEADS",
  },
  {
    email: "oakwooduae@guest.seoapp",
    password: "Oakwood1599!Social",
    name: "Oakwood UAE",
    businessName: "Oakwood UAE",
    businessUrl: "https://oakwooduae.com",
    businessDescription:
      "3D and WebGL-focused web development studio in the UAE building immersive sites and interactive experiences.",
    industry: "Creative technology",
    targetKeywords: "WebGL UAE, Three.js agency, 3D website Dubai",
    plan: "ELITE_1599",
    industryVertical: "CREATIVE_TECH",
    marketingGoal: "BRAND_AWARENESS",
  },
];

async function upsertClientSubscription(c: SeedClient) {
  const hash = await bcrypt.hash(c.password, 12);
  const internalLinks = [
    { url: `${c.businessUrl}/`, anchor: "home" },
    { url: `${c.businessUrl}/contact`, anchor: "contact" },
  ];

  const user = await prisma.user.upsert({
    where: { email: c.email.toLowerCase() },
    create: {
      email: c.email.toLowerCase(),
      name: c.name,
      password: hash,
      role: "CLIENT",
      isActive: true,
      businessName: c.businessName,
      businessUrl: c.businessUrl,
      businessDescription: c.businessDescription,
      industry: c.industry,
      industryVertical: c.industryVertical ?? "GENERAL",
      marketingGoal: c.marketingGoal ?? "OTHER",
      targetKeywords: c.targetKeywords,
      internalLinks,
      socialCredentials: c.plan === "ELITE_1599" ? {} : undefined,
    },
    update: {
      password: hash,
      name: c.name,
      role: "CLIENT",
      isActive: true,
      businessName: c.businessName,
      businessUrl: c.businessUrl,
      businessDescription: c.businessDescription,
      industry: c.industry,
      industryVertical: c.industryVertical ?? "GENERAL",
      marketingGoal: c.marketingGoal ?? "OTHER",
      targetKeywords: c.targetKeywords,
      internalLinks,
    },
  });

  const defs = defaultsForPlan(c.plan);
  const existing = await prisma.subscription.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  let sub;
  if (existing) {
    sub = await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        plan: c.plan,
        status: "ACTIVE",
        priceInInr: defs.priceInInr,
        blogsPerWeek: defs.blogsPerWeek,
        backlinksPerMonth: defs.backlinksPerMonth,
        endDate: null,
        backlinkBatch: existing.backlinkBatch,
      },
    });
  } else {
    sub = await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: c.plan,
        status: "ACTIVE",
        priceInInr: defs.priceInInr,
        blogsPerWeek: defs.blogsPerWeek,
        backlinksPerMonth: defs.backlinksPerMonth,
        startDate: new Date(),
        backlinkBatch: 1,
      },
    });
  }

  if (hasGrowthFeatures(c.plan)) {
    const batch = sub.backlinkBatch;
    const n = await prisma.backlink.count({ where: { userId: user.id, batch } });
    if (n === 0) {
      await prisma.backlink.createMany({
        data: DEFAULT_BACKLINK_DIRECTORIES.map((d) => ({
          userId: user.id,
          batch,
          directoryName: d.directoryName,
          directoryUrl: d.directoryUrl,
          priority: d.priority,
        })),
      });
    }
  }

  await ensureTrackedKeywordsSeeded(user.id).catch(() => {});

  return { user, sub };
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.warn("Skipping admin seed: set ADMIN_EMAIL and ADMIN_PASSWORD in .env");
  } else {
    const hashed = await bcrypt.hash(adminPassword, 12);
    await prisma.user.upsert({
      where: { email: adminEmail },
      create: {
        email: adminEmail,
        name: "Admin",
        password: hashed,
        role: "ADMIN",
        isActive: true,
      },
      update: {
        password: hashed,
        role: "ADMIN",
        isActive: true,
      },
    });
    console.log(`Admin user ready: ${adminEmail}`);
  }

  console.log("\n=== Portfolio clients (3 plans) ===\n");
  for (const c of PORTFOLIO_CLIENTS) {
    await upsertClientSubscription(c);
    console.log(`${c.plan.padEnd(14)} ${c.email} / ${c.password}`);
    console.log(`               ${c.businessUrl}\n`);
  }

  const clientEmail = process.env.CLIENT_EMAIL?.toLowerCase().trim();
  const clientPassword = process.env.CLIENT_PASSWORD;
  if (clientEmail && clientPassword) {
    await upsertClientSubscription({
      email: clientEmail,
      password: clientPassword,
      name: "Demo Client",
      businessName: "Demo Coffee Co.",
      businessUrl: "https://example.com",
      businessDescription: "Neighborhood coffee shop.",
      industry: "Food & beverage",
      targetKeywords: "coffee, espresso",
      plan: "GROWTH_899",
      industryVertical: "HOSPITALITY",
      marketingGoal: "LOCAL_VISITS",
    });
    console.log(`Demo client (Growth): ${clientEmail}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
