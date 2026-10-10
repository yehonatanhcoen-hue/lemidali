export type MaterialKind = "youtube" | "pdf" | "document" | "web";

/** Accepts "example.com/x" or a full URL; returns a normalized https URL or null. */
export function normalizeUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".") && url.hostname !== "localhost") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const m = u.pathname.match(/^\/(embed|shorts|live|v)\/([\w-]+)/);
      if (m) return m[2];
    }
  } catch {}
  return null;
}

export function materialKind(url: string): MaterialKind {
  if (youtubeId(url)) return "youtube";
  const path = (() => {
    try {
      return new URL(url).pathname.toLowerCase();
    } catch {
      return "";
    }
  })();
  if (path.endsWith(".pdf")) return "pdf";
  if (/\.(docx?|pptx?|xlsx?|odt|txt|md)$/.test(path) || /docs\.google\.com|notion\.(so|site)/.test(url))
    return "document";
  return "web";
}

export const KIND_LABEL: Record<MaterialKind, string> = {
  youtube: "סרטון YouTube",
  pdf: "קובץ PDF",
  document: "מסמך",
  web: "אתר / מאמר",
};

export function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
