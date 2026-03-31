import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { createServer } from "http";
import { launch } from "puppeteer";

const DIST = resolve(import.meta.dirname, "../dist");
const PORT = 4173;
const CONCURRENCY = 6;

function parseRoutesFromSitemap(): string[] {
  const sitemapPath = resolve(DIST, "sitemap.xml");
  if (!existsSync(sitemapPath)) {
    console.error("sitemap.xml not found in dist/. Run the build first.");
    process.exit(1);
  }
  const xml = readFileSync(sitemapPath, "utf-8");
  const routes: string[] = [];
  for (const match of xml.matchAll(/<loc>https:\/\/poneglyph\.one(\/[^<]*)<\/loc>/g)) {
    routes.push(match[1]);
  }
  // Also include the root
  if (xml.includes("<loc>https://poneglyph.one/</loc>")) {
    routes.unshift("/");
  }
  return [...new Set(routes)];
}

function startStaticServer(): Promise<ReturnType<typeof createServer>> {
  return new Promise((res) => {
    const server = createServer((req, reply) => {
      const url = req.url || "/";
      // Try exact file, then index.html in dir, then fallback to /index.html (SPA)
      const candidates = [
        resolve(DIST, url.slice(1)),
        resolve(DIST, url.slice(1), "index.html"),
        resolve(DIST, "index.html"),
      ];

      for (const filePath of candidates) {
        if (existsSync(filePath) && !filePath.endsWith(DIST)) {
          try {
            const content = readFileSync(filePath);
            const ext = filePath.split(".").pop() || "";
            const contentTypes: Record<string, string> = {
              html: "text/html",
              js: "application/javascript",
              css: "text/css",
              svg: "image/svg+xml",
              png: "image/png",
              json: "application/json",
              txt: "text/plain",
              xml: "application/xml",
            };
            reply.writeHead(200, { "Content-Type": contentTypes[ext] || "application/octet-stream" });
            reply.end(content);
            return;
          } catch {
            continue;
          }
        }
      }

      // SPA fallback
      const fallback = readFileSync(resolve(DIST, "index.html"));
      reply.writeHead(200, { "Content-Type": "text/html" });
      reply.end(fallback);
    });

    server.listen(PORT, () => res(server));
  });
}

async function renderRoute(browser: Awaited<ReturnType<typeof launch>>, route: string): Promise<void> {
  const page = await browser.newPage();
  // Block images/fonts/media to speed up rendering
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const type = req.resourceType();
    if (["image", "font", "media"].includes(type)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  try {
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: "networkidle0", timeout: 15000 });

    // Wait a bit for React to settle
    await page.evaluate(() => new Promise((r) => setTimeout(r, 200)));

    const html = await page.content();

    // Write to dist at the correct path
    const outPath = route === "/"
      ? resolve(DIST, "index.html")
      : resolve(DIST, route.slice(1), "index.html");

    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, html, "utf-8");
  } catch (err) {
    console.warn(`  Failed: ${route} — ${(err as Error).message}`);
  } finally {
    await page.close();
  }
}

async function processInBatches(
  browser: Awaited<ReturnType<typeof launch>>,
  routes: string[],
) {
  let completed = 0;
  const total = routes.length;
  const queue = [...routes];

  async function worker() {
    while (queue.length > 0) {
      const route = queue.shift()!;
      await renderRoute(browser, route);
      completed++;
      if (completed % 50 === 0 || completed === total) {
        console.log(`  ${completed}/${total} pages rendered`);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);
}

async function main() {
  const routes = parseRoutesFromSitemap();
  console.log(`Prerendering ${routes.length} pages (${CONCURRENCY} concurrent)...`);

  const server = await startStaticServer();
  const browser = await launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });

  try {
    await processInBatches(browser, routes);
    console.log("Prerendering complete.");
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
