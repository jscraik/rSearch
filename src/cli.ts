#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { ArxivClient } from "./arxiv/client.js";
import type { ArxivSearchOptions } from "./arxiv/types.js";
import type { ArxivEntry } from "./arxiv/types.js";
import type { TaxonomyCategory, TaxonomyResult } from "./arxiv/taxonomy.js";
import { MAX_PAGE_SIZE, MAX_TOTAL_RESULTS } from "./arxiv/query.js";
import { envConfig, loadConfig } from "./config.js";
import { readLines, readStdin } from "./utils/io.js";
import {
  createEnvelope,
  formatDownloadHuman,
  formatEntriesPlain,
  formatIdsPlain,
  formatSearchHuman
} from "./utils/output.js";
import { CliError } from "./utils/errors.js";
import { VERSION } from "./version.js";
import { fetchTaxonomy } from "./arxiv/taxonomy.js";
import { extractPdfText } from "./utils/pdf.js";
import { filterByLicense, hasLicenseMetadata } from "./arxiv/license.js";
import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";

const installBrokenPipeHandlers = () => {
  const handlePipeError = (error: unknown) => {
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "EPIPE") {
      process.exit(0);
      return;
    }

    if (error instanceof Error) {
      throw error;
    }
    throw new Error(String(error));
  };

  process.stdout.on("error", handlePipeError);
  process.stderr.on("error", handlePipeError);
};

installBrokenPipeHandlers();

const coercePositiveInt = (label: string) => (value: unknown): number | undefined => {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    throw new CliError(`Invalid ${label} (expected positive integer): ${value}`, 2, "E_VALIDATION");
  }
  return parsed;
};

const coerceNonNegativeInt = (label: string) => (value: unknown): number | undefined => {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    throw new CliError(`Invalid ${label} (expected non-negative integer): ${value}`, 2, "E_VALIDATION");
  }
  return parsed;
};

