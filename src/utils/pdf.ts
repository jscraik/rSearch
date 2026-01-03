import { PDFParse } from "pdf-parse";

export const extractPdfText = async (buffer: Uint8Array): Promise<string> => {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy();
  return result.text ?? "";
};
