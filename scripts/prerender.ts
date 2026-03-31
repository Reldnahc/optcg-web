import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { createServer } from "http";
import { launch } from "puppeteer";

const DIST = resolve(import.meta.dirname, "../dist");
const SHOULD_SKIP_PRERENDER = process.env.CI !== "true" && process.env.PRERENDER_LOCAL !== "1";
const CURRENT_MANIFEST_PATH = resolve(DIST, "_meta/prerender-manifest.json");
const PREVIOUS_MANIFEST_PATH = process.env.PREVIOUS_PRERENDER_MANIFEST_FILE
  ? resolve(process.cwd(), process.env.PREVIOUS_PRERENDER_MANIFEST_FILE)
  : "";
const PREVIOUS_DIST_DIR = process.env.PREVIOUS_PRERENDER_DIST_DIR
  ? resolve(process.cwd(), process.env.PREVIOUS_PRERENDER_DIST_DIR)
  : "";
const PORT = Number(process.env.PRERENDER_PORT || 4173);
const CONCURRENCY = Number(process.env.PRERENDER_CONCURRENCY || 6);

type RenderGroup =
  | "static"
  | "cards"
  | "sets_index"
  | "set_detail"
  | "formats_index"
  | "format_detail"
  | "don"
  | "scan_progress";

interface RouteManifestEntry {
  route: string;
  render_group: RenderGroup;
  data_hash: string;
}

interface PrerenderManifest {
  version: 1;
  generated_at: string;
  render_group_hashes: Record<RenderGroup, string>;
  routes: RouteManifestEntry[];
}

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
  if (xml.includes("<loc>https://poneglyph.one/</loc>")) {
    routes.unshift("/");
  }
  return [...new Set(routes)];
}