const cli = yargs(hideBin(process.argv))
  .scriptName("rsearch")
  .usage("$0 [global flags] <command> [args]")
  .example("$0 search \"cat:cs.AI\" --max-results 5", "Search arXiv papers")
  .example("$0 fetch 2101.00001 2101.00002", "Fetch metadata by ID")
  .example("$0 categories tree", "Browse category taxonomy")
  .epilog("Docs: https://clig.dev | Support: jscraik@brainwav.io")
  .option("json", { type: "boolean", default: false, describe: "Emit JSON output" })
  .option("plain", { type: "boolean", default: false, describe: "Emit plain line output" })
  .option("quiet", { type: "boolean", default: false, describe: "Suppress non-essential output" })
  .option("verbose", { type: "boolean", default: false, describe: "Verbose diagnostics" })
  .option("debug", { type: "boolean", default: false, describe: "Debug HTTP requests" })
  .option("color", {
    type: "string",
    choices: ["auto", "always", "never"],
    default: "auto",
    describe: "Colorize output"
  })
  .option("no-color", { type: "boolean", default: false, describe: "Disable ANSI color output" })
  .option("input", {
    type: "boolean",
    default: true,
    describe: "Enable stdin prompts (use --no-input to disable)"
  })
  .option("config", { type: "string", describe: "Path to config file" })
  .option("api-base-url", { type: "string", describe: "Override arXiv API base URL" })
  .option("pdf-base-url", { type: "string", describe: "Override arXiv PDF base URL" })
  .option("user-agent", { type: "string", describe: "Override User-Agent header" })
  .option("contact", { type: "string", describe: "Contact email to include in User-Agent" })
  .option("timeout", {
    type: "number",
    describe: "HTTP timeout in ms"
  })
  .option("rate-limit", {
    type: "number",
    describe: "Minimum ms between API requests"
  })
  .option("max-retries", {
    type: "number",
    describe: "Max retry attempts for transient failures"
  })
  .option("retry", {
    type: "boolean",
    default: true,
    describe: "Enable retries for transient failures (use --no-retry to disable)"
  })
  .option("retry-base-delay", {
    type: "number",
    describe: "Base delay in ms for retry backoff"
  })
  .option("cache-dir", { type: "string", describe: "Path for on-disk HTTP cache" })
  .option("cache-ttl", {
    type: "number",
    describe: "TTL in ms for on-disk cache entries"
  })
  .option("page-size", {
    type: "number",
    describe: "Default page size for API calls"
  })
  .option("no-cache", { type: "boolean", default: false, describe: "Disable caching" })
  .version(VERSION)
  .alias("h", "help")
  .alias("q", "quiet")
  .alias("v", "verbose")
  .alias("V", "version")
  .help()
  .showHelpOnFail(true)
  .check((args) => {
    const outputModes = [args.json, args.plain, args.quiet].filter(Boolean).length;
    if (outputModes > 1) {
      throw new CliError("Choose only one output mode: --json, --plain, or --quiet.", 2, "E_USAGE");
    }

    if (args.retry === false && typeof args.maxRetries === "number") {
      throw new CliError("Choose either --no-retry or --max-retries.", 2, "E_USAGE");
    }

    const colorFlagSet = process.argv.some(
      (arg) => arg === "--color" || arg.startsWith("--color=")
    );
    if (args.noColor && colorFlagSet) {
      throw new CliError("Choose either --color or --no-color.", 2, "E_USAGE");
    }

    return true;
  })
  .fail((msg, err, yargsInstance) => {
    const parsedArgs = (yargsInstance as any)?.parsed?.argv;
    const jsonRequested = isJsonRequested(parsedArgs);
    if (err instanceof CliError) {
      if (err.exitCode === 2 && !jsonRequested) {
        yargsInstance.showHelp();
      }
      emitError(err, jsonRequested);
      return;
    }
    if (msg) {
      if (!jsonRequested) {
        yargsInstance.showHelp();
      }
      emitError(new CliError(msg, 2, "E_USAGE"), jsonRequested);
      return;
    }
    if (err) {
      emitError(err, jsonRequested);
    }
  })
  .command(
    "search <query>",
    "Search arXiv metadata",
    (y) =>
      y
        .positional("query", { type: "string", describe: "arXiv query string" })
        .option("ids-only", { type: "boolean", default: false, describe: "Return only IDs" })
        .option("require-license", {
          type: "boolean",
          default: false,
          describe: "Filter out results missing license metadata"
        })
        .option("start", { type: "number", describe: "Result offset" })
        .option("max-results", { type: "number", describe: "Max results to return" })
        .option("page-size", { type: "number", describe: "API page size (<=2000)" })
        .option("sort-by", {
          type: "string",
          choices: ["relevance", "lastUpdatedDate", "submittedDate"],
          describe: "Sort field"
        })
        .option("sort-order", {
          type: "string",
          choices: ["ascending", "descending"],
          describe: "Sort order"
        }),
    async (args) => {
      const query = await resolveQuery(args.query, args.input === false);
      if (!query) {
        throw new CliError("Provide a search query.", 2);
      }

      validatePagingArgs(args);
      const { client } = await createClientContext(args);
      const result = await client.search({
        searchQuery: query,
        start: args.start,
        maxResults: args.maxResults,
        pageSize: args.pageSize,
        sortBy: args.sortBy as ArxivSearchOptions["sortBy"],
        sortOrder: args.sortOrder as ArxivSearchOptions["sortOrder"]
      });

      const filtered = args.requireLicense ? filterByLicense(result.entries) : null;
      const filteredResult = filtered
        ? { ...result, entries: filtered.allowed, missingLicenseIds: filtered.missingIds }
        : result;

      const summary = filtered
        ? `Returned ${filtered.allowed.length} result(s); filtered ${filtered.missingIds.length} without license metadata`
        : `Returned ${result.entries.length} result(s)`;

      await outputResult({
        args,
        schema: "arxiv.search.v1",
        summary,
        json: filteredResult,
        plain: args.idsOnly ? formatIdsPlain(filteredResult.entries) : formatEntriesPlain(filteredResult.entries),
        human: formatSearchHuman(filteredResult),
        quietText: args.idsOnly ? formatIdsPlain(filteredResult.entries) : "",
        status: filtered ? "warn" : "success",
        exitCode: filtered && filtered.missingIds.length > 0 ? 3 : 0,
        errors: filtered?.missingIds.length ? ["license_metadata_missing"] : []
      });
    }
  )
  .command(
    "fetch [ids..]",
    "Fetch arXiv metadata by ID",
    (y) =>
      y
        .positional("ids", { type: "string", array: true, describe: "arXiv IDs" })
        .option("ids-only", { type: "boolean", default: false, describe: "Return only IDs" })
        .option("require-license", {
          type: "boolean",
          default: false,
          describe: "Filter out records missing license metadata"
        })
        .option("start", { type: "number", describe: "Result offset" })
        .option("max-results", { type: "number", describe: "Max results to return" })
        .option("page-size", { type: "number", describe: "API page size (<=2000)" }),
    async (args) => {
      const ids = await resolveIds(normalizeIdsArg(args.ids), args.input === false);
      if (ids.length === 0) {
        throw new CliError("Provide one or more arXiv IDs.", 2);
      }

      validatePagingArgs(args);
      const { client } = await createClientContext(args);
      const result = await client.fetchByIds(ids, {
        start: args.start,
        maxResults: args.maxResults,
        pageSize: args.pageSize
      });

      const filtered = args.requireLicense ? filterByLicense(result.entries) : null;
      const filteredResult = filtered
        ? { ...result, entries: filtered.allowed, missingLicenseIds: filtered.missingIds }
        : result;

      const summary = filtered
        ? `Returned ${filtered.allowed.length} record(s); filtered ${filtered.missingIds.length} without license metadata`
        : `Returned ${result.entries.length} record(s)`;

      await outputResult({
        args,
        schema: "arxiv.fetch.v1",
        summary,
        json: filteredResult,
        plain: args.idsOnly ? formatIdsPlain(filteredResult.entries) : formatEntriesPlain(filteredResult.entries),
        human: formatSearchHuman(filteredResult),
        quietText: args.idsOnly ? formatIdsPlain(filteredResult.entries) : "",
        status: filtered ? "warn" : "success",
        exitCode: filtered && filtered.missingIds.length > 0 ? 3 : 0,
        errors: filtered?.missingIds.length ? ["license_metadata_missing"] : []
      });
    }
  )
  .command(
    "download [ids..]",
    "Download PDFs by arXiv ID",
    (y) =>
      y
        .positional("ids", { type: "string", array: true, describe: "arXiv IDs" })
        .option("out-dir", { type: "string", describe: "Output directory" })
        .option("overwrite", { type: "boolean", default: false, describe: "Overwrite existing files" })
        .option("format", {
          type: "string",
          choices: ["pdf", "md", "json"],
          default: "pdf",
          describe: "Output format"
        })
        .option("keep-pdf", { type: "boolean", default: false, describe: "Keep PDF when exporting text formats" })
        .option("require-license", {
          type: "boolean",
          default: false,
          describe: "Fail downloads when license metadata is missing"
        })
        .option("query", { type: "string", describe: "Search query to download results" })
        .option("max-results", { type: "number", describe: "Max results to download" })
        .option("page-size", { type: "number", describe: "API page size (<=2000)" }),
    async (args) => {
      const { client, defaultDownloadDir } = await createClientContext(args);
      const noInput = args.input === false || rawArgvIncludesFlag("--no-input");
      const outputDirArg = normalizeOptionalString(args.outDir);
      const outputDir = outputDirArg ? expandHomePath(outputDirArg) : (defaultDownloadDir ?? process.cwd());
      const idsArg = normalizeIdsArg(args.ids);
      const rawQueryArgv = rawArgvValue("--query");
      const rawQueryAfterToken = rawArgvValueAfterToken("--query");
      const queryOptionProvided = rawQueryArgv !== undefined || rawArgvIncludesFlag("--query");
      if (rawQueryAfterToken !== undefined && rawQueryAfterToken.startsWith("--")) {
        throw new CliError("Provide a non-empty query for --query.", 2, "E_USAGE");
      }
      const rawQuery = rawQueryArgv ?? (typeof args.query === "string" ? args.query : undefined);
      if (
        queryOptionProvided
        && rawQuery !== "-"
        && (!rawQuery || rawQuery.trim().length === 0)
      ) {
        throw new CliError("Provide a non-empty query for --query.", 2, "E_USAGE");
      }

      const hasQuery = queryOptionProvided;
      const hasIds = Array.isArray(idsArg) && idsArg.length > 0;
      if (hasQuery && hasIds) {
        throw new CliError("Choose either --query or IDs, not both.", 2, "E_USAGE");
      }

      const query = hasQuery ? await resolveQuery(rawQuery, noInput) : undefined;
      if (hasQuery && !query) {
        throw new CliError("Provide a non-empty query for --query.", 2, "E_USAGE");
      }
      let ids = query ? [] : await resolveIds(idsArg, noInput);
      validatePagingArgs(args);

      if (query) {
        const result = await client.search({
          searchQuery: query,
          maxResults: args.maxResults,
          pageSize: args.pageSize
        });
        ids = result.entries.map((entry) => entry.id);
      }

      if (ids.length === 0) {
        throw new CliError("Provide arXiv IDs or a --query to download.", 2);
      }

      const format = String(args.format ?? "pdf");
      let results: { id: string; path: string; status: string; error?: string }[] = [];

      if (format === "pdf") {
        if (args.requireLicense) {
          const metadata = await client.fetchByIds(ids);
          const entryLookup = createEntryLookup(metadata.entries);
          const filtered = filterIdsByLicense(ids, entryLookup);
          results = [...filtered.failed];
          if (filtered.allowed.length > 0) {
            const downloaded = await client.download(filtered.allowed, outputDir, args.overwrite);
            results = results.concat(downloaded);
          }
        } else {
          results = await client.download(ids, outputDir, args.overwrite);
        }
      } else {
        const metadata = await client.fetchByIds(ids);
        const entryLookup = createEntryLookup(metadata.entries);
        if (args.requireLicense) {
          const filtered = filterIdsByLicense(ids, entryLookup);
          results = results.concat(filtered.failed);
          ids = filtered.allowed;
        }
        const textResults = await downloadAsTextFormats({
          client,
          ids,
          outputDir,
          overwrite: args.overwrite,
          entryLookup,
          format: format === "md" ? "md" : "json",
          keepPdf: args.keepPdf
        });
        results = results.concat(textResults);
      }

      await outputResult({
        args,
        schema: "arxiv.download.v1",
        summary: `Downloaded ${results.filter((r) => r.status === "downloaded").length} file(s)`,
        json: { results },
        plain: formatDownloadHuman(results),
        human: formatDownloadHuman(results),
        quietText: "",
        status: results.some((item) => item.status === "failed") ? "warn" : "success",
        exitCode: results.some((item) => item.status === "failed" && item.error !== "License metadata missing")
          ? 4
          : results.some((item) => item.status === "failed" && item.error === "License metadata missing")
            ? 3
            : 0,
        errors: results.some((item) => item.status === "failed" && item.error === "License metadata missing")
          ? ["license_metadata_missing"]
          : []
      });
    }
  )
  .command(
    "config",
    "Show effective configuration",
    () => {},
    async (args) => {
      const { client, configPaths, defaultDownloadDir } = await createClientContext(args);
      const resolved = { ...client.getConfig() } as Record<string, unknown>;
      if (typeof defaultDownloadDir === "string" && defaultDownloadDir.length > 0) {
        resolved.defaultDownloadDir = defaultDownloadDir;
      }

      await outputResult({
        args,
        schema: "arxiv.config.v1",
        summary: "Loaded configuration",
        json: { config: resolved, sources: configPaths },
        plain: JSON.stringify({ config: resolved, sources: configPaths }, null, 2),
        human: JSON.stringify({ config: resolved, sources: configPaths }, null, 2),
        quietText: ""
      });
    }
  )
  .command(
    "help [command..]",
    "Show help for a command",
    (y) => y.positional("command", { type: "string", array: true, describe: "Command name" }),
    async (args) => {
      const commandTokens = Array.isArray(args.command)
        ? args.command.map((token) => String(token))
        : [];

      if (commandTokens.length > 0) {
        const target = commandTokens[0] ?? "";
        if (target === "help") {
          cli.showHelp();
          return;
        }
        const knownCommands = ["search", "fetch", "download", "config", "help", "urls", "categories"];
        if (!knownCommands.includes(target)) {
          throw new CliError(`Unknown command: ${target}`, 2, "E_USAGE");
        }
        if (target !== "categories" && commandTokens.length > 1) {
          throw new CliError(`Unknown command path: ${commandTokens.join(" ")}`, 2, "E_USAGE");
        }
        if (target === "categories" && commandTokens.length > 1) {
          if (commandTokens.length > 2) {
            throw new CliError(`Unknown command path: ${commandTokens.join(" ")}`, 2, "E_USAGE");
          }
          const knownCategorySubcommands = ["list", "tree", "search", "show"];
          const subcommand = commandTokens[1] ?? "";
          if (!knownCategorySubcommands.includes(subcommand)) {
            throw new CliError(`Unknown command path: ${commandTokens.join(" ")}`, 2, "E_USAGE");
          }
        }
        const scriptPath = process.argv[1] ?? "";
        const childArgs = scriptPath.endsWith(".ts")
          ? ["--import", "tsx", scriptPath, ...commandTokens, "--help"]
          : [scriptPath, ...commandTokens, "--help"];
        const result = spawnSync(process.execPath, childArgs, { encoding: "utf8" });
        if (result.stdout) {
          process.stdout.write(result.stdout);
        }
        if (result.stderr) {
          process.stderr.write(result.stderr);
        }
        if (typeof result.status === "number" && result.status !== 0) {
          process.exit(result.status);
        }
        return;
      }
      cli.showHelp();
    }
  )
  .command(
    "urls [query]",
    "Return arXiv abstract and PDF URLs for a query or ID list",
    (y) =>
      y
        .positional("query", { type: "string", describe: "arXiv query string (or '-' for stdin)" })
        .option("ids", {
          type: "string",
          array: true,
          describe: "arXiv IDs (space- or comma-separated)"
        })
        .option("require-license", {
          type: "boolean",
          default: false,
          describe: "Filter out results missing license metadata"
        })
        .option("start", { type: "number", describe: "Result offset" })
        .option("max-results", { type: "number", describe: "Max results to return" })
        .option("page-size", { type: "number", describe: "API page size (<=2000)" })
        .option("sort-by", {
          type: "string",
          choices: ["relevance", "lastUpdatedDate", "submittedDate"],
          describe: "Sort field"
        })
        .option("sort-order", {
          type: "string",
          choices: ["ascending", "descending"],
          describe: "Sort order"
        }),
    async (args) => {
      const idsOptionRequested = rawArgvIncludesFlag("--ids");
      const idsArg = normalizeIdsArg(args.ids);
      const rawIds = idsOptionRequested && (!idsArg || idsArg.length === 0) ? ["-"] : idsArg;
      const hasIdsArg = Array.isArray(rawIds) && rawIds.length > 0;
      const ids = hasIdsArg ? await resolveIds(rawIds, args.input === false) : [];
      const hasIds = ids.length > 0;

      if (hasIds && typeof args.query === "string" && args.query.trim() && args.query.trim() !== "-") {
        throw new CliError("Choose either a search query or --ids, not both.", 2, "E_USAGE");
      }

      const query = hasIds ? "" : await resolveQuery(args.query, args.input === false);

      if (!hasIds && !query) {
        throw new CliError("Provide a search query or IDs via --ids.", 2);
      }

      validatePagingArgs(args);
      const { client } = await createClientContext(args);
      const result = hasIds
        ? await client.fetchByIds(ids, {
          start: args.start,
          maxResults: args.maxResults,
          pageSize: args.pageSize
        })
        : await client.search({
          searchQuery: query,
          start: args.start,
          maxResults: args.maxResults,
          pageSize: args.pageSize,
          sortBy: args.sortBy as ArxivSearchOptions["sortBy"],
          sortOrder: args.sortOrder as ArxivSearchOptions["sortOrder"]
        });

      const filtered = args.requireLicense ? filterByLicense(result.entries) : null;
      const entries = filtered ? filtered.allowed : result.entries;
      const urls = entries.map((entry) => ({
        id: entry.id,
        absUrl: entry.absUrl,
        pdfUrl: entry.pdfUrl
      }));

      await outputResult({
        args,
        schema: "arxiv.urls.v1",
        summary: filtered
          ? `Returned ${urls.length} URL(s); filtered ${filtered.missingIds.length} without license metadata`
          : `Returned ${urls.length} URL(s)`,
        json: {
          query,
          ids: hasIds ? ids : undefined,
          urls,
          missingLicenseIds: filtered?.missingIds
        },
        plain: urls
          .map((item) => [item.id, item.absUrl, item.pdfUrl].filter(Boolean).join("\t"))
          .join("\n"),
        human: urls
          .map((item) => `- ${item.id}\n  ${item.absUrl}\n  ${item.pdfUrl ?? ""}`.trimEnd())
          .join("\n"),
        quietText: urls.map((item) => item.pdfUrl ?? item.absUrl ?? "").join("\n"),
        status: filtered ? "warn" : "success",
        exitCode: filtered && filtered.missingIds.length > 0 ? 3 : 0,
        errors: filtered?.missingIds.length ? ["license_metadata_missing"] : []
      });
    }
  )
  .command(
    "categories",
    "Browse arXiv category taxonomy",
    (y) =>
      y
        .command(
          "list",
          "List categories",
          (yy) =>
            yy
              .option("group", { type: "string", describe: "Filter by group name" })
              .option("ids-only", { type: "boolean", default: false, describe: "Return only IDs" })
              .option("refresh", { type: "boolean", default: false, describe: "Refresh taxonomy" }),
          async (args) => {
            const taxonomy = await loadTaxonomy(args);
            const categories = filterByGroup(taxonomy.categories, args.group);

            await outputResult({
              args,
              schema: "arxiv.categories.list.v1",
              summary: `Returned ${categories.length} category(ies)`,
              json: { categories, sourceUrl: taxonomy.sourceUrl },
              plain: args.idsOnly
                ? categories.map((c) => c.id).join("\n")
                : formatCategoryList(categories),
              human: formatCategoryList(categories),
              quietText: args.idsOnly ? categories.map((c) => c.id).join("\n") : ""
            });
          }
        )
        .command(
          "tree",
          "Show categories grouped by top-level group",
          (yy) => yy.option("refresh", { type: "boolean", default: false, describe: "Refresh taxonomy" }),
          async (args) => {
            const taxonomy = await loadTaxonomy(args);
            await outputResult({
              args,
              schema: "arxiv.categories.tree.v1",
              summary: `Returned ${taxonomy.categories.length} category(ies)`,
              json: taxonomy,
              plain: formatCategoryList(taxonomy.categories),
              human: formatCategoryTree(taxonomy),
              quietText: ""
            });
          }
        )
        .command(
          "search <term>",
          "Search categories by name, id, or description",
          (yy) =>
            yy
              .positional("term", { type: "string", describe: "Search term" })
              .option("group", { type: "string", describe: "Filter by group name" })
              .option("refresh", { type: "boolean", default: false, describe: "Refresh taxonomy" }),
          async (args) => {
            const taxonomy = await loadTaxonomy(args);
            const term = String(args.term ?? "").trim();
            if (!term) {
              throw new CliError("Provide a search term.", 2);
            }

            const filtered = filterByGroup(taxonomy.categories, args.group);
            const matches = filtered.filter((category) =>
              categoryMatches(category, term)
            );

            await outputResult({
              args,
              schema: "arxiv.categories.search.v1",
              summary: `Matched ${matches.length} category(ies)`,
              json: { categories: matches, sourceUrl: taxonomy.sourceUrl },
              plain: formatCategoryList(matches),
              human: formatCategoryList(matches),
              quietText: ""
            });
          }
        )
        .command(
          "show <id>",
          "Show details for a category",
          (yy) =>
            yy
              .positional("id", { type: "string", describe: "Category id" })
              .option("refresh", { type: "boolean", default: false, describe: "Refresh taxonomy" }),
          async (args) => {
            const taxonomy = await loadTaxonomy(args);
            const id = String(args.id ?? "").trim();
            if (!id) {
              throw new CliError("Provide a category id.", 2);
            }

            const category = taxonomy.categories.find(
              (item) => item.id.toLowerCase() === id.toLowerCase()
            );

            if (!category) {
              throw new CliError(`Category not found: ${id}`, 1);
            }

            await outputResult({
              args,
              schema: "arxiv.categories.show.v1",
              summary: `Category ${category.id}`,
              json: { category, sourceUrl: taxonomy.sourceUrl },
              plain: formatCategoryDetail(category),
              human: formatCategoryDetail(category),
              quietText: ""
            });
          }
        )
        .demandCommand(1, "Provide a subcommand. Use --help for options.")
  )
  .demandCommand(1, "Provide a command. Use --help for options.")
  .strict();

