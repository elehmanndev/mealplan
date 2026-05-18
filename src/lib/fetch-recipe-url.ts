// Fetch a recipe page and return its main text, suitable for prepending to
// the Gemini prompt. Conservative SSRF protection (block localhost / private
// IP literals in the URL) plus size + time caps. Not a full SSRF defense
// since DNS-level rebinding isn't blocked — that's overkill for a friends-
// scale alpha behind a residential router.

// Big recipe sites (Hello Fresh, NYT Cooking, etc.) routinely serve 3-5MB
// HTML pages padded with inline JS, ads, "you might also like" lists. We
// want headroom without letting truly pathological pages blow memory.
const MAX_BYTES = 6_000_000; // ~6MB
// What we actually send to Gemini. JSON-LD pulls (small) sit well under
// this; full HTML strips truncate at the cap. 24KB ≈ 6-7K tokens — fine
// in Gemini Flash 2.5's window.
const MAX_TEXT_CHARS = 24_000;
const FETCH_TIMEOUT_MS = 10_000;

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fd[0-9a-f]{2}:/i,
];

export type FetchResult =
  | { ok: true; url: string; title: string | null; text: string }
  | { ok: false; reason: 'invalid-url' | 'private-host' | 'too-large' | 'timeout' | 'fetch-failed' | 'wrong-content-type' };

export function extractFirstUrl(message: string): string | null {
  // Strip Markdown-style link syntax first so we don't pick "https://x" out
  // of [label](https://x) twice.
  const m = message.match(/https?:\/\/[^\s<>"')\]}]+/i);
  return m ? m[0] : null;
}

function isPrivateHost(hostname: string): boolean {
  return PRIVATE_HOST_PATTERNS.some((re) => re.test(hostname));
}

/**
 * Pull schema.org/Recipe data out of <script type="application/ld+json">
 * blocks. Major recipe sites (Hello Fresh, NYT Cooking, Bon Appétit, BBC
 * Good Food, etc.) publish full ingredients + instructions there — 1-3KB
 * of clean structured data instead of 4MB of HTML.
 *
 * Returns a flattened text block ready to be prepended to the Gemini
 * prompt, or null if no Recipe-shaped JSON-LD is found.
 */
function extractRecipeJsonLd(html: string): { title: string | null; text: string } | null {
  const scriptRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const candidates: unknown[] = [];
  let match: RegExpExecArray | null;
  while ((match = scriptRe.exec(html))) {
    const raw = match[1].trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      // ld+json scripts can be a single object, an array, or wrapped in
      // a @graph array. Flatten everything into the candidate list.
      if (Array.isArray(parsed)) candidates.push(...parsed);
      else if (parsed && typeof parsed === 'object') {
        candidates.push(parsed);
        const graph = (parsed as { '@graph'?: unknown[] })['@graph'];
        if (Array.isArray(graph)) candidates.push(...graph);
      }
    } catch {
      // Some sites embed templated/broken JSON-LD; just skip.
    }
  }

  const recipe = candidates.find((c) => {
    if (!c || typeof c !== 'object') return false;
    const type = (c as { '@type'?: string | string[] })['@type'];
    if (!type) return false;
    return Array.isArray(type) ? type.includes('Recipe') : type === 'Recipe';
  }) as Record<string, unknown> | undefined;
  if (!recipe) return null;

  const cleanField = (s: unknown): string | null => {
    if (typeof s !== 'string') return null;
    const cleaned = decodeEntities(s.replace(/<[^>]+>/g, ' '))
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned || null;
  };

  const name = cleanField(recipe.name);
  const description = cleanField(recipe.description);
  const yieldVal = recipe.recipeYield ?? recipe.yield;
  const totalTime = typeof recipe.totalTime === 'string' ? recipe.totalTime : null;
  const prepTime = typeof recipe.prepTime === 'string' ? recipe.prepTime : null;
  const cookTime = typeof recipe.cookTime === 'string' ? recipe.cookTime : null;
  const ingredients = Array.isArray(recipe.recipeIngredient)
    ? (recipe.recipeIngredient as unknown[])
        .map(cleanField)
        .filter((x): x is string => typeof x === 'string')
    : [];
  const instructions = flattenInstructions(recipe.recipeInstructions);

  const lines: string[] = [];
  if (name) lines.push(`Nombre: ${name}`);
  if (description) lines.push(`Descripción: ${description}`);
  if (yieldVal != null) lines.push(`Raciones: ${String(yieldVal)}`);
  if (totalTime || prepTime || cookTime) {
    lines.push(
      `Tiempo: ${[prepTime && `prep ${prepTime}`, cookTime && `cocción ${cookTime}`, totalTime && `total ${totalTime}`]
        .filter(Boolean)
        .join(', ')}`,
    );
  }
  if (ingredients.length > 0) {
    lines.push('');
    lines.push('Ingredientes:');
    for (const ing of ingredients) lines.push(`- ${ing}`);
  }
  if (instructions.length > 0) {
    lines.push('');
    lines.push('Instrucciones:');
    for (const step of instructions) lines.push(`- ${step}`);
  }
  if (lines.length === 0) return null;
  return { title: name, text: lines.join('\n') };
}

function flattenInstructions(raw: unknown): string[] {
  if (!raw) return [];
  const out: string[] = [];
  const push = (s: unknown) => {
    if (typeof s !== 'string') return;
    // Some sites (Hello Fresh, looking at you) embed raw HTML inside
    // JSON-LD instruction text — <p>, <strong>, <br>, dir attributes,
    // etc. Strip it so Gemini gets clean prose, not malformed markup.
    const cleaned = decodeEntities(s.replace(/<[^>]+>/g, ' '))
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned) out.push(cleaned);
  };
  const walk = (node: unknown) => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node === 'string') {
      push(node);
      return;
    }
    if (typeof node === 'object') {
      const obj = node as Record<string, unknown>;
      if (typeof obj.text === 'string') push(obj.text);
      else if (typeof obj.name === 'string') push(obj.name);
      if (obj.itemListElement) walk(obj.itemListElement);
    }
  };
  walk(raw);
  return out;
}

