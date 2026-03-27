"""PostgreSQL helpers for the blog agent (psycopg2)."""

from __future__ import annotations

import json
import os
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import psycopg2
from psycopg2 import errors as pg_errors
from psycopg2.extras import Json

from config import DATABASE_URL

# Mirrors lib/stock-creative-images.ts (order = first match wins)
_HERO_CATEGORIES: list[tuple[str, list[str]]] = [
    (
        "comparison",
        [
            "vs",
            "versus",
            "compare",
            "switch",
            "excel to power bi",
            "migration",
            "which is better",
            "alternative to",
            "or ",
        ],
    ),
    (
        "consulting",
        [
            "consultant",
            "choose",
            "choosing",
            "hire",
            "find",
            "partner",
            "agency",
            "professional services",
            "b2b",
            "enterprise",
            "strategy",
            "advisory",
            "workshop",
            "book a",
            "book an",
            "get started",
            "contact us",
            "free consult",
            "uae",
            "dubai",
            "abu dhabi",
            "emirates",
            "qatar",
            "ksa",
            "riyadh",
        ],
    ),
    (
        "automation",
        [
            "automate",
            "automation",
            "reduce time",
            "reduce reporting",
            "workflow",
            "scheduling",
            "chatbot",
            "no-code",
            "zapier",
            "make.com",
        ],
    ),
    (
        "dashboard",
        [
            "dashboard",
            "kpi",
            "cfo dashboard",
            "visuali",
            "analytics",
            "metrics",
            "data viz",
            "visualization",
            "webgl",
            "three.js",
            "threejs",
            "3d website",
            "3d web",
            "immersive",
            "digital experience",
        ],
    ),
    (
        "governance",
        [
            "governance",
            "compliance",
            "security",
            "data quality",
            "best practice",
            "privacy",
            "gdpr",
            "hipaa",
            "audit",
            "risk management",
            "legal",
            "lawyer",
            "attorney",
            "regulatory",
        ],
    ),
    (
        "performance",
        [
            "slow",
            "performance",
            "optimis",
            "optimiz",
            "speed",
            "tuning",
            "dax",
            "rebuild",
            "core web",
            "lighthouse",
            "page speed",
            "core web vitals",
            "ux",
            "a/b test",
            "ab test",
            "landing page",
            "conversion rate",
        ],
    ),
    (
        "finance",
        [
            "financial",
            "cfo",
            "finance",
            "revenue",
            "budget",
            "cost",
            "pricing",
            "subscription",
            "invoice",
            "payment",
            "ecommerce",
            "e-commerce",
            "shopify",
            "woocommerce",
            "retail",
            "sales",
            "roi",
            "mortgage",
            "insurance",
            "investment",
        ],
    ),
    (
        "forecasting",
        [
            "forecast",
            "predict",
            "accuracy",
            "planning",
            "trend",
            "pipeline",
            "quarterly",
            "growth strategy",
            "projection",
        ],
    ),
    (
        "architecture",
        [
            "single source",
            "source of truth",
            "data architecture",
            "integration",
            "centralise",
            "centralize",
            "schema",
            "sitemap",
            "crawl",
            "javascript",
            "api",
            "microservices",
            "cloud",
            "devops",
            "saas",
            "software",
            "platform",
            "tech stack",
        ],
    ),
    (
        "reporting",
        [
            "report",
            "friction",
            "board report",
            "insight",
            "seo",
            "search",
            "ranking",
            "keyword",
            "serp",
            "organic",
            "backlink",
            "analytics",
            "content marketing",
            "social media",
            "meta ads",
            "facebook ads",
            "instagram",
            "facebook",
            "paid social",
            "ppc",
            "sem",
            "google ads",
            "campaign",
            "ad creative",
            "sponsored",
            "promotion",
            "newsletter",
            "email marketing",
            "lead gen",
            "lead generation",
            "funnel",
            "dental",
            "medical practice",
            "clinic",
            "healthcare",
            "law firm",
            "local seo",
        ],
    ),
]


def stock_blog_hero_path(title: str, slug: str, industry: str | None = None) -> str:
    text = f"{title} {slug} {industry or ''}".lower()
    for cat, kws in _HERO_CATEGORIES:
        if any(k in text for k in kws):
            return f"/images/blog/{cat}.svg"
    return "/images/blog/dashboard.svg"


