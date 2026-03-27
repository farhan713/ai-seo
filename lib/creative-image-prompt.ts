const DESIGNER_FINISH =
  " Senior art director level, refined composition, premium lighting, photoreal or high-end CGI only if it fits the brief, no text, logos, or watermarks in frame.";

/** Keep under Imagen prompt limits; append consistent finish. */
export function finalizeImagePromptForGeneration(core: string): string {
  let c = core.replace(/\s+/g, " ").trim();
  if (!c) {
    c = "Premium editorial photograph, soft controlled light, clean background.";
  }
  const max = 880;
  if (c.length + DESIGNER_FINISH.length > max) {
    c = c.slice(0, Math.max(80, max - DESIGNER_FINISH.length - 3)).trim() + "...";
  }
  return (c + DESIGNER_FINISH).slice(0, 950);
}
