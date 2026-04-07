const fs = require("node:fs");
const path = require("node:path");

const target = path.join(__dirname, "..", "dist", "cli.js");
const shebang = "#!/usr/bin/env node\n";

try {
  const contents = fs.readFileSync(target, "utf8");
  if (!contents.startsWith(shebang)) {
    fs.writeFileSync(target, shebang + contents, "utf8");
  }
} catch {
  // File doesn't exist yet — skip silently
}
