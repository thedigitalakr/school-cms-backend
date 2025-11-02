// src/middleware/cors.js
/**
 * Powerful CORS middleware with multi-domain support.
 * - ALLOW_ORIGINS (CSV) examples:
 *   *  "*"                                 -> allow all (no credentials)
 *   *  "https://citcchandigarh.com,https://*.citc.in"
 *   *  "/^https?:\\/\\/(dev|stage)\\.yourco\\.com$/"
 *   *  "http://localhost:5173,http://localhost:3000"
 *
 * Notes:
 * - We *reflect* the Origin if it matches any pattern.
 * - If ALLOW_ORIGINS is missing, we default to a safe dev set.
 * - We do not set `Access-Control-Allow-Credentials` (your app uses Bearer tokens).
 */

const DEFAULT_DEV_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
];

function compilePatterns(rawList) {
  const list = (rawList || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  if (list.length === 0) return DEFAULT_DEV_ORIGINS;

  return list;
}

function patternMatchesOrigin(pattern, origin) {
  if (!origin) return false; // no Origin header -> usually same-origin or curl; we won't reflect.

  if (pattern === "*") return true;

  // Regex pattern if wrapped with slashes:  /^...$/
  if (pattern.startsWith("/") && pattern.endsWith("/")) {
    try {
      const rx = new RegExp(pattern.slice(1, -1), "i");
      return rx.test(origin);
    } catch {
      return false;
    }
  }

  // Wildcard => convert to regex
  if (pattern.includes("*")) {
    // Escape regex special chars, then replace * with .*
    const esc = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    try {
      const rx = new RegExp("^" + esc + "$", "i");
      return rx.test(origin);
    } catch {
      return false;
    }
  }

  // Exact match
  return pattern.toLowerCase() === String(origin).toLowerCase();
}

export default function corsMultiDomain(options = {}) {
  const {
    allowOrigins = process.env.ALLOW_ORIGINS,   // CSV, *, wildcards, or regex
    allowMethods = "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    allowHeaders = "Authorization,Content-Type,X-Requested-With",
    exposeHeaders = "Content-Length,Content-Range,Content-Type",
    // Your app sends Bearer token, not cookies; keep credentials off (safer).
    allowCredentials = false,
    // Decide whether to allow requests without Origin header (e.g., curl/health).
    allowNoOrigin = true,
  } = options;

  const patterns = compilePatterns(allowOrigins);

  return function corsHandler(req, res, next) {
    const origin = req.headers.origin;

    // Always vary on Origin (so caches don't mix responses)
    res.setHeader("Vary", "Origin");

    let allowed = false;

    if (!origin) {
      // No origin header (health checks, curl, SSR). Allow if configured.
      allowed = !!allowNoOrigin;
    } else {
      // Match against patterns
      for (const p of patterns) {
        if (patternMatchesOrigin(p, origin)) {
          allowed = true;
          break;
        }
      }
    }

    if (allowed) {
      // If you *ever* switch to cookie auth, also set:
      // res.setHeader("Access-Control-Allow-Credentials", "true");
      if (allowCredentials) {
        // With credentials, you must reflect the exact origin (not "*")
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
      } else {
        // No credentials — you can safely reflect or use *.
        // We reflect to be consistent with per-domain policies:
        res.setHeader("Access-Control-Allow-Origin", origin);
      }

      res.setHeader("Access-Control-Allow-Methods", allowMethods);
      res.setHeader("Access-Control-Allow-Headers", allowHeaders);
      res.setHeader("Access-Control-Expose-Headers", exposeHeaders);
      res.setHeader("Access-Control-Max-Age", "86400"); // 24h preflight cache
    }

    if (req.method === "OPTIONS") {
      // Fast preflight path
      return res.status(204).end();
    }

    return next();
  };
}
