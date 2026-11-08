// shortcut: counts live in this server instance's memory, so each Vercel instance counts on its own
// and a cold start resets them. Move to Vercel KV or Upstash if the demo gets real traffic.
const hits = new Map<string, { count: number; reset: number }>();

/** Seconds until the caller may retry, or 0 when the request is allowed. */
export function limited(ip: string, max = 20, windowMs = 60_000, now = Date.now()): number {
  const h = hits.get(ip);
  if (!h || now >= h.reset) {
    hits.set(ip, { count: 1, reset: now + windowMs });
    if (hits.size > 5000) for (const [k, v] of hits) if (now >= v.reset) hits.delete(k); // keep the map from growing forever
    return 0;
  }
  h.count++;
  return h.count > max ? Math.ceil((h.reset - now) / 1000) : 0;
}
