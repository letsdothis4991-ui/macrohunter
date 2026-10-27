/**
 * Finds a venue's menu: a file someone dropped into data/ingest/manual-menus/, or
 * the venue's own website (the home page, pages that look like menus, and menu PDFs).
 * Delivery platforms are deliberately not used: their terms forbid scraping.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { Place } from "./places";

export type MenuPart =
  | { kind: "text"; url: string; text: string }
  | { kind: "pdf"; url: string; base64: string }
  | { kind: "image"; url: string; base64: string; mediaType: ImageMediaType };

export type ImageMediaType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif";

export type Menu = { source: string; parts: MenuPart[] };

const USER_AGENT =
  "MacroHunterMenuBot/0.1 (+https://github.com/letsdothis4991-ui/macrohunter)";
const MAX_TEXT_CHARS = 60_000;
const MAX_PDF_BYTES = 15 * 1024 * 1024;
const MAX_MENU_PAGES = 4;
/** Less text than this from a website is treated as "no menu found". */
const MIN_MENU_TEXT = 400;

const IMAGE_TYPES: Record<string, ImageMediaType> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/** Turns an HTML page into readable text, keeping line breaks between blocks. */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(
        /<(script|style|noscript|svg|head|nav|footer)\b[\s\S]*?<\/\1>/gi,
        " ",
      )
      .replace(
        /<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/article)\b[^>]*>/gi,
        "\n",
      )
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeEntities(text: string): string {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    ndash: "–",
    mdash: "—",
    rsquo: "’",
    lsquo: "‘",
    eacute: "é",
  };
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n =
        code[1] === "x" || code[1] === "X"
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return named[code.toLowerCase()] ?? m;
  });
}

/** Links on a page that probably lead to a menu, best first. Same site or PDF only. */
export function findMenuLinks(html: string, pageUrl: string): string[] {
  const base = new URL(pageUrl);
  const scored = new Map<string, number>();
  for (const m of html.matchAll(
    /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    let url: URL;
    try {
      url = new URL(m[1], base);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(url.protocol)) continue;
    url.hash = "";
    const isPdf = /\.pdf$/i.test(url.pathname);
    if (url.hostname !== base.hostname && !isPdf) continue;
    const label = htmlToText(m[2]).toLowerCase();
    const href = url.pathname.toLowerCase();
    let score = 0;
    if (/menu/.test(href) || /menu/.test(label)) score += 3;
    if (
      /\b(food|eat|breakfast|brunch|lunch|dinner|all[- ]day)\b/.test(
        `${href} ${label}`,
      )
    )
      score += 1;
    if (
      /drink|wine|cocktail|bar-?menu|function|catering|gift|career|job/.test(
        `${href} ${label}`,
      )
    )
      score -= 2;
    if (isPdf) score += 1;
    if (score > 0 && url.href !== base.href) {
      scored.set(url.href, Math.max(score, scored.get(url.href) ?? 0));
    }
  }
  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([href]) => href);
}

async function fetchWithTimeout(
  url: string,
  fetchImpl: typeof fetch,
): Promise<Response> {
  return fetchImpl(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/pdf;q=0.9,*/*;q=0.5",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });
}

async function fetchPart(
  url: string,
  fetchImpl: typeof fetch,
): Promise<{ part: MenuPart; html?: string } | null> {
  const res = await fetchWithTimeout(url, fetchImpl);
  if (!res.ok) return null;
  const type = res.headers.get("content-type") ?? "";
  if (
    type.includes("pdf") ||
    /\.pdf$/i.test(new URL(res.url || url).pathname)
  ) {
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length > MAX_PDF_BYTES) return null;
    return { part: { kind: "pdf", url, base64: bytes.toString("base64") } };
  }
  if (!type.includes("html") && !type.includes("text")) return null;
  const html = await res.text();
  return { part: { kind: "text", url, text: htmlToText(html) }, html };
}

/** Reads the venue's website. Returns null when no usable menu turns up. */
export async function fetchWebsiteMenu(
  website: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Menu | null> {
  const parts: MenuPart[] = [];
  let home: Awaited<ReturnType<typeof fetchPart>>;
  try {
    home = await fetchPart(website, fetchImpl);
  } catch {
    return null;
  }
  if (!home) return null;
  parts.push(home.part);

  for (const link of home.html
    ? findMenuLinks(home.html, website).slice(0, MAX_MENU_PAGES)
    : []) {
    try {
      const page = await fetchPart(link, fetchImpl);
      if (page) parts.push(page.part);
    } catch {
      // A broken menu link shouldn't sink the venue; the other pages may be enough.
    }
  }

  const hasPdf = parts.some((p) => p.kind === "pdf");
  const textChars = parts.reduce(
    (n, p) => n + (p.kind === "text" ? p.text.length : 0),
    0,
  );
  if (!hasPdf && textChars < MIN_MENU_TEXT) return null;
  return { source: website, parts: capText(parts) };
}

/** Keeps total page text under the cap, trimming the least likely pages (the home page) first. */
function capText(parts: MenuPart[]): MenuPart[] {
  let budget = MAX_TEXT_CHARS;
  const out: MenuPart[] = [];
  for (const p of [...parts].reverse()) {
    if (p.kind !== "text") {
      out.unshift(p);
      continue;
    }
    if (budget <= 0) continue;
    out.unshift({ ...p, text: p.text.slice(0, budget) });
    budget -= p.text.length;
  }
  return out;
}

/**
 * Files in `dir` named after the venue's place id or name slug, e.g.
 * `ChIJ123.pdf`, `iron-and-oat.jpg`, `iron-and-oat-2.jpg`, `iron-and-oat.txt`.
 */
export async function readManualMenu(
  dir: string,
  keys: string[],
): Promise<Menu | null> {
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return null;
  }
  const parts: MenuPart[] = [];
  for (const file of files.sort()) {
    const ext = path.extname(file).toLowerCase();
    const stem = path.basename(file, ext);
    if (!keys.some((k) => stem === k || stem.startsWith(`${k}-`))) continue;
    const full = path.join(dir, file);
    if (ext === ".txt" || ext === ".md") {
      parts.push({
        kind: "text",
        url: `manual:${file}`,
        text: await readFile(full, "utf8"),
      });
    } else if (ext === ".pdf") {
      parts.push({
        kind: "pdf",
        url: `manual:${file}`,
        base64: (await readFile(full)).toString("base64"),
      });
    } else if (IMAGE_TYPES[ext]) {
      parts.push({
        kind: "image",
        url: `manual:${file}`,
        base64: (await readFile(full)).toString("base64"),
        mediaType: IMAGE_TYPES[ext],
      });
    }
  }
  return parts.length ? { source: "manual", parts } : null;
}

export async function findMenu(
  place: Place,
  manualDir: string,
  manualKeys: string[],
  fetchImpl: typeof fetch = fetch,
): Promise<Menu | null> {
  return (
    (await readManualMenu(manualDir, manualKeys)) ??
    (place.website ? await fetchWebsiteMenu(place.website, fetchImpl) : null)
  );
}
