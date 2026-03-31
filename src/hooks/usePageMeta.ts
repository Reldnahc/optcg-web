import { useEffect } from "react";

const SITE_URL = "https://poneglyph.one";
const DEFAULT_TITLE = "poneglyph - One Piece TCG Database";
const DEFAULT_DESCRIPTION = "Search, browse, and explore the One Piece Card Game. Card database with prices, legality, and advanced search.";
const DEFAULT_IMAGE = "";

function setMetaTag(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
}

function setOgTag(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.content = content;
}

function removeMetaTag(name: string) {
  document.querySelector(`meta[name="${name}"]`)?.remove();
}

function removeOgTag(property: string) {
  document.querySelector(`meta[property="${property}"]`)?.remove();
}

function setJsonLd(data: object | null) {
  const id = "structured-data";
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!data) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("script");
    el.id = id;
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export interface PageMeta {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  twitterCard?: "summary" | "summary_large_image";
  jsonLd?: object;
}

export function usePageMeta({ title, description, image, url, type, twitterCard, jsonLd }: PageMeta) {
  useEffect(() => {
    const fullTitle = title ? `${title} | poneglyph` : DEFAULT_TITLE;
    const desc = description || DEFAULT_DESCRIPTION;
    const pageUrl = url ? `${SITE_URL}${url}` : SITE_URL;

    document.title = fullTitle;
    setMetaTag("description", desc);

    // Open Graph
    setOgTag("og:title", title || DEFAULT_TITLE);
    setOgTag("og:description", desc);
    setOgTag("og:url", pageUrl);
    setOgTag("og:type", type || "website");
    setOgTag("og:site_name", "poneglyph");
    if (image) {
      setOgTag("og:image", image);
      setMetaTag("twitter:card", twitterCard || "summary_large_image");
      setMetaTag("twitter:image", image);
    } else {
      removeOgTag("og:image");
      setMetaTag("twitter:card", "summary");
      removeMetaTag("twitter:image");
    }

    // Twitter
    setMetaTag("twitter:title", title || DEFAULT_TITLE);
    setMetaTag("twitter:description", desc);

    // JSON-LD
    setJsonLd(jsonLd || null);

    return () => {
      document.title = DEFAULT_TITLE;
      setMetaTag("description", DEFAULT_DESCRIPTION);
      setOgTag("og:title", DEFAULT_TITLE);
      setOgTag("og:description", DEFAULT_DESCRIPTION);
      removeOgTag("og:image");
      setOgTag("og:url", SITE_URL);
      setOgTag("og:type", "website");
      removeOgTag("og:site_name");
      setMetaTag("twitter:card", "summary");
      setMetaTag("twitter:title", DEFAULT_TITLE);
      setMetaTag("twitter:description", DEFAULT_DESCRIPTION);
      removeMetaTag("twitter:image");
      setJsonLd(null);
    };
  }, [title, description, image, url, type, twitterCard, jsonLd]);
}
