/**
 * Resilient fetch for WordPress REST calls.
 *
 * Ladder of attempts:
 *   1. Send the request as-is (normal/default identity).
 *   2. If it comes back 403 (a WAF/bot gate — e.g. Cloudflare `cf-mitigated:
 *      challenge`), retry ONCE with a real browser User-Agent. Many bot checks
 *      flag the default Node UA but let a browser UA through.
 *   3. On transient failures (network drop / 5xx / 429), retry the same identity
 *      with backoff (some hosts, e.g. Newfold/HostGator, drop connections).
 *   4. If everything fails, return the last response (caller handles the error)
 *      or throw the last network error.
 *
 * The browser UA is only ever used as a FALLBACK after a 403, so healthy hosts
 * see completely normal requests — no behavior change and no fingerprint concerns
 * for them.
 */

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function withUserAgent(init: RequestInit, ua: string): RequestInit {
  return { ...init, headers: { ...(init.headers as Record<string, string> | undefined), 'User-Agent': ua } };
}

export interface WpFetchOptions {
  /** transient retries per identity (default 3) */
  retries?: number;
  /** disable the browser-UA fallback (default: enabled) */
  noUaFallback?: boolean;
}

export async function wpFetch(url: string, init: RequestInit = {}, opts: WpFetchOptions = {}): Promise<Response> {
  const retries = opts.retries ?? 3;
  // Identity 1: as-is. Identity 2: browser UA (skipped if disabled).
  const identities: (string | undefined)[] = opts.noUaFallback ? [undefined] : [undefined, BROWSER_UA];

  let lastRes: Response | null = null;
  let lastErr: unknown;

  for (const ua of identities) {
    const reqInit = ua ? withUserAgent(init, ua) : init;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const res = await fetch(url, reqInit);
        // Transient server error → retry the SAME identity with backoff.
        if (res.status >= 500 || res.status === 429) {
          lastRes = res;
          if (attempt < retries - 1) { await sleep(800 * (attempt + 1)); continue; }
          break;
        }
        // 403 (WAF/bot gate) → stop retrying this identity; escalate to the
        // browser-UA identity (retrying the same UA won't help).
        if (res.status === 403) {
          lastRes = res;
          break;
        }
        // Any other status (2xx / 401 / 404 / 400 …) is a real answer — return it.
        return res;
      } catch (e) {
        lastErr = e;
        if (attempt < retries - 1) { await sleep(800 * (attempt + 1)); continue; }
      }
    }
  }

  if (lastRes) return lastRes;
  throw lastErr;
}
