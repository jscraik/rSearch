import type { ArxivEntry, ArxivSearchResult } from "../arxiv/types.js";
import { VERSION } from "../version.js";

export type JsonEnvelope<T> = {
  schema: string;
  meta: {
    tool: string;
    version: string;
    timestamp: string;
    request_id?: string;
  };
  summary: string;
  status: "success" | "warn" | "error";
  data: T;
  errors: string[];
};

export const createEnvelope = <T>(
  schema: string,
  data: T,
  summary: string,
  status: "success" | "warn" | "error" = "success",
  errors: string[] = []
): JsonEnvelope<T> => ({
  schema,
  meta: {
    tool: "arxiv",
    version: VERSION,
    timestamp: new Date().toISOString()
  },
  summary,
  status,
  data,
  errors
});

export const formatEntriesPlain = (entries: ArxivEntry[]): string =>
  entries
    .map((entry) => `${entry.id}\t${entry.title}`)
    .join("\n");

export const formatIdsPlain = (entries: ArxivEntry[]): string =>
  entries.map((entry) => entry.id).join("\n");

export const formatSearchHuman = (result: ArxivSearchResult): string => {
  const lines = [
    `Total results: ${result.totalResults}`,
    `Items returned: ${result.entries.length}`,
    ""
  ];

  for (const entry of result.entries) {
    lines.push(`- ${entry.id}`);
    lines.push(`  ${entry.title}`);
    if (entry.pdfUrl) {
      lines.push(`  PDF: ${entry.pdfUrl}`);
    }
    if (entry.licenseUrl) {
      lines.push(`  License: ${entry.licenseUrl}`);
    } else if (entry.license) {
      lines.push(`  License: ${entry.license}`);
    }
    lines.push("");
  }

  return lines.join("\n");
};

export const formatDownloadHuman = (
  results: { id: string; path: string; status: string; error?: string }[]
): string => {
  const lines: string[] = [];
  for (const result of results) {
    if (result.status === "failed") {
      lines.push(`${result.id}\tFAILED\t${result.error ?? "unknown error"}`);
    } else {
      lines.push(`${result.id}\t${result.status.toUpperCase()}\t${result.path}`);
    }
  }
  return lines.join("\n");
};
