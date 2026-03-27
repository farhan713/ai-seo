import { createHash } from "crypto";

export function gscQueryKey(query: string): string {
  return createHash("sha256").update(query.trim(), "utf8").digest("hex");
}
