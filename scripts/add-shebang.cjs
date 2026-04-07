const fs = require("node:fs");
const path = require("node:path");

const target = path.join(__dirname, "..", "dist", "cli.js");
const shebang = "#!/usr/bin/env node\n";

try {
  const contents = fs.readFileSync(target, "utf8");
  if (!contents.startsWith(shebang)) {
    fs.writeFileSync(target, shebang + contents, "utf8");
  }
} catch (err) {
  // Only skip if the file doesn't exist yet (normal for clean builds).
  // Re-throw permission, disk-full, and other real errors.
  if (err.code !== "ENOENT") {
    throw err;
  }
}
