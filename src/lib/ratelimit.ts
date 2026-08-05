/**
 * Minimal in-memory rate limiter for the public read-only API.
 * Fine for a single-process deployment (which this app is, because of Socket.IO).
 */
const hits = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000;
const LIMIT = 30;

export function rateLimit(req: Request): boolean {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= LIMIT;
}

export function rateLimited() {
  return Response.json({ error: "Rate limit exceeded — max 30 requests/minute" }, { status: 429 });
}
