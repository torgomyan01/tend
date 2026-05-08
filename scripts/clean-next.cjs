"use strict";

const fs = require("fs");
const path = require("path");

const target = path.join(process.cwd(), ".next");
const cache = path.join(process.cwd(), "node_modules", ".cache");

function rmIfExists(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    process.stderr.write(`Removed ${dir}\n`);
  }
}

rmIfExists(target);
rmIfExists(cache);
