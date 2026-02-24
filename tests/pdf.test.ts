import { beforeEach, describe, expect, it, vi } from "vitest";

const getTextMock = vi.hoisted(() => vi.fn());
const destroyMock = vi.hoisted(() => vi.fn());

vi.mock("pdf-parse", () => ({
  PDFParse: class MockPDFParse {
    constructor(_options: unknown) {}

    getText = getTextMock;

    destroy = destroyMock;
  }
}));

import { extractPdfText } from "../src/utils/pdf.js";

describe("extractPdfText", () => {
  beforeEach(() => {
    getTextMock.mockReset();
    destroyMock.mockReset();
  });

  it("returns extracted text and cleans up parser state", async () => {
    getTextMock.mockResolvedValue({ text: "hello world" });
    destroyMock.mockResolvedValue(undefined);

    const text = await extractPdfText(new Uint8Array([1, 2, 3]));

    expect(text).toBe("hello world");
    expect(getTextMock).toHaveBeenCalledTimes(1);
    expect(destroyMock).toHaveBeenCalledTimes(1);
  });

  it("still destroys parser when text extraction fails", async () => {
    const error = new Error("parse failure");
    getTextMock.mockRejectedValue(error);
    destroyMock.mockResolvedValue(undefined);

    await expect(extractPdfText(new Uint8Array([1, 2, 3]))).rejects.toThrow("parse failure");
    expect(destroyMock).toHaveBeenCalledTimes(1);
  });
});
