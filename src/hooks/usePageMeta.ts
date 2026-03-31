import { useEffect } from "react";

const DEFAULT_TITLE = "poneglyph - One Piece TCG Database";
const DEFAULT_DESCRIPTION = "Search, browse, and explore the One Piece Card Game. Card database with prices, legality, and advanced search.";

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

export function usePageMeta({ title, description }: { title?: string; description?: string }) {
  useEffect(() => {
    const fullTitle = title ? `${title} | poneglyph` : DEFAULT_TITLE;
    const desc = description || DEFAULT_DESCRIPTION;

    document.title = fullTitle;
    setMetaTag("description", desc);
    setOgTag("og:title", title || DEFAULT_TITLE);
    setOgTag("og:description", desc);

    return () => {
      document.title = DEFAULT_TITLE;
      setMetaTag("description", DEFAULT_DESCRIPTION);
      setOgTag("og:title", DEFAULT_TITLE);
      setOgTag("og:description", DEFAULT_DESCRIPTION);
    };
  }, [title, description]);
}
