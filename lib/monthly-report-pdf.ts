import PDFDocument from "pdfkit";

export function buildMonthlyReportPdfBuffer(input: { title: string; lines: string[] }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 50, size: "LETTER" });
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).text(input.title, { align: "center" });
    doc.moveDown();
    doc.fontSize(9).fillColor("#444444").text("AI SEO Tool — Elite monthly executive brief", { align: "center" });
    doc.fillColor("#000000");
    doc.moveDown(1.5);
    doc.fontSize(10);
    for (const line of input.lines) {
      doc.text(line, { align: "left", width: 500 });
      doc.moveDown(0.35);
    }
    doc.end();
  });
}