function stripHtml(html: string): { title: string | null; text: string } {
  // Drop script + style blocks entirely.
  const cleaned = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ');

  const titleMatch = cleaned.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? decodeEntities(titleMatch[1]).trim() : null;

  // Convert block-level breaks into newlines for readability.
  const withBreaks = cleaned
    .replace(/<\/(p|div|li|h[1-6]|tr|br)[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>(?!\n)/gi, '\n');

  const text = decodeEntities(withBreaks.replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { title, text };
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

export async function fetchRecipeUrl(rawUrl: string): Promise<FetchResult> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'invalid-url' };
  }
  if (!/^https?:$/.test(parsed.protocol)) return { ok: false, reason: 'invalid-url' };
  if (isPrivateHost(parsed.hostname)) return { ok: false, reason: 'private-host' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(parsed.toString(), {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        // Some sites serve a different (simpler) page to bots.
        'User-Agent':
          'Mozilla/5.0 (compatible; MealPlanBot/1.0; +https://mealplan.elehmann.dev)',
        Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'es,en;q=0.8',
      },
    });
    if (!res.ok) return { ok: false, reason: 'fetch-failed' };

    // Re-check the final URL after redirects — block private hosts the
    // server might have bounced us to.
    try {
      const finalUrl = new URL(res.url);
      if (isPrivateHost(finalUrl.hostname)) {
        return { ok: false, reason: 'private-host' };
      }
    } catch {
      // ignore — if we can't parse the final URL, assume the original is fine
    }

    const contentType = (res.headers.get('content-type') ?? '').toLowerCase();
    if (!contentType.includes('html') && !contentType.includes('text/plain')) {
      return { ok: false, reason: 'wrong-content-type' };
    }

    const reader = res.body?.getReader();
    if (!reader) return { ok: false, reason: 'fetch-failed' };

    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel();
        return { ok: false, reason: 'too-large' };
      }
      chunks.push(value);
    }
    const buffer = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      buffer.set(c, offset);
      offset += c.byteLength;
    }
    const html = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    // Prefer structured schema.org/Recipe data when the site publishes it
    // — way higher signal than HTML scraping. Falls back to full strip
    // for sites without JSON-LD.
    const jsonLd = extractRecipeJsonLd(html);
    const extracted = jsonLd ?? stripHtml(html);
    return {
      ok: true,
      url: parsed.toString(),
      title: extracted.title,
      text: extracted.text.slice(0, MAX_TEXT_CHARS),
    };
  } catch (err) {
    if ((err as Error).name === 'AbortError') return { ok: false, reason: 'timeout' };
    return { ok: false, reason: 'fetch-failed' };
  } finally {
    clearTimeout(timeout);
  }
}
