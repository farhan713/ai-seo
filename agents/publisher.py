"""PostgreSQL helpers for the blog agent (psycopg2)."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import psycopg2
from psycopg2 import errors as pg_errors
from psycopg2.extras import Json

from config import DATABASE_URL


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


def fetch_active_seo_users(conn) -> list[dict[str, Any]]:
    """Users with an active SEO_CONTENT subscription."""
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
      AND s.plan = 'SEO_CONTENT'
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
) -> str:
    blog_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    sql = """
    INSERT INTO "Blog" (
      id, "userId", title, slug, summary, body,
      "metaTitle", "metaDescription", status, "generatedAt", "copiedAt",
      "createdAt", "updatedAt"
    ) VALUES (
      %s, %s, %s, %s, %s, %s,
      %s, %s, 'GENERATED', %s, NULL,
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
