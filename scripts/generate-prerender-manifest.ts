import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from "fs";
import { resolve, relative } from "path";

const API = process.env.VITE_API_URL || "https://api.poneglyph.one";
const OUT = resolve(import.meta.dirname, "../public/_meta/prerender-manifest.json");
const SRC_ROOT = resolve(import.meta.dirname, "../src");
const SHOULD_SKIP_PRERENDER = process.env.CI !== "true" && process.env.PRERENDER_LOCAL !== "1";

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

interface ApiManifestResponse {
  data: {
    generated_at: string;
    routes: Array<{
      route: string;
      render_group: Exclude<RenderGroup, "static">;
      data_hash: string;
    }>;
  };
}

function sleep(ms: number) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function fetchJson<T>(path: string, attempt = 0): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) {
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const backoffMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 500 * (2 ** attempt);
      await sleep(backoffMs);
      return fetchJson<T>(path, attempt + 1);
    }

    throw new Error(`${path} returned ${res.status}`);
  }

  return res.json();
}

function hashString(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function walkFiles(targetPath: string): string[] {
  if (!existsSync(targetPath)) {
    return [];
  }

  const stats = statSync(targetPath);
  if (stats.isFile()) {
    return [targetPath];
  }

  const entries = readdirSync(targetPath, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));

  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = resolve(targetPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function hashSourcePaths(paths: string[]): string {
  const hash = createHash("sha256");

  for (const target of paths) {
    const fullPath = resolve(import.meta.dirname, "..", target);
    for (const filePath of walkFiles(fullPath)) {
      hash.update(relative(SRC_ROOT, filePath));
      hash.update("\n");
      hash.update(readFileSync(filePath));
      hash.update("\n");
    }
  }

  return hash.digest("hex");
}

async function main() {
  if (SHOULD_SKIP_PRERENDER) {
    if (existsSync(OUT)) {
      unlinkSync(OUT);
    }

    console.log("Skipping prerender manifest generation for local build.");
    console.log("Set PRERENDER_LOCAL=1 to force local prerendering.");
    return;
  }

  console.log("Generating prerender manifest...");

  const render_group_hashes: Record<RenderGroup, string> = {
    static: hashSourcePaths([
      "src/App.tsx",
      "src/components/layout",
      "src/hooks/usePageMeta.ts",
      "src/pages/Home.tsx",
      "src/pages/Search.tsx",
      "src/pages/AdvancedSearch.tsx",
      "src/pages/SyntaxHelp.tsx",
      "src/pages/ApiDocs.tsx",
      "src/pages/MissionStatement.tsx",
      "src/pages/PrivacyPolicy.tsx",
      "src/pages/ProductBrowser.tsx",
      "src/pages/ReportIssue.tsx",
      "src/pages/TermsOfUse.tsx",
    ]),
    cards: hashSourcePaths([
      "src/App.tsx",
      "src/components/card",
      "src/components/layout",
      "src/hooks/usePageMeta.ts",
      "src/pages/CardPage.tsx",
    ]),
    sets_index: hashSourcePaths([
      "src/App.tsx",
      "src/components/layout",
      "src/hooks/usePageMeta.ts",
      "src/pages/SetBrowser.tsx",
    ]),
    set_detail: hashSourcePaths([
      "src/App.tsx",
      "src/components/card",
      "src/components/layout",
      "src/hooks/usePageMeta.ts",
      "src/pages/SetPage.tsx",
    ]),
    formats_index: hashSourcePaths([
      "src/App.tsx",
      "src/components/layout",
      "src/hooks/usePageMeta.ts",
      "src/pages/FormatBrowser.tsx",
    ]),
    format_detail: hashSourcePaths([
      "src/App.tsx",
      "src/components/card/CardHoverPreviewLink.tsx",
      "src/components/layout",
      "src/hooks/usePageMeta.ts",
      "src/pages/FormatPage.tsx",
    ]),
    don: hashSourcePaths([
      "src/App.tsx",
      "src/components/layout",
      "src/hooks/usePageMeta.ts",
      "src/pages/DonBrowser.tsx",
    ]),
    scan_progress: hashSourcePaths([
      "src/App.tsx",
      "src/components/layout",
      "src/hooks/usePageMeta.ts",
      "src/pages/ScanProgress.tsx",
    ]),
  };

  let apiManifest: ApiManifestResponse;
  try {
    apiManifest = await fetchJson<ApiManifestResponse>("/v1/prerender-manifest");
  } catch (error) {
    if (existsSync(OUT)) {
      unlinkSync(OUT);
    }

    console.warn(`Skipping prerender manifest generation: ${(error as Error).message}`);
    console.warn("Falling back to full prerender until /v1/prerender-manifest is available.");
    return;
  }

  const routes: RouteManifestEntry[] = [
    { route: "/", render_group: "static", data_hash: hashString("static:/") },
    { route: "/search", render_group: "static", data_hash: hashString("static:/search") },
    { route: "/advanced", render_group: "static", data_hash: hashString("static:/advanced") },
    { route: "/search/syntax", render_group: "static", data_hash: hashString("static:/search/syntax") },
    { route: "/api", render_group: "static", data_hash: hashString("static:/api") },
    { route: "/mission", render_group: "static", data_hash: hashString("static:/mission") },
    { route: "/products", render_group: "static", data_hash: hashString("static:/products") },
    { route: "/privacy", render_group: "static", data_hash: hashString("static:/privacy") },
    { route: "/report", render_group: "static", data_hash: hashString("static:/report") },
    { route: "/terms", render_group: "static", data_hash: hashString("static:/terms") },
    ...apiManifest.data.routes,
  ];

  const manifest: PrerenderManifest = {
    version: 1,
    generated_at: apiManifest.data.generated_at,
    render_group_hashes,
    routes: routes.sort((a, b) => a.route.localeCompare(b.route)),
  };

  mkdirSync(resolve(OUT, ".."), { recursive: true });
  writeFileSync(OUT, JSON.stringify(manifest, null, 2), "utf-8");
  console.log(`Wrote prerender manifest with ${manifest.routes.length} routes to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