function normalizeRoute(route: string): string {
  const trimmed = route.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function parseListInput(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((value) => String(value).trim()).filter(Boolean);
      }
    } catch {
      // Fall through.
    }
  }

  return trimmed
    .split(/[\r\n,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function readOptionalList(envValue: string | undefined, envFile: string | undefined): string[] {
  if (envValue?.trim()) {
    return parseListInput(envValue);
  }

  if (envFile?.trim()) {
    const filePath = resolve(process.cwd(), envFile);
    if (!existsSync(filePath)) {
      throw new Error(`List file not found: ${filePath}`);
    }
    return parseListInput(readFileSync(filePath, "utf-8"));
  }

  return [];
}

function loadManifest(filePath: string): PrerenderManifest | null {
  if (!filePath || !existsSync(filePath)) {
    return null;
  }

  return JSON.parse(readFileSync(filePath, "utf-8")) as PrerenderManifest;
}

function routeToDistPath(route: string, root: string): string {
  return route === "/"
    ? resolve(root, "index.html")
    : resolve(root, route.slice(1), "index.html");
}

function ensureParentDir(filePath: string) {
  mkdirSync(dirname(filePath), { recursive: true });
}

function copyForwardUnchangedRoutes(routes: string[] = []) {
  if (!PREVIOUS_DIST_DIR || !existsSync(PREVIOUS_DIST_DIR)) {
    return;
  }

  for (const route of routes) {
    const sourcePath = routeToDistPath(route, PREVIOUS_DIST_DIR);
    const targetPath = routeToDistPath(route, DIST);

    if (!existsSync(sourcePath)) {
      continue;
    }

    ensureParentDir(targetPath);
    copyFileSync(sourcePath, targetPath);
  }
}

function computeChangedRoutes(current: PrerenderManifest, previous: PrerenderManifest): { changed: string[]; unchanged: string[] } {
  const previousRoutes = new Map(previous.routes.map((entry) => [entry.route, entry]));
  const changed: string[] = [];
  const unchanged: string[] = [];

  for (const entry of current.routes) {
    const previousEntry = previousRoutes.get(entry.route);
    if (!previousEntry) {
      changed.push(entry.route);
      continue;
    }

    const currentRenderHash = current.render_group_hashes[entry.render_group];
    const previousRenderHash = previous.render_group_hashes[previousEntry.render_group];

    if (entry.render_group !== previousEntry.render_group || currentRenderHash !== previousRenderHash || entry.data_hash !== previousEntry.data_hash) {
      changed.push(entry.route);
    } else {
      unchanged.push(entry.route);
    }
  }

  return { changed, unchanged };
}

function selectRoutes(allRoutes: string[]): { changedRoutes: string[]; unchangedRoutes: string[] } {
  const explicitRoutes = readOptionalList(process.env.PRERENDER_ROUTES, process.env.PRERENDER_ROUTES_FILE)
    .map(normalizeRoute)
    .filter(Boolean);

  if (explicitRoutes.length > 0) {
    console.log(`Using explicit prerender route list (${explicitRoutes.length} routes).`);
    return { changedRoutes: [...new Set(explicitRoutes)], unchangedRoutes: [] };
  }

  const changedCards = readOptionalList(process.env.PRERENDER_CHANGED_CARDS, process.env.PRERENDER_CHANGED_CARDS_FILE)
    .map((value) => value.replace(/^\/cards\//, "").trim().toUpperCase())
    .filter(Boolean);

  if (changedCards.length > 0) {
    if (!PREVIOUS_DIST_DIR || !existsSync(PREVIOUS_DIST_DIR)) {
      console.log("Changed-card mode requested without previous dist snapshot; falling back to full prerender.");
      return { changedRoutes: allRoutes, unchangedRoutes: [] };
    }

    const changedCardRoutes = changedCards.map((cardNumber) => `/cards/${encodeURIComponent(cardNumber)}`);
    const unchangedRoutes = allRoutes.filter((route) => !changedCardRoutes.includes(route));
    console.log(`Using changed-card prerender mode (${changedCards.length} cards + ${unchangedRoutes.length} reused routes).`);
    return { changedRoutes: [...new Set(changedCardRoutes)], unchangedRoutes };
  }

  const currentManifest = loadManifest(CURRENT_MANIFEST_PATH);
  const previousManifest = loadManifest(PREVIOUS_MANIFEST_PATH);

  if (currentManifest && previousManifest) {
    if (!PREVIOUS_DIST_DIR || !existsSync(PREVIOUS_DIST_DIR)) {
      console.log("Previous manifest found without previous dist snapshot; falling back to full prerender.");
      return { changedRoutes: allRoutes, unchangedRoutes: [] };
    }

    const plan = computeChangedRoutes(currentManifest, previousManifest);
    console.log(`Using manifest diff prerender mode (${plan.changed.length} changed routes, ${plan.unchanged.length} reused routes).`);
    return {
      changedRoutes: plan.changed,
      unchangedRoutes: plan.unchanged,
    };
  }

  return { changedRoutes: allRoutes, unchangedRoutes: [] };
}

function startStaticServer(): Promise<ReturnType<typeof createServer>> {
  return new Promise((resolveServer, rejectServer) => {
    const server = createServer((req, reply) => {
      const url = req.url || "/";
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

      const fallback = readFileSync(resolve(DIST, "index.html"));
      reply.writeHead(200, { "Content-Type": "text/html" });
      reply.end(fallback);
    });

    server.once("error", rejectServer);
    server.listen(PORT, () => resolveServer(server));
  });
}

async function renderRoute(browser: Awaited<ReturnType<typeof launch>>, route: string): Promise<void> {
  const page = await browser.newPage();
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
    await page.evaluate(() => new Promise((resolveDelay) => setTimeout(resolveDelay, 200)));

    const html = await page.content();
    const outPath = routeToDistPath(route, DIST);
    ensureParentDir(outPath);
    writeFileSync(outPath, html, "utf-8");
  } catch (err) {
    console.warn(`  Failed: ${route} - ${(err as Error).message}`);
  } finally {
    await page.close();
  }
}

async function processInBatches(browser: Awaited<ReturnType<typeof launch>>, routes: string[]) {
  let completed = 0;
  const total = routes.length;
  const queue = [...routes];

  async function worker() {
    while (queue.length > 0) {
      const route = queue.shift();
      if (!route) return;

      await renderRoute(browser, route);
      completed++;

      if (completed % 50 === 0 || completed === total) {
        console.log(`  ${completed}/${total} pages rendered`);
      }
    }
  }

  const workers = Array.from({ length: Math.max(1, CONCURRENCY) }, () => worker());
  await Promise.all(workers);
}

function writePlanSummary(changedRoutes: string[], unchangedRoutes: string[]) {
  const outPath = resolve(DIST, "_meta/prerender-plan.json");
  ensureParentDir(outPath);
  writeFileSync(outPath, JSON.stringify({
    changed_routes: changedRoutes,
    reused_routes: unchangedRoutes,
  }, null, 2), "utf-8");
}

async function main() {
  if (SHOULD_SKIP_PRERENDER) {
    console.log("Skipping prerender for local build.");
    console.log("Set PRERENDER_LOCAL=1 to force local prerendering.");
    return;
  }

  const allRoutes = parseRoutesFromSitemap();
  const { changedRoutes, unchangedRoutes } = selectRoutes(allRoutes);

  copyForwardUnchangedRoutes(unchangedRoutes);
  writePlanSummary(changedRoutes, unchangedRoutes);

  console.log(`Prerendering ${changedRoutes.length} pages (${CONCURRENCY} concurrent) on port ${PORT}...`);

  if (changedRoutes.length === 0) {
    console.log("No changed routes detected. Reused previous prerendered HTML for all routes.");
    return;
  }

  const server = await startStaticServer();
  const browser = await launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });

  try {
    await processInBatches(browser, changedRoutes);
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
