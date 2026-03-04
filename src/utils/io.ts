import { createInterface } from "node:readline";
import { access } from "node:fs/promises";

/**
 * Reads all input from stdin as a single string.
 *
 * @returns Promise resolving to stdin contents, or empty string if TTY
 *
 * @remarks
 * Returns empty string immediately if stdin is a TTY (interactive terminal).
 *
 * @public
 */
export const readStdin = async (): Promise<string> => {
  if (process.stdin.isTTY) {
    return "";
  }

  const chunks: string[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(String(chunk));
  }
  return chunks.join("");
};

/**
 * Reads stdin as a list of lines.
 *
 * @returns Promise resolving to array of non-empty trimmed lines
 *
 * @remarks
 * Returns empty array immediately if stdin is a TTY.
 *
 * @public
 */
export const readLines = async (): Promise<string[]> => {
  if (process.stdin.isTTY) {
    return [];
  }

  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  const lines: string[] = [];
  for await (const line of rl) {
    lines.push(line.trim());
  }
  rl.close();
  return lines.filter(Boolean);
};

/**
 * Checks if stdout is a terminal (TTY).
 *
 * @returns `true` if stdout is a TTY, `false` otherwise
 *
 * @public
 */
export const isTty = () => process.stdout.isTTY ?? false;

/**
 * Checks if a file exists at the given path.
 *
 * @param path - File path to check
 * @returns Promise resolving to `true` if file exists, `false` otherwise
 *
 * @remarks
 * Uses `fs.promises.access` which checks without opening the file.
 * Returns `false` for any error (ENOENT, EACCES, etc.), not just missing files.
 *
 * @public
 */
export const fileExists = async (path: string): Promise<boolean> => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};
