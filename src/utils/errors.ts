export class CliError extends Error {
  exitCode: number;
  code?: string;

  constructor(message: string, exitCode = 1, code?: string) {
    super(message);
    this.exitCode = exitCode;
    this.code = code;
  }
}