const splitIdTokens = (values: string[]): string[] =>
  values
    .flatMap((value) => value.split(/[\s,]+/))
    .map((value) => value.trim())
    .filter(Boolean);

const normalizeIdsArg = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (typeof value === "string" && value.trim()) {
    return [value];
  }
  return undefined;
};

const resolveIds = async (ids: string[] | undefined, noInput?: boolean): Promise<string[]> => {
  const provided = splitIdTokens((ids ?? []).filter(Boolean));
  const wantsStdin = provided.length === 0 || provided.includes("-");

  if (!wantsStdin) {
    return provided;
  }

  if (noInput) {
    throw new CliError("Provide arXiv IDs; stdin disabled by --no-input.", 2, "E_USAGE");
  }
  if (process.stdin.isTTY) {
    throw new CliError("Provide arXiv IDs or pipe them via stdin.", 2, "E_USAGE");
  }

  const lines = await readLines();
  const fromStdin = splitIdTokens(lines);
  return provided.filter((id) => id !== "-").concat(fromStdin);
};

const rawArgvIncludesFlag = (flag: string): boolean =>
  process.argv.some((arg) => arg === flag || arg.startsWith(`${flag}=`));

const rawArgvValue = (flag: string): string | undefined => {
  for (let index = 0; index < process.argv.length; index += 1) {
    const current = process.argv[index];
    if (!current) continue;
    if (current === flag) {
      return process.argv[index + 1];
    }
    if (current.startsWith(`${flag}=`)) {
      return current.slice(flag.length + 1);
    }
  }
  return undefined;
};

