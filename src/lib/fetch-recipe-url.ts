// Fetch a recipe page and return its main text, suitable for prepending to
// the Gemini prompt. Conservative SSRF protection (block localhost / private
// IP literals in the URL) plus size + time caps. Not a full SSRF defense
// since DNS-level rebinding isn't blocked — that's overkill for a friends-
// scale alpha behind a residential router.

const MAX_BYTES = 1_500_000; // ~1.5MB
const MAX_TEXT_CHARS = 8_000; // ~8KB sent to Gemini
const FETCH_TIMEOUT_MS = 8_000;

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
    const { title, text } = stripHtml(html);
    return {
      ok: true,
      url: parsed.toString(),
      title,
      text: text.slice(0, MAX_TEXT_CHARS),
    };
  } catch (err) {
    if ((err as Error).name === 'AbortError') return { ok: false, reason: 'timeout' };
    return { ok: false, reason: 'fetch-failed' };
  } finally {
    clearTimeout(timeout);
  }
}
