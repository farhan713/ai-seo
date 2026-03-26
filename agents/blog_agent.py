#!/usr/bin/env python3
"""
Cron orchestrator: for each client with an active SEO_CONTENT subscription,
generate blogs up to their weekly cap using Gemini.
"""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

# Allow `python agents/blog_agent.py` from repo root
_ROOT = Path(__file__).resolve().parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from content_generator import generate_blog
from publisher import (
    connect,
    count_blogs_this_week,
    fetch_active_seo_users,
    insert_blog,
    monday_start_utc,
)


def main() -> int:
    week_start = monday_start_utc()
    conn = connect()
    try:
        users = fetch_active_seo_users(conn)
        print(f"[blog_agent] {datetime.now(timezone.utc).isoformat()} active subscribers: {len(users)}")
        for row in users:
            uid = row["id"]
            cap = int(row.get("blogsPerWeek") or 3)
            used = count_blogs_this_week(conn, uid, week_start)
            if used >= cap:
                print(f"  skip user={uid} ({used}/{cap} this week)")
                continue
            try:
                payload = generate_blog(row)
                bid = insert_blog(
                    conn,
                    uid,
                    payload["title"],
                    payload["slug"],
                    payload["summary"],
                    payload["body"],
                    payload["metaTitle"],
                    payload["metaDescription"],
                )
                print(f"  created blog id={bid} user={uid} slug={payload['slug']}")
            except Exception as e:
                print(f"  ERROR user={uid}: {e}", file=sys.stderr)
                conn.rollback()
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
