import type { Plan } from "@prisma/client";

/** Plan caps for tracked keywords (F5). */
export function trackedKeywordLimit(plan: Plan | null | undefined): number {
  switch (plan) {
    case "STARTER_499":
      return 10;
    case "GROWTH_899":
      return 50;
    case "ELITE_1599":
    case "ELITE_TRIAL":
      return 100;
    default:
      return 0;
  }
}
