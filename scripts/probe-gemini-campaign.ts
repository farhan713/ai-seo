/**
 * One-off: call Gemini with the same prompt as campaign ideas and print raw + parse.
 * Run: npx tsx scripts/probe-gemini-campaign.ts
 */
import "./load-env";
import { generateTrendCampaignIdeas } from "../lib/gemini-campaign-ideas";

async function main() {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  console.log("GEMINI_MODEL:", model);
  console.log("GEMINI_API_KEY set:", Boolean(process.env.GEMINI_API_KEY?.trim()));

  let raw = "";
  const ideas = await generateTrendCampaignIdeas({
    user: {
      businessName: "Oakwood UAE",
      businessUrl: "https://example.com",
      businessDescription: "Premium furniture and interiors",
      industry: "Retail",
      industryVertical: "ECOMMERCE",
      marketingGoal: "AWARENESS",
    },
    calendarDateLabel: "2026-03-27",
    weekdayName: "Friday",
    optionalFocus: "Spring refresh sale, tone professional",
    onRawResponse: (t) => {
      raw = t;
      console.log("\n--- RAW RESPONSE (length", t.length, ") ---\n");
      console.log(t);
      console.log("\n--- END RAW ---\n");
    },
  });

  console.log("Parsed ideas:", ideas.length);
  console.log(JSON.stringify(ideas, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
