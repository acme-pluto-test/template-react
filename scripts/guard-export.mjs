// Runs before `next build`: a static export has no server, so a route handler or a middleware cannot be deployed.
// Next may still build a GET route handler as a static file; this guard refuses it so the rule is one rule.
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const found = [];
function walk(dir, inApp) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "out") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, inApp || name === "app");
    else if (inApp && /^route\.(ts|tsx|js|jsx|mjs|cjs)$/.test(name)) found.push(`${path}: a route handler needs a server`);
  }
}
for (const root of ["src", "app"]) {
  try {
    walk(root, root === "app"); // a root-level app/ folder is the app directory itself
  } catch {
    // the folder does not exist
  }
}
for (const file of ["middleware.ts", "middleware.js", "proxy.ts", "proxy.js", "src/middleware.ts", "src/middleware.js", "src/proxy.ts", "src/proxy.js"]) {
  try {
    statSync(file);
    found.push(`${file}: a middleware needs a server`);
  } catch {
    // not there
  }
}
if (found.length > 0) {
  console.error(`Static export (output: "export") cannot hold:\n${found.join("\n")}`);
  process.exit(1);
}
