import { GoogleGenAI, PersonGeneration } from "@google/genai";
import { finalizeImagePromptForGeneration } from "@/lib/creative-image-prompt";

const DEFAULT_IMAGE_MODEL = "imagen-4.0-fast-generate-001";

function imagenDisabled(): boolean {
  const v = process.env.DISABLE_IMAGEN?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/**
 * Google Imagen via the same AI Studio key as Gemini text.
 * Generates pixels from your prompts (blogs/ads). If Google returns a billing or policy error,
 * callers should fall back to static heroes. Set DISABLE_IMAGEN=1 to skip API calls (dev).
 */
export async function generateImageDataUrl(input: {
  prompt: string;
  aspectRatio: "1:1" | "16:9" | "4:3";
  outputMimeType?: "image/png" | "image/jpeg";
}): Promise<string> {
  if (imagenDisabled()) {
    throw new Error("Imagen disabled (DISABLE_IMAGEN)");
  }
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const model = process.env.GEMINI_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
  const visual = finalizeImagePromptForGeneration(input.prompt);

  const ai = new GoogleGenAI({ apiKey });

  let lastErr: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await ai.models.generateImages({
        model,
        prompt: visual,
        config: {
          numberOfImages: 1,
          aspectRatio: input.aspectRatio,
          outputMimeType: input.outputMimeType || "image/png",
          personGeneration: PersonGeneration.ALLOW_ADULT,
        },
      });

      const first = response.generatedImages?.[0];
      if (first?.raiFilteredReason) {
        throw new Error(`Imagen filtered: ${first.raiFilteredReason}`);
      }
      const img = first?.image;
      const b64 = img?.imageBytes;
      const mime = img?.mimeType || "image/png";
      if (!b64) {
        throw new Error("Imagen returned no image bytes");
      }
      return `data:${mime};base64,${b64}`;
    } catch (e: unknown) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      const retryable =
        msg.includes("503") || msg.includes("429") || msg.includes("UNAVAILABLE") || msg.includes("RESOURCE_EXHAUSTED");
      if (!retryable || attempt === 4) throw e;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
