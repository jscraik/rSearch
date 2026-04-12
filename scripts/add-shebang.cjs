const fs = require("node:fs");
const path = require("node:path");

const target = path.join(__dirname, "..", "dist", "cli.js");
const shebang = "#!/usr/bin/env node\n";

try {
  // Use open + read to avoid TOCTOU between stat/exists and actual read
  const fd = fs.openSync(target, "r+");
  try {
    const buf = Buffer.alloc(shebang.length);
    const bytesRead = fs.readSync(fd, buf, 0, shebang.length, 0);
    const header = buf.toString("utf8", 0, bytesRead);
    if (!header.startsWith(shebang)) {
      // Read the rest of the file via fd, prepend shebang, write back via fd
      const stats = fs.fstatSync(fd);
      const fileContent = Buffer.alloc(stats.size);
      fs.readSync(fd, fileContent, 0, stats.size, 0);
      const rest = fileContent.toString("utf8");
      const newContent = shebang + rest;
      const newBuffer = Buffer.from(newContent, "utf8");
      fs.ftruncateSync(fd, 0);
      fs.writeSync(fd, newBuffer, 0, newBuffer.length, 0);
    }
  } finally {
    fs.closeSync(fd);
  }
} catch (err) {
  // Only skip if the file doesn't exist yet (normal for clean builds).
  // Re-throw permission, disk-full, and other real errors.
  if (err.code !== "ENOENT") {
    throw err;
  }
}