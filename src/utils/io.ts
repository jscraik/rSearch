import { createInterface } from "node:readline";

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

export const isTty = () => process.stdout.isTTY ?? false;
