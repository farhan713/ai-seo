export type ClientProvidedKeysShape = {
  geminiApiKey?: string;
  pageSpeedApiKey?: string;
};

export function parseClientProvidedKeys(raw: unknown): ClientProvidedKeysShape {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const gemini = typeof o.geminiApiKey === "string" ? o.geminiApiKey.trim() : "";
  const pageSpeed = typeof o.pageSpeedApiKey === "string" ? o.pageSpeedApiKey.trim() : "";
  return {
    ...(gemini ? { geminiApiKey: gemini } : {}),
    ...(pageSpeed ? { pageSpeedApiKey: pageSpeed } : {}),
  };
}

export function mergeClientProvidedKeysPatch(
  current: unknown,
  patch: { geminiApiKey?: string | null; pageSpeedApiKey?: string | null }
): ClientProvidedKeysShape {
  const base = parseClientProvidedKeys(current);
  const next = { ...base };
  if (patch.geminiApiKey !== undefined) {
    if (patch.geminiApiKey === null) {
      delete next.geminiApiKey;
    } else {
      const v = patch.geminiApiKey.trim();
      if (v) next.geminiApiKey = v;
      else delete next.geminiApiKey;
    }
  }
  if (patch.pageSpeedApiKey !== undefined) {
    if (patch.pageSpeedApiKey === null) {
      delete next.pageSpeedApiKey;
    } else {
      const v = patch.pageSpeedApiKey.trim();
      if (v) next.pageSpeedApiKey = v;
      else delete next.pageSpeedApiKey;
    }
  }
  return next;
}
