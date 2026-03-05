const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify({ data }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });

const errorJson = (code, message, status = 400, headers = {}) =>
  new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });

const normalizeOrigin = (value = "") => String(value || "").trim().replace(/\/+$/, "");

const parseAllowedOrigins = (value = "") =>
  String(value || "")
    .split(",")
    .map((item) => normalizeOrigin(item))
    .filter(Boolean);

const withSecurityHeaders = (headers, isSecureRequest) => {
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  headers.set("x-dns-prefetch-control", "off");
  headers.set("x-permitted-cross-domain-policies", "none");
  headers.set("origin-agent-cluster", "?1");
  headers.set("referrer-policy", "no-referrer");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=(self)");
  headers.set("cross-origin-resource-policy", "same-origin");
  headers.set("cross-origin-opener-policy", "same-origin");
  headers.set(
    "content-security-policy",
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; connect-src 'self'; img-src 'self' data:;"
  );
  if (isSecureRequest) {
    headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  }
  return headers;
};

const applyCors = (request, env, headers) => {
  const origin = normalizeOrigin(request.headers.get("origin") || "");
  if (!origin) return { allowed: true, headers };

  const allowedOrigins = parseAllowedOrigins(env.CORS_ORIGINS || "");
  if (!allowedOrigins.includes(origin)) {
    return { allowed: false, headers };
  }

  headers.set("vary", "Origin");
  headers.set("access-control-allow-origin", origin);
  headers.set("access-control-allow-credentials", "true");
  headers.set("access-control-allow-methods", "GET,POST,PATCH,DELETE,OPTIONS");
  headers.set("access-control-allow-headers", "Content-Type, X-CSRF-Token, X-Device-Id, X-Request-Id");
  return { allowed: true, headers };
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const prefix = String(env.API_PREFIX || "/api/v1").replace(/\/+$/, "");
    const requestId = crypto.randomUUID();
    const isSecureRequest = url.protocol === "https:";

    const headers = withSecurityHeaders(new Headers(), isSecureRequest);
    headers.set("x-request-id", requestId);

    const cors = applyCors(request, env, headers);
    if (!cors.allowed) {
      return errorJson("origin_forbidden", "Origin not allowed.", 403, cors.headers);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors.headers });
    }

    if (String(env.FORCE_HTTPS || "true").toLowerCase() === "true" && !isSecureRequest) {
      return errorJson("https_required", "HTTPS is required.", 426, cors.headers);
    }

    if (url.pathname === "/healthz" || url.pathname === `${prefix}/healthz`) {
      return json(
        {
          status: "ok",
          environment: "production",
          timestamp: new Date().toISOString(),
        },
        200,
        cors.headers
      );
    }

    if (url.pathname === "/readyz" || url.pathname === `${prefix}/readyz`) {
      const checks = {
        d1: env.DB ? "configured" : "missing",
        r2: env.UPLOADS_BUCKET ? "configured" : "missing",
      };
      const ready = checks.d1 === "configured" && checks.r2 === "configured";
      return json(
        {
          status: ready ? "ready" : "degraded",
          checks,
          timestamp: new Date().toISOString(),
        },
        ready ? 200 : 503,
        cors.headers
      );
    }

    if (url.pathname === "/" || url.pathname === prefix) {
      return json(
        {
          service: "verdent-vision-api-edge",
          status: "ok",
          timestamp: new Date().toISOString(),
        },
        200,
        cors.headers
      );
    }

    return errorJson(
      "not_implemented",
      "Edge worker scaffold is ready. Migrate Node API routes to Worker handlers next.",
      501,
      cors.headers
    );
  },
};
