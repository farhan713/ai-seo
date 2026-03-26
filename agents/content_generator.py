"""Gemini integration for SEO blog JSON generation (humanized rules, structured blocks)."""

from __future__ import annotations

import json
import re
from typing import Any

from google import genai
from google.genai import types

from config import GEMINI_API_KEY, GEMINI_MODEL


def _format_internal_links(raw: Any) -> str:
    if not isinstance(raw, list):
        return "None provided."
    lines = []
    for item in raw:
        if isinstance(item, dict) and "url" in item and "anchor" in item:
            lines.append(f'- Anchor: "{item["anchor"]}" → {item["url"]}')
    return "\n".join(lines) if lines else "None provided."


def build_prompt(row: dict[str, Any]) -> str:
    keywords = (row.get("targetKeywords") or "").strip() or "general local and industry terms"
    internal = _format_internal_links(row.get("internalLinks"))
    name = row.get("businessName") or "the business"
    industry = row.get("industry") or "general"
    url = row.get("businessUrl") or "not specified"
    desc = row.get("businessDescription") or "No extra description provided."

    return f"""You are an expert SEO blog writer. Write one complete blog post for this business.

Business name: {name}
Industry: {industry}
Website: {url}
About the business:
{desc}

Target keywords (weave in naturally, do not stuff): {keywords}

Internal links to use naturally in the body where relevant (HTML will be built separately, just reference the pages in prose and note which anchor fits):
{internal}

Writing rules (strict):
- Conversational, helpful tone. Write like you are talking to a smart friend.
- Do not use em dashes (—) anywhere. Use commas or periods instead.
- Do not use semicolons. Split into separate sentences.
- No robotic filler. Be specific to this business and industry.
- Structure the article with clear h2 sections, bullet lists where useful, and one callout box with a practical tip or warning.
- Length: roughly 900 to 1400 words of readable body text across all blocks.

Output format: respond with JSON only, no markdown fences. Use this exact shape:
{{
  "title": "string",
  "slug": "lowercase-kebab-case-slug",
  "summary": "one paragraph teaser under 220 characters",
  "metaTitle": "under 60 chars, includes primary keyword",
  "metaDescription": "under 155 chars, compelling",
  "body": [
    {{ "type": "h2", "text": "Section heading" }},
    {{ "type": "p", "text": "Paragraph..." }},
    {{ "type": "ul", "content": ["bullet one", "bullet two"] }},
    {{ "type": "callout", "text": "Short tip or note in a highlighted box." }}
  ]
}}

The body array must alternate sections logically: start after title with an intro p, then h2/p patterns, include at least two h2 sections, at least one ul, and exactly one callout. Every block must use the types h2, p, ul, or callout only. For p and h2 and callout use the property "text" for the string content."""


def _normalize_slug(slug: str) -> str:
    s = slug.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def generate_blog(row: dict[str, Any]) -> dict[str, Any]:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not set")

    client = genai.Client(api_key=GEMINI_API_KEY)
    prompt = build_prompt(row)
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
        ),
    )
    text = response.text or ""
    data = json.loads(text)
    title = str(data.get("title") or "").strip()
    slug = _normalize_slug(str(data.get("slug") or ""))
    summary = str(data.get("summary") or "").strip()
    meta_title = str(data.get("metaTitle") or title)[:70]
    meta_desc = str(data.get("metaDescription") or summary)[:160]
    body = data.get("body") or []
    if not title or not slug or not isinstance(body, list) or len(body) == 0:
        raise RuntimeError("Incomplete blog from Gemini")
    return {
        "title": title,
        "slug": slug,
        "summary": summary,
        "metaTitle": meta_title,
        "metaDescription": meta_desc,
        "body": body,
    }
