import type { ArxivEntry } from "./types.js";

/**
 * Result of filtering entries by license metadata.
 *
 * @public
 */
export type LicenseFilterResult = {
  /** Entries that have license metadata */
  allowed: ArxivEntry[];
  /** IDs of entries missing license metadata */
  missingIds: string[];
};

/**
 * Checks if an entry has license metadata.
 *
 * @param entry - ArXiv entry to check
 * @returns `true` if the entry has a license URL or license string
 *
 * @public
 */
export const hasLicenseMetadata = (entry: ArxivEntry): boolean =>
  Boolean(entry.licenseUrl || entry.license);

/**
 * Filters entries to only those with license metadata.
 *
 * @param entries - Array of arXiv entries to filter
 * @returns Object with allowed entries and IDs of entries missing license
 *
 * @example
 * ```ts
 * const result = filterByLicense(entries);
 * console.log(`${result.allowed.length} have license info`);
 * console.log(`${result.missingIds.length} are missing license`);
 * ```
 *
 * @public
 */
export const filterByLicense = (entries: ArxivEntry[]): LicenseFilterResult => {
  const allowed: ArxivEntry[] = [];
  const missingIds: string[] = [];

  for (const entry of entries) {
    if (hasLicenseMetadata(entry)) {
      allowed.push(entry);
    } else {
      missingIds.push(entry.id);
    }
  }

  return { allowed, missingIds };
};
