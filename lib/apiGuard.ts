/**
 * API Guard — applied to every API route.
 *
 * Provides:
 *  1. In-memory rate limiting  — 60 requests / minute / IP  → 429
 *  2. Cross-origin check       — rejects requests whose Origin
 *                                doesn't match the app's own host → 403
 *  3. CORS response headers    — tells browsers only the app's own
 *                                domain may call these endpoints
 *
 * Usage:
 *   const guard = apiGuard(request);
 *   if (guard) return guard;
 */

// ---------------------------------------------------------------------------
// Rate limiter — in-memory, resets per minute per IP
// ---------------------------------------------------------------------------
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

const RATE_LIMIT_MAX = 60;       // requests
const RATE_LIMIT_WINDOW = 60_000; // ms (1 minute)

// Periodically prune stale entries so the Map doesn't grow unbounded.
// Runs at most once per minute.
let lastPrune = 0;
function pruneRateLimitMap() {
  const now = Date.now();
  if (now - lastPrune < RATE_LIMIT_WINDOW) return;
  lastPrune = now;
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}

function getClientIp(req: Request): string {
  // Vercel / most proxies set x-forwarded-for
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "unknown";
}

// ---------------------------------------------------------------------------
// CORS helpers
// ---------------------------------------------------------------------------
function getAppOrigin(req: Request): string {
  const host = req.headers.get("host") ?? "localhost";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

export function buildCorsHeaders(req: Request): Record<string, string> {
  const appOrigin = getAppOrigin(req);
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": appOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

// ---------------------------------------------------------------------------
// Main guard — returns a Response to short-circuit, or null to allow through
// ---------------------------------------------------------------------------
export function apiGuard(req: Request): Response | null {
  pruneRateLimitMap();

  // 1. Rate limiting
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
  } else {
    entry.count += 1;
    if (entry.count > RATE_LIMIT_MAX) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Try again in a minute." }),
        {
          status: 429,
          headers: {
            ...buildCorsHeaders(req),
            "Retry-After": "60",
          },
        }
      );
    }
  }

  // 2. Cross-origin check
  // Browser-initiated cross-origin requests always include an Origin header.
  // Same-origin requests (our own pages calling our own API) either omit it
  // or have an Origin matching our host.
  const origin = req.headers.get("origin");
  if (origin) {
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: buildCorsHeaders(req) }
      );
    }

    const appHost = req.headers.get("host") ?? "";
    if (originHost !== appHost) {
      return new Response(
        JSON.stringify({ error: "Forbidden: cross-origin requests are not permitted." }),
        { status: 403, headers: buildCorsHeaders(req) }
      );
    }
  }

  return null; // all checks passed
}
