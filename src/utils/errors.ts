/**
 * CLI error with associated exit code and optional error code.
 *
 * @extends Error
 *
 * @public
 */
export class CliError extends Error {
  /** Process exit code for this error */
  exitCode: number;
  /** Machine-readable error code (e.g., "E_USAGE", "E_VALIDATION") */
  code?: string;

  /**
   * Creates a new CLI error.
   *
   * @param message - Human-readable error message
   * @param exitCode - Process exit code (default: 1)
   * @param code - Optional machine-readable error code
   *
   * @example
   * ```ts
   * throw new CliError("Invalid input", 2, "E_VALIDATION");
   * ```
   */
  constructor(message: string, exitCode = 1, code?: string) {
    super(message);
    this.exitCode = exitCode;
    this.code = code;
  }
}
