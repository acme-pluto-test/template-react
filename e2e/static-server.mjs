// Serves out/ (the static export) on 127.0.0.1 for the browser tests. No dependency, no directory listing.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";

const root = resolve(process.argv[2] ?? "out");
const port = Number(process.argv[3] ?? 4173);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".txt": "text/plain", ".ico": "image/x-icon", ".woff2": "font/woff2" };

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  let path;
  try {
    path = normalize(decodeURIComponent(url.pathname));
  } catch {
    res.writeHead(400).end("bad request"); // a malformed escape must not stop the server
    return;
  }
  if (path.endsWith("/")) path += "index.html";
  const file = join(root, path);
  if (file !== root && !file.startsWith(root + sep)) {
    res.writeHead(403).end("forbidden");
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
}).listen(port, "127.0.0.1");
