import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getDesignContext, rootDir } from "./lib/design-context.mjs";

const designContext = getDesignContext(process.argv[2]);
const previewRoot = process.env.PREVIEW_ROOT || designContext.previewDir;
const port = Number(process.env.PREVIEW_PORT || 4173);

const server = http.createServer(async (request, response) => {
  try {
    const requestPath = request.url === "/" ? "/index.html" : `${request.url?.replace(/\/$/, "")}/index.html`;
    const previewPath = path.join(previewRoot, requestPath);
    const html = await readFile(previewPath, "utf8");
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(html);
  } catch (error) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end(String(error));
  }
});

server.listen(port, () => {
  console.log(`Preview server running at http://127.0.0.1:${port} using ${path.relative(rootDir, previewRoot)}`);
});