DESIGNER_FINISH = (
    " Senior art director level, refined composition, premium lighting, "
    "no text, logos, or watermarks in frame."
)


def _finalize_imagen_prompt(core: str) -> str:
    c = " ".join((core or "").split()).strip()
    if not c:
        c = "Premium editorial photograph, soft controlled light."
    max_len = 880
    if len(c) + len(DESIGNER_FINISH) > max_len:
        c = c[: max(80, max_len - len(DESIGNER_FINISH) - 3)].strip() + "..."
    return (c + DESIGNER_FINISH)[:950]


def _gemini_imagen_data_url(prompt: str, aspect_ratio: str) -> str:
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        raise RuntimeError("GEMINI_API_KEY is not set")
    model = os.environ.get("GEMINI_IMAGE_MODEL", "imagen-4.0-fast-generate-001").strip()
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:predict?key={key}"
    body = {
        "instances": [{"prompt": prompt[:1800]}],
        "parameters": {
            "sampleCount": 1,
            "aspectRatio": aspect_ratio,
            "outputOptions": {"mimeType": "image/png"},
            "personGeneration": "ALLOW_ADULT",
        },
    }
    payload = json.dumps(body).encode("utf-8")
    last_err: Exception | None = None
    for attempt in range(1, 5):
        req = Request(endpoint, data=payload, method="POST", headers={"Content-Type": "application/json"})
        try:
            with urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except HTTPError as e:
            raw = e.read().decode("utf-8", errors="replace")
            last_err = RuntimeError(f"Imagen HTTP {e.code}: {raw[:800]}")
            if e.code in (429, 500, 503) and attempt < 4:
                time.sleep(1.5 * attempt)
                continue
            raise last_err
        except URLError as e:
            last_err = e
            if attempt < 4:
                time.sleep(1.5 * attempt)
                continue
            raise

        preds = data.get("predictions") or []
        if not preds:
            raise RuntimeError(f"Imagen returned no predictions: {str(data)[:500]}")
        p0 = preds[0]
        if isinstance(p0, dict) and p0.get("raiFilteredReason"):
            raise RuntimeError(f"Imagen filtered: {p0['raiFilteredReason']}")
        b64 = None
        mime = "image/png"
        if isinstance(p0, dict):
            b64 = p0.get("bytesBase64Encoded")
            mime = p0.get("mimeType") or mime
            inner = p0.get("image")
            if not b64 and isinstance(inner, dict):
                b64 = inner.get("bytesBase64Encoded") or inner.get("imageBytes")
                mime = inner.get("mimeType") or mime
        if not b64:
            raise RuntimeError(f"Imagen prediction has no image bytes: {str(p0)[:500]}")
        return f"data:{mime};base64,{b64}"
    if last_err:
        raise last_err
    raise RuntimeError("Imagen request failed")


def _blog_imagen_core(
    title: str,
    summary: str,
    meta_title: str,
    meta_description: str,
    cover_prompt: str | None,
    industry: str | None,
    business_name: str | None = None,
    body_excerpt: str | None = None,
) -> str:
    cp = (cover_prompt or "").strip()
    base = cp if len(cp) >= 35 else ""
    if not base:
        parts = [
            "Wide 16:9 editorial hero photograph for a professional blog article.",
            f"Title: {title}.",
            f"Summary: {summary[:520]}.",
            f"Meta title: {meta_title}.",
        ]
        if meta_description:
            parts.append(f"Meta description: {meta_description[:260]}.")
        if business_name:
            parts.append(f"Company: {business_name}.")
        if industry:
            parts.append(f"Industry: {industry}.")
        base = " ".join(parts)
    ex = " ".join((body_excerpt or "").split())[:520]
    if len(ex) > 50:
        return f"{base} Article body themes and concrete details to reflect visually: {ex}"
    return base


def _blog_cover_uses_imagen() -> bool:
    m = (os.environ.get("BLOG_COVER_MODE") or "stock").strip().lower()
    return m in ("imagen", "ai", "generate")


