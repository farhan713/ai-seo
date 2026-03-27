import type { Plan } from "@prisma/client";

export function defaultsForPlan(plan: Plan): { priceInInr: number; blogsPerWeek: number; backlinksPerMonth: number } {
  switch (plan) {
    case "STARTER_499":
      return { priceInInr: 499, blogsPerWeek: 0, backlinksPerMonth: 0 };
    case "GROWTH_899":
      return { priceInInr: 899, blogsPerWeek: 3, backlinksPerMonth: 10 };
    case "ELITE_1599":
      return { priceInInr: 1599, blogsPerWeek: 3, backlinksPerMonth: 10 };
    default:
      return { priceInInr: 899, blogsPerWeek: 3, backlinksPerMonth: 10 };
  }
}
