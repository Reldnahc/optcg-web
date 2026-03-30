import { Link } from "react-router-dom";
import { PageContainer } from "../components/layout/PageContainer";

const PRINCIPLES = [
  {
    title: "Fast and easy to use",
    body: "Search should feel quick, browsing should be straightforward, and card pages should answer the questions people actually have.",
  },
  {
    title: "Clear and accurate",
    body: "The site should present card data clearly. Rules about what the data means should live in the API, not get recreated in the frontend.",
  },
  {
    title: "Useful beyond the UI",
    body: "poneglyph.one should be useful as a public reference, but also solid enough for tools, research, content, and other community projects.",
  },
];

const COMMITMENTS = [
  "Keep search, browsing, and card detail pages usable on both desktop and mobile.",
  "Stay ad-free so the site can optimize for usefulness, not pageviews.",
  "Choose clarity over feature bloat, especially in the parts people use every day.",
  "Keep the site and API practical for players, collectors, judges, and developers.",
  "Treat the database like reference infrastructure, not just a gallery of card images.",
];

export function MissionStatement() {
  return (
    <PageContainer
      title="Mission Statement"
      wide
    >
      <div className="space-y-6">
        <section className="rounded-xl border border-border bg-bg-card">
          <div className="border-b border-border px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">In Short</p>
          </div>
          <div className="px-5 py-5">
            <p className="[font-family:var(--font-serif)] text-2xl leading-tight text-text-primary sm:text-[2rem]">
              Build the best public One Piece Card Game database and make it genuinely pleasant to use.
            </p>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-text-secondary">
              Finding a card, checking a print, browsing a set, reading legality, or linking the right result should be quick and obvious. The site should help people get what they need and get out of the way.
            </p>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,1fr)]">
          <section className="rounded-xl border border-border bg-bg-card px-5 py-5">
            <h2 className="text-lg font-semibold text-text-primary">What We Are Building</h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-text-secondary">
              <p>
                This project should feel more like reference infrastructure than a generic card catalog. The goal is to make the public site useful for deckbuilding, collecting, judging, research, and everyday lookup.
              </p>
              <p>
                That means good search, predictable URLs, readable card pages, solid browse flows, and an API that people can build on without reverse-engineering the site.
              </p>
              <p>
                It also means being disciplined about boundaries. The frontend should focus on presentation and navigation. The API should own the data rules and card semantics.
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-bg-card">
            <div className="border-b border-border px-5 py-3">
              <h2 className="text-lg font-semibold text-text-primary">Principles</h2>
            </div>
            <div className="divide-y divide-border">
              {PRINCIPLES.map((principle) => (
                <div key={principle.title} className="px-5 py-4">
                  <h3 className="text-sm font-semibold text-text-primary">{principle.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">{principle.body}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(18rem,0.95fr)_minmax(0,1.2fr)]">
          <section className="rounded-xl border border-border bg-bg-card px-5 py-5">
            <h2 className="text-lg font-semibold text-text-primary">Commitments</h2>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-text-secondary">
              {COMMITMENTS.map((commitment) => (
                <li key={commitment} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                  <span>{commitment}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-bg-card px-5 py-5">
            <h2 className="text-lg font-semibold text-text-primary">In Practice</h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-text-secondary">
              <p>
                If a feature makes the site look nicer but makes it harder to use, it is the wrong feature. If the important information is hidden, the design is wrong. If a data rule ends up in the frontend because it was convenient, it is in the wrong place.
              </p>
              <p>
                The standard is simple: help people find the right card quickly, understand what they are looking at, and move on.
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <Link className="rounded-md border border-border bg-bg-secondary px-3 py-2 text-link hover:bg-bg-hover hover:text-link-hover" to="/advanced">
                Advanced Search
              </Link>
              <Link className="rounded-md border border-border bg-bg-secondary px-3 py-2 text-link hover:bg-bg-hover hover:text-link-hover" to="/api">
                API Docs
              </Link>
              <Link className="rounded-md border border-border bg-bg-secondary px-3 py-2 text-link hover:bg-bg-hover hover:text-link-hover" to="/search/syntax">
                Syntax Guide
              </Link>
            </div>
          </section>
        </div>
      </div>
    </PageContainer>
  );
}
