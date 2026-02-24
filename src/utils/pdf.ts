import { PDFParse } from "pdf-parse";

export const extractPdfText = async (buffer: Uint8Array): Promise<string> => {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    try {
      await parser.destroy();
    } catch {
      // Ignore parser cleanup failures to preserve primary extraction errors.
    }
  }
};
