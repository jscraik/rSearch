import { describe, expect, it } from "vitest";
import { VERSION } from "../src/version.js";
import pkg from "../package.json" with { type: "json" };

describe("version", () => {
  it("matches package.json version", () => {
    expect(VERSION).toBe(pkg.version);
  });
});
