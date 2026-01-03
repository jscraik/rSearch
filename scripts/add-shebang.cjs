const fs = require("node:fs");
const path = require("node:path");

const target = path.join(__dirname, "..", "dist", "cli.js");
const shebang = "#!/usr/bin/env node\n";

if (!fs.existsSync(target)) {
  process.exit(0);
}

const contents = fs.readFileSync(target, "utf8");
if (!contents.startsWith(shebang)) {
  fs.writeFileSync(target, shebang + contents, "utf8");
}
