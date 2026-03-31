import { writeFileSync } from "fs";
import { resolve } from "path";

const SITE = "https://poneglyph.one";
const API = process.env.VITE_API_URL || "https://api.poneglyph.one";

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`${path} returned ${res.status}`);
  return res.json();
}

interface CardEntry { card_number: string }
interface SetEntry { code: string }
interface FormatEntry { name: string }

async function getAllCardNumbers(): Promise<string[]> {
  const numbers: string[] = [];
  let page = 1;
  while (true) {
    const data = await fetchJson<{ data: CardEntry[]; pagination: { has_more: boolean } }>(
      `/v1/cards?unique=cards&limit=250&page=${page}&sort=card_number&order=asc`
    );
    for (const c of data.data) numbers.push(c.card_number);
    if (!data.pagination.has_more) break;
    page++;
  }
  return numbers;
}

async function main() {
  console.log("Generating sitemap...");

  const [cardNumbers, setsRes, formatsRes] = await Promise.all([
    getAllCardNumbers(),
    fetchJson<{ data: SetEntry[] }>("/v1/sets"),
    fetchJson<{ data: FormatEntry[] }>("/v1/formats"),
  ]);

  const urls: { loc: string; priority: string; changefreq: string }[] = [];

  // Static pages
  urls.push({ loc: "/", priority: "1.0", changefreq: "daily" });
  urls.push({ loc: "/search", priority: "0.8", changefreq: "daily" });
  urls.push({ loc: "/advanced", priority: "0.5", changefreq: "monthly" });
  urls.push({ loc: "/sets", priority: "0.8", changefreq: "weekly" });
  urls.push({ loc: "/formats", priority: "0.7", changefreq: "weekly" });
  urls.push({ loc: "/don", priority: "0.6", changefreq: "monthly" });
  urls.push({ loc: "/search/syntax", priority: "0.4", changefreq: "monthly" });
  urls.push({ loc: "/api", priority: "0.4", changefreq: "monthly" });
  urls.push({ loc: "/mission", priority: "0.3", changefreq: "yearly" });

  // Card pages
  for (const num of cardNumbers) {
    urls.push({ loc: `/cards/${num}`, priority: "0.7", changefreq: "weekly" });
  }

  // Set pages
  for (const set of setsRes.data) {
    urls.push({ loc: `/sets/${set.code}`, priority: "0.7", changefreq: "weekly" });
  }

  // Format pages
  for (const format of formatsRes.data) {
    urls.push({ loc: `/formats/${encodeURIComponent(format.name)}`, priority: "0.6", changefreq: "weekly" });
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((u) =>
      `  <url><loc>${SITE}${u.loc}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`
    ),
    "</urlset>",
  ].join("\n");

  const out = resolve(import.meta.dirname, "../public/sitemap.xml");
  writeFileSync(out, xml, "utf-8");
  console.log(`Wrote ${urls.length} URLs to ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