const rawArgvValueAfterToken = (flag: string): string | undefined => {
  for (let index = 0; index < process.argv.length; index += 1) {
    const current = process.argv[index];
    if (current === flag) {
      return process.argv[index + 1];
    }
  }
  return undefined;
};

const resolveQuery = async (query: string | undefined, noInput?: boolean): Promise<string> => {
  if (!query || query === "-") {
    if (noInput) {
      throw new CliError("Provide a query string; stdin disabled by --no-input.", 2, "E_USAGE");
    }
    if (process.stdin.isTTY) {
      throw new CliError("Provide a query string or pipe it via stdin.", 2, "E_USAGE");
    }
    const input = await readStdin();
    return input.trim();
  }
  return query.trim();
};

const validatePagingArgs = (args: { pageSize?: number; maxResults?: number; start?: number }) => {
  const pageSize = coercePositiveInt("page-size")(args.pageSize);
  const maxResults = coercePositiveInt("max-results")(args.maxResults);
  coerceNonNegativeInt("start")(args.start);

  if (typeof pageSize === "number" && pageSize > MAX_PAGE_SIZE) {
    throw new CliError(`page-size cannot exceed ${MAX_PAGE_SIZE}.`, 2, "E_VALIDATION");
  }
  if (typeof maxResults === "number" && maxResults > MAX_TOTAL_RESULTS) {
    throw new CliError(`max-results cannot exceed ${MAX_TOTAL_RESULTS}.`, 2, "E_VALIDATION");
  }
};

