import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasAuditAccess } from "@/lib/plan-access";
import {
  applyFindingHints,
  checklistUrlKey,
  defaultChecklistTasks,
  parseTasksJson,
} from "@/lib/on-page-checklist";
import { normalizeWebsiteUrl } from "@/lib/url-normalize";
import type { AuditFinding } from "@/lib/site-audit";

function normalizeUrlInput(raw: string): string {
  return normalizeWebsiteUrl(raw.trim()) || raw.trim();
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: { plan: true },
  });
  if (!sub || !hasAuditAccess(sub.plan)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url).searchParams.get("url")?.trim() || "";
  if (!url) return NextResponse.json({ error: "url query required" }, { status: 400 });

  const canonical = normalizeUrlInput(url);
  const urlKey = checklistUrlKey(canonical);

  const row = await prisma.onPageChecklist.findUnique({
    where: { userId_urlKey: { userId: session.user.id, urlKey } },
  });

  if (row) {
    const tasks = parseTasksJson({ tasks: row.tasks }) || defaultChecklistTasks();
    return NextResponse.json({
      url: row.url,
      persisted: true,
      id: row.id,
      siteAuditId: row.siteAuditId,
      tasks,
    });
  }

  const latestAudit = await prisma.siteAudit.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, url: true, findings: true },
  });

  let findings: AuditFinding[] = [];
  if (latestAudit?.findings && Array.isArray(latestAudit.findings)) {
    findings = latestAudit.findings as AuditFinding[];
  }

  const tasks = applyFindingHints(defaultChecklistTasks(), findings);
  const auditUrlNorm = latestAudit?.url ? normalizeWebsiteUrl(latestAudit.url) : "";
  const matchAudit = auditUrlNorm && canonical.replace(/\/$/, "") === auditUrlNorm.replace(/\/$/, "");

  return NextResponse.json({
    url: canonical,
    persisted: false,
    id: null,
    siteAuditId: matchAudit ? latestAudit?.id ?? null : null,
    tasks,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: { plan: true },
  });
  if (!sub || !hasAuditAccess(sub.plan)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const urlRaw = typeof body.url === "string" ? body.url : "";
  if (!urlRaw.trim()) return NextResponse.json({ error: "url required" }, { status: 400 });

  const canonical = normalizeUrlInput(urlRaw);
  const urlKey = checklistUrlKey(canonical);

  let tasks = defaultChecklistTasks();
  if (Array.isArray(body.tasks)) {
    const parsed = parseTasksJson({ tasks: body.tasks });
    if (parsed) tasks = parsed;
  } else if (body.reset === true) {
    const latestAudit = await prisma.siteAudit.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: { findings: true },
    });
    const findings = Array.isArray(latestAudit?.findings) ? (latestAudit!.findings as AuditFinding[]) : [];
    tasks = applyFindingHints(defaultChecklistTasks(), findings);
  }

  const siteAuditId = typeof body.siteAuditId === "string" ? body.siteAuditId : null;

  const row = await prisma.onPageChecklist.upsert({
    where: { userId_urlKey: { userId: session.user.id, urlKey } },
    create: {
      userId: session.user.id,
      url: canonical,
      urlKey,
      siteAuditId,
      tasks: tasks as object[],
    },
    update: {
      url: canonical,
      siteAuditId: siteAuditId ?? undefined,
      tasks: tasks as object[],
    },
  });

  return NextResponse.json({
    url: row.url,
    persisted: true,
    id: row.id,
    siteAuditId: row.siteAuditId,
    tasks,
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: { plan: true },
  });
  if (!sub || !hasAuditAccess(sub.plan)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const urlRaw = typeof body.url === "string" ? body.url : "";
  const taskId = typeof body.taskId === "string" ? body.taskId : "";
  if (!urlRaw.trim() || !taskId) {
    return NextResponse.json({ error: "url and taskId required" }, { status: 400 });
  }
  if (typeof body.done !== "boolean") {
    return NextResponse.json({ error: "done boolean required" }, { status: 400 });
  }

  const canonical = normalizeUrlInput(urlRaw);
  const urlKey = checklistUrlKey(canonical);

  const existing = await prisma.onPageChecklist.findUnique({
    where: { userId_urlKey: { userId: session.user.id, urlKey } },
  });

  let tasks = existing
    ? parseTasksJson({ tasks: existing.tasks }) || defaultChecklistTasks()
    : defaultChecklistTasks();

  const latestAudit = await prisma.siteAudit.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { findings: true },
  });
  const findings = Array.isArray(latestAudit?.findings) ? (latestAudit!.findings as AuditFinding[]) : [];
  if (!existing) {
    tasks = applyFindingHints(defaultChecklistTasks(), findings);
  }

  tasks = tasks.map((t) => (t.id === taskId ? { ...t, done: body.done } : t));

  const row = await prisma.onPageChecklist.upsert({
    where: { userId_urlKey: { userId: session.user.id, urlKey } },
    create: {
      userId: session.user.id,
      url: canonical,
      urlKey,
      siteAuditId: null,
      tasks: tasks as object[],
    },
    update: { tasks: tasks as object[] },
  });

  return NextResponse.json({
    url: row.url,
    persisted: true,
    id: row.id,
    tasks,
  });
}