def imagen_blog_cover_or_stock(
    title: str,
    slug: str,
    summary: str,
    meta_title: str,
    meta_description: str,
    cover_prompt: str | None,
    industry: str | None,
    business_name: str | None = None,
    body: list | dict | None = None,
) -> str:
    """Keyword → /images/blog/*.svg by default; Imagen only if BLOG_COVER_MODE=imagen (or on explicit opt-in + API failure → stock)."""
    if not _blog_cover_uses_imagen():
        return stock_blog_hero_path(title, slug, industry)
    try:
        body_excerpt = None
        if body is not None:
            raw = json.dumps(body, ensure_ascii=False)[:900]
            body_excerpt = raw
        core = _blog_imagen_core(
            title, summary, meta_title, meta_description, cover_prompt, industry, business_name, body_excerpt
        )
        visual = _finalize_imagen_prompt(core)
        return _gemini_imagen_data_url(visual, "16:9")
    except Exception:
        return stock_blog_hero_path(title, slug, industry)


def connect():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not set")
    return psycopg2.connect(DATABASE_URL)


def monday_start_utc(now: datetime | None = None) -> datetime:
    now = now or datetime.now(timezone.utc)
    d = now.date()
    weekday = d.weekday()  # Monday = 0
    start = datetime(d.year, d.month, d.day, tzinfo=timezone.utc) - timedelta(days=weekday)
    return start


def fetch_active_growth_users(conn) -> list[dict[str, Any]]:
    """Users with an active Growth or Elite plan (blogs included)."""
    sql = """
    SELECT DISTINCT ON (u.id)
      u.id,
      u.email,
      u.name,
      u."businessName",
      u."businessUrl",
      u."businessDescription",
      u.industry,
      u."targetKeywords",
      u."internalLinks",
      s."blogsPerWeek"
    FROM "User" u
    INNER JOIN "Subscription" s ON s."userId" = u.id
    WHERE u.role = 'CLIENT'
      AND u."isActive" = true
      AND s.plan IN ('GROWTH_899', 'ELITE_1599')
      AND s.status = 'ACTIVE'
    ORDER BY u.id, s."createdAt" DESC
    """
    with conn.cursor() as cur:
        cur.execute(sql)
        cols = [c[0] for c in cur.description]
        rows = []
        for tup in cur.fetchall():
            rows.append(dict(zip(cols, tup)))
    return rows


def count_blogs_this_week(conn, user_id: str, week_start: datetime) -> int:
    sql = """
    SELECT COUNT(*)::int FROM "Blog"
    WHERE "userId" = %s AND "generatedAt" >= %s
    """
    with conn.cursor() as cur:
        cur.execute(sql, (user_id, week_start))
        row = cur.fetchone()
        return int(row[0]) if row else 0


def insert_blog(
    conn,
    user_id: str,
    title: str,
    slug: str,
    summary: str,
    body: list | dict,
    meta_title: str,
    meta_description: str,
    cover_image_url: str | None = None,
    cover_image_prompt: str | None = None,
) -> str:
    blog_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    cover = cover_image_url or stock_blog_hero_path(title, slug, None)
    prompt = (cover_image_prompt or "").strip() or None
    sql = """
    INSERT INTO "Blog" (
      id, "userId", title, slug, summary, body,
      "metaTitle", "metaDescription", "coverImageUrl", "coverImagePrompt", status, "generatedAt", "copiedAt",
      "createdAt", "updatedAt"
    ) VALUES (
      %s, %s, %s, %s, %s, %s,
      %s, %s, %s, %s, 'GENERATED', %s, NULL,
      %s, %s
    )
    """
    current_slug = slug
    for _ in range(6):
        try:
            with conn.cursor() as cur:
                cur.execute(
                    sql,
                    (
                        blog_id,
                        user_id,
                        title,
                        current_slug,
                        summary,
                        Json(body),
                        meta_title,
                        meta_description,
                        cover,
                        prompt,
                        now,
                        now,
                        now,
                    ),
                )
            conn.commit()
            return blog_id
        except pg_errors.UniqueViolation:
            conn.rollback()
            current_slug = f"{slug}-{uuid.uuid4().hex[:8]}"
    raise RuntimeError("Could not insert blog with a unique slug")
