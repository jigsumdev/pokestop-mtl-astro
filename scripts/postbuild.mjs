import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIST = "dist";

function injectModulePreloads() {
  const scriptPattern = /<script\s+type="module"\s+src="([^"]+)"><\/script>/g;

  function processDir(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== "_astro") {
        processDir(full);
      } else if (entry.isFile() && entry.name.endsWith(".html")) {
        let html = readFileSync(full, "utf8");
        const srcs = [];
        for (const m of html.matchAll(scriptPattern)) {
          srcs.push(m[1]);
        }
        if (srcs.length === 0) continue;

        const hints = srcs
          .map((s) => `<link rel="modulepreload" href="${s}">`)
          .join("");
        html = html.replace("</head>", `${hints}</head>`);
        writeFileSync(full, html, "utf8");
      }
    }
  }

  processDir(DIST);
}

injectModulePreloads();

// Optional preview behavior: if running in a Pages preview branch, add noindex headers
// for robots/llms endpoints by appending to dist/_headers if it exists.
const headersPath = join(DIST, "_headers");
const isPreview =
  process.env.CF_PAGES === "1" &&
  process.env.CF_PAGES_BRANCH &&
  process.env.CF_PAGES_BRANCH !== "main";

if (isPreview && existsSync(headersPath)) {
  const previewRobotsHeader =
    "\n/robots.txt\n  X-Robots-Tag: noindex, nofollow, noarchive, nosnippet\n\n/llms.txt\n  X-Robots-Tag: noindex, nofollow, noarchive, nosnippet\n";

  const currentHeaders = readFileSync(headersPath, "utf8").trimEnd();
  writeFileSync(headersPath, `${currentHeaders}${previewRobotsHeader}`, "utf8");
}

