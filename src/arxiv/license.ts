import type { ArxivEntry } from "./types.js";

export type LicenseFilterResult = {
  allowed: ArxivEntry[];
  missingIds: string[];
};

export const hasLicenseMetadata = (entry: ArxivEntry): boolean =>
  Boolean(entry.licenseUrl || entry.license);

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
