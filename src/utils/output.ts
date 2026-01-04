import type { ArxivEntry, ArxivSearchResult } from "../arxiv/types.js";
import { VERSION } from "../version.js";

/**
 * JSON output envelope schema.
 *
 * @typeParam T - Type of the data payload
 *
 * @public
 */
export type JsonEnvelope<T> = {
  /** Schema identifier (e.g., "arxiv.output.v1") */
  schema: string;
  /** Metadata about the tool and request */
  meta: {
    /** Tool name */
    tool: string;
    /** Tool version */
    version: string;
    /** ISO 8601 timestamp */
    timestamp: string;
    /** Optional request identifier */
    request_id?: string;
  };
  /** Human-readable summary of the operation */
  summary: string;
  /** Operation status */
  status: "success" | "warn" | "error";
  /** Response data payload */
  data: T;
  /** Array of error codes (present when status is "error") */
  errors: string[];
};

/**
 * Creates a JSON envelope for CLI output.
 *
 * @typeParam T - Type of the data payload
 * @param schema - Schema identifier
 * @param data - Response data
 * @param summary - Human-readable summary
 * @param status - Operation status (default: "success")
 * @param errors - Optional error codes
 * @returns A JSON envelope object
 *
 * @public
 */
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

/**
 * Formats entries as tab-separated ID and title.
 *
 * @param entries - Array of arXiv entries
 * @returns Tab-separated string (one entry per line)
 *
 * @public
 */
export const formatEntriesPlain = (entries: ArxivEntry[]): string =>
  entries
    .map((entry) => `${entry.id}\t${entry.title}`)
    .join("\n");

/**
 * Formats entry IDs as a newline-separated list.
 *
 * @param entries - Array of arXiv entries
 * @returns Newline-separated IDs
 *
 * @public
 */
export const formatIdsPlain = (entries: ArxivEntry[]): string =>
  entries.map((entry) => entry.id).join("\n");

/**
 * Formats search results for human-readable terminal output.
 *
 * @param result - Search result from the arXiv API
 * @returns Formatted multi-line string
 *
 * @public
 */
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

/**
 * Formats download results for human-readable terminal output.
 *
 * @param results - Array of download result objects
 * @returns Tab-separated string (one result per line)
 *
 * @public
 */
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