const loadTaxonomy = async (args: any): Promise<TaxonomyResult> => {
  const { client } = await createClientContext(args);
  const config = client.getConfig();
  return fetchTaxonomy(
    {
      userAgent: config.userAgent,
      timeoutMs: config.timeoutMs,
      minIntervalMs: config.minIntervalMs
    },
    { refresh: args.refresh }
  );
};

const normalizeArxivId = (id: string): string =>
  id
    .trim()
    .replace(/^arxiv:/i, "")
    .replace(/^https?:\/\/(?:www\.)?arxiv\.org\/(?:abs|pdf)\//i, "")
    .replace(/[?#].*$/, "")
    .replace(/\.pdf$/i, "")
    .replace(/\/+$/, "")
    .replace(/^\/+/, "")
    .replace(/\s+/g, "");

const toSafeFileStem = (id: string): string => {
  const stem = normalizeArxivId(id).replace(/[^A-Za-z0-9._-]/g, "_");
  return stem || "paper";
};

const normalizeArxivBaseId = (id: string): string =>
  normalizeArxivId(id).replace(/v\d+$/i, "");

type EntryLookup = {
  byId: Map<string, ArxivEntry>;
  byBaseId: Map<string, ArxivEntry>;
};

const createEntryLookup = (entries: ArxivEntry[]): EntryLookup => {
  const byId = new Map<string, ArxivEntry>();
  const byBaseId = new Map<string, ArxivEntry>();
  for (const entry of entries) {
    const normalizedId = normalizeArxivId(entry.id);
    const baseId = normalizeArxivBaseId(entry.id);
    if (!byId.has(normalizedId)) {
      byId.set(normalizedId, entry);
    }
    if (!byBaseId.has(baseId)) {
      byBaseId.set(baseId, entry);
    }
  }
  return { byId, byBaseId };
};

const resolveEntry = (rawId: string, lookup: EntryLookup): ArxivEntry | undefined => {
  const normalizedId = normalizeArxivId(rawId);
  return lookup.byId.get(normalizedId) ?? lookup.byBaseId.get(normalizeArxivBaseId(rawId));
};

const filterIdsByLicense = (
  ids: string[],
  lookup: EntryLookup
) => {
  const failed: { id: string; path: string; status: string; error?: string }[] = [];
  const allowed: string[] = [];
  for (const rawId of ids) {
    const normalizedId = normalizeArxivId(rawId);
    const entry = resolveEntry(rawId, lookup);
    if (!entry || !hasLicenseMetadata(entry)) {
      failed.push({
        id: normalizedId,
        path: "",
        status: "failed",
        error: "License metadata missing"
      });
      continue;
    }
    allowed.push(rawId);
  }
  return { allowed, failed };
};

const downloadAsTextFormats = async ({
  client,
  ids,
  outputDir,
  overwrite,
  entryLookup,
  format,
  keepPdf
}: {
  client: ArxivClient;
  ids: string[];
  outputDir: string;
  overwrite: boolean;
  entryLookup: EntryLookup;
  format: "md" | "json";
  keepPdf: boolean;
}): Promise<{ id: string; path: string; status: string; error?: string }[]> => {
  const results: { id: string; path: string; status: string; error?: string }[] = [];
  for (const rawId of ids) {
    const normalizedId = normalizeArxivId(rawId);
    const fileStem = toSafeFileStem(rawId);
    const entry = resolveEntry(rawId, entryLookup);
    if (!entry) {
      results.push({ id: normalizedId, path: "", status: "failed", error: "Metadata not found" });
      continue;
    }

    const filename = `${fileStem}.${format}`;
    const outputPath = resolve(outputDir, filename);
    const pdfPath = resolve(outputDir, `${fileStem}.pdf`);
    try {
      const exists = await fileExists(outputPath);
      if (exists && !overwrite) {
        if (keepPdf) {
          const pdfExists = await fileExists(pdfPath);
          if (!pdfExists) {
            const pdfBuffer = await client.downloadPdfBuffer(entry.id);
            await mkdir(dirname(pdfPath), { recursive: true });
            await writeFile(pdfPath, pdfBuffer);
          }
        }
        results.push({ id: normalizedId, path: outputPath, status: "skipped" });
        continue;
      }

      const pdfBuffer = await client.downloadPdfBuffer(entry.id);
      const pdfBufferForWrite = keepPdf ? Uint8Array.from(pdfBuffer) : undefined;

      const text = await extractPdfText(pdfBuffer);

      const payload = format === "md"
        ? renderMarkdown(entry, text)
        : JSON.stringify({ metadata: entry, text }, null, 2);

      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, payload, "utf8");

      if (keepPdf && pdfBufferForWrite) {
        const pdfExists = await fileExists(pdfPath);
        if (!pdfExists || overwrite) {
          await writeFile(pdfPath, pdfBufferForWrite);
        }
      }

      results.push({ id: normalizedId, path: outputPath, status: "downloaded" });
    } catch (error) {
      results.push({
        id: normalizedId,
        path: outputPath,
        status: "failed",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  return results;
};

const renderMarkdown = (entry: any, text: string): string => {
  const lines = [
    `# ${entry.title ?? "Untitled"}`,
    "",
    `**arXiv ID:** ${entry.id}`,
    entry.authors?.length ? `**Authors:** ${entry.authors.join(", ")}` : "",
    entry.published ? `**Published:** ${entry.published}` : "",
    entry.updated ? `**Updated:** ${entry.updated}` : "",
    entry.primaryCategory ? `**Primary category:** ${entry.primaryCategory}` : "",
    entry.categories?.length ? `**Categories:** ${entry.categories.join(", ")}` : "",
    entry.absUrl ? `**Abstract URL:** ${entry.absUrl}` : "",
    entry.pdfUrl ? `**PDF URL:** ${entry.pdfUrl}` : "",
    entry.licenseUrl ? `**License:** ${entry.licenseUrl}` : (entry.license ? `**License:** ${entry.license}` : ""),
    "",
    "## Abstract",
    entry.summary ?? "",
    "",
    "## Full Text",
    text.trim()
  ];
  return lines.filter((line) => line !== "").join("\n");
};

const filterByGroup = (categories: TaxonomyCategory[], group?: string) => {
  if (!group) return categories;
  const normalized = group.toLowerCase();
  return categories.filter((category) => category.group.toLowerCase().includes(normalized));
};

const categoryMatches = (category: TaxonomyCategory, term: string) => {
  const value = term.toLowerCase();
  return (
    category.id.toLowerCase().includes(value)
    || category.name.toLowerCase().includes(value)
    || (category.description ?? "").toLowerCase().includes(value)
  );
};

const formatCategoryList = (categories: TaxonomyCategory[]): string =>
  categories
    .map((category) => `${category.id}\t${category.name}\t${category.group}`)
    .join("\n");

const formatCategoryDetail = (category: TaxonomyCategory): string => {
  const lines = [
    `ID: ${category.id}`,
    `Name: ${category.name}`,
    `Group: ${category.group}`
  ];
  if (category.description) {
    lines.push(`Description: ${category.description}`);
  }
  return lines.join("\n");
};

const formatCategoryTree = (taxonomy: TaxonomyResult): string => {
  const lines: string[] = [];
  for (const group of taxonomy.groups) {
    lines.push(group.name);
    for (const category of group.categories) {
      lines.push(`  - ${category.id} ${category.name}`);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
};

const fileExists = async (path: string): Promise<boolean> => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const mergeDefined = <T extends Record<string, unknown>>(
  ...sources: Partial<T>[]
): Partial<T> => {
  const merged: Partial<T> = {};
  for (const source of sources) {
    for (const [key, value] of Object.entries(source)) {
      if (value !== undefined) {
        (merged as Record<string, unknown>)[key] = value;
      }
    }
  }
  return merged;
};

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized || undefined;
};

const expandHomePath = (path: string): string => {
  if (path === "~") {
    return homedir();
  }
  if (path.startsWith("~/")) {
    return resolve(homedir(), path.slice(2));
  }
  return path;
};

const normalizeOptionalUrl = (value: unknown, label: string): string | undefined => {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return undefined;
  }
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("invalid_scheme");
    }
    return normalized;
  } catch {
    throw new CliError(`Invalid ${label} (expected http(s) URL): ${String(value)}`, 2, "E_VALIDATION");
  }
};

const resolveFlagConfig = (args: any) => ({
  apiBaseUrl: args.apiBaseUrl,
  pdfBaseUrl: args.pdfBaseUrl,
  userAgent: args.userAgent,
  timeoutMs: coercePositiveInt("timeout")(args.timeout),
  minIntervalMs: coercePositiveInt("rate-limit")(args.rateLimit),
  maxRetries: args.retry === false ? 0 : coerceNonNegativeInt("max-retries")(args.maxRetries),
  retryBaseDelayMs: coerceNonNegativeInt("retry-base-delay")(args.retryBaseDelay),
  cache: args.noCache ? false : undefined,
  cacheDir: args.cacheDir,
  cacheTtlMs: coercePositiveInt("cache-ttl")(args.cacheTtl),
  pageSize: coercePositiveInt("page-size")(args.pageSize),
  debug: args.debug ? true : undefined,
  defaultDownloadDir: args.outDir
});

const createClientContext = async (args: any) => {
  const { config, configPaths } = await loadConfig(process.cwd(), args.config);
  const env = envConfig();
  const flags = resolveFlagConfig(args);

  const merged = mergeDefined(config, env, flags);

  const contact = args.contact ?? process.env.RSEARCH_CONTACT_EMAIL;
  const userAgent = resolveUserAgent(normalizeOptionalString(merged.userAgent), contact);
  const apiBaseUrl = normalizeOptionalUrl(merged.apiBaseUrl, "api-base-url");
  const pdfBaseUrl = normalizeOptionalUrl(merged.pdfBaseUrl, "pdf-base-url");
  const cacheDirRaw = normalizeOptionalString(merged.cacheDir);
  const defaultDownloadDirRaw = normalizeOptionalString(merged.defaultDownloadDir);
  const cacheDir = cacheDirRaw ? expandHomePath(cacheDirRaw) : undefined;
  const defaultDownloadDir = defaultDownloadDirRaw ? expandHomePath(defaultDownloadDirRaw) : undefined;

  const clientConfig: Record<string, unknown> = {
    userAgent
  };

  if (apiBaseUrl) clientConfig.apiBaseUrl = apiBaseUrl;
  if (pdfBaseUrl) clientConfig.pdfBaseUrl = pdfBaseUrl;
  if (typeof merged.timeoutMs === "number") clientConfig.timeoutMs = merged.timeoutMs;
  if (typeof merged.minIntervalMs === "number") clientConfig.minIntervalMs = merged.minIntervalMs;
  if (typeof merged.maxRetries === "number") clientConfig.maxRetries = merged.maxRetries;
  if (typeof merged.retryBaseDelayMs === "number") clientConfig.retryBaseDelayMs = merged.retryBaseDelayMs;
  if (typeof merged.cache === "boolean") clientConfig.cache = merged.cache;
  if (cacheDir) clientConfig.cacheDir = cacheDir;
  if (typeof merged.cacheTtlMs === "number") clientConfig.cacheTtlMs = merged.cacheTtlMs;
  if (typeof merged.pageSize === "number") clientConfig.pageSize = merged.pageSize;
  if (typeof merged.debug === "boolean") clientConfig.debug = merged.debug;

  return {
    client: new ArxivClient(clientConfig as any),
    defaultDownloadDir,
    configPaths
  };
};

const resolveUserAgent = (userAgent: string | undefined, contact?: string) => {
  const trimmedUserAgent = typeof userAgent === "string" ? userAgent.trim() : "";
  if (trimmedUserAgent) return trimmedUserAgent;
  if (!contact) return `rsearch/${VERSION}`;
  const trimmedContact = contact.trim();
  if (!trimmedContact) return `rsearch/${VERSION}`;
  const contactValue = trimmedContact.toLowerCase().startsWith("mailto:")
    ? trimmedContact
    : trimmedContact.includes("@")
      ? `mailto:${trimmedContact}`
      : trimmedContact;
  return `rsearch/${VERSION} (${contactValue})`;
};

const outputResult = async ({
  args,
  schema,
  summary,
  json,
  plain,
  human,
  quietText,
  status = "success",
  exitCode = 0,
  errors = []
}: {
  args: any;
  schema: string;
  summary: string;
  json: unknown;
  plain: string;
  human: string;
  quietText: string;
  status?: "success" | "warn" | "error";
  exitCode?: number;
  errors?: string[];
}) => {
  const colorMode = resolveColorMode(args);
  if (colorMode === "never") {
    process.env.NO_COLOR = "1";
  }
  if (colorMode === "always") {
    delete process.env.NO_COLOR;
  }

  if (args.json) {
    const envelope = createEnvelope(schema, json, summary, status, errors);
    process.stdout.write(JSON.stringify(envelope, null, 2));
    if (exitCode) process.exitCode = exitCode;
    return;
  }

  if (args.plain) {
    process.stdout.write(`${plain}\n`);
    if (exitCode) process.exitCode = exitCode;
    return;
  }

  if (args.quiet) {
    if (quietText) {
      process.stdout.write(`${quietText}\n`);
    }
    if (exitCode) process.exitCode = exitCode;
    return;
  }

  process.stdout.write(`${human}\n`);
  if (exitCode) process.exitCode = exitCode;
};

const resolveColorMode = (args: any): "auto" | "always" | "never" => {
  if (args.noColor) return "never";
  const mode = String(args.color ?? "auto");
  if (mode === "always") return "always";
  if (mode === "never") return "never";
  if (process.env.NO_COLOR || process.env.TERM === "dumb") return "never";
  if (!process.stdout.isTTY) return "never";
  return "auto";
};

const isJsonRequested = (args?: any): boolean => {
  if (args && typeof args === "object" && "json" in args && args.json === true) {
    return true;
  }
  return process.argv.includes("--json");
};

const errorCodeForExitCode = (exitCode: number): string => {
  switch (exitCode) {
    case 2:
      return "E_USAGE";
    case 3:
      return "E_POLICY";
    case 4:
      return "E_PARTIAL";
    default:
      return "E_INTERNAL";
  }
};

const resolveErrorCode = (error: unknown, exitCode: number): string => {
  if (error instanceof CliError && error.code) {
    return error.code;
  }
  return errorCodeForExitCode(exitCode);
};

const emitJsonError = (message: string, exitCode: number, code: string) => {
  const envelope = createEnvelope(
    "arxiv.error.v1",
    { error: { code, message }, exitCode },
    message,
    "error",
    [code]
  );
  process.stdout.write(JSON.stringify(envelope, null, 2));
  process.exit(exitCode);
};

const emitError = (error: unknown, jsonRequested: boolean) => {
  const message = error instanceof CliError ? error.message : error instanceof Error ? error.message : String(error);
  const exitCode = error instanceof CliError ? error.exitCode : 1;
  const code = resolveErrorCode(error, exitCode);

  if (jsonRequested) {
    emitJsonError(message, exitCode, code);
    return;
  }

  process.stderr.write(`Error: ${message}\n`);
  process.exit(exitCode);
};

process.on("unhandledRejection", (error) => {
  handleFatal(error);
});

process.on("uncaughtException", (error) => {
  handleFatal(error);
});

const handleFatal = (error: unknown) => {
  const jsonRequested = isJsonRequested();
  emitError(error, jsonRequested);
};

void cli.parseAsync().catch((error) => {
  handleFatal(error);
});
