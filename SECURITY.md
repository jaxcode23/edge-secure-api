# Security Overview

This document describes the security model of Edge Secure API, what is protected, how, and what is intentionally left out of scope.

---

## Threat Model

| Threat | Mitigated | Mechanism |
|--------|-----------|-----------|
| SQL injection | Yes | Parameterized queries via `@neondatabase/serverless` tagged templates |
| Cross-site scripting (XSS) via response headers | Yes | `X-Content-Type-Options: nosniff` prevents MIME-type sniffing |
| Clickjacking | Yes | `X-Frame-Options: DENY` blocks framing entirely |
| Cross-origin abuse | Yes | CORS allowlist enforced in Edge Middleware before routes execute |
| Denial of service via request flooding | Yes | Per-IP distributed rate limiting (50 req / 10 s) via Upstash Redis |
| Large payload DoS | Yes | 1 MB content-length check before JSON parsing |
| Rate limiter outage causing full API outage | Yes | Fail-open design — Redis errors are caught and requests pass through |
| Broken authentication | N/A | Authentication is not in scope (see [Out of Scope](#out-of-scope)) |

---

## Defense-in-Depth

Security is applied in layers, from the outermost edge inward. A failure in one layer does not compromise the others.

```
Request
  │
  ▼
┌─────────────────────────────────────┐
│ Layer 1: Edge Middleware            │
│  • CORS origin validation           │
│  • Per-IP rate limiting (Redis)     │
│  • Security response headers        │
└─────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────┐
│ Layer 2: Route Handler Validation   │
│  • Content-length check (1 MB)      │
│  • JSON parse + type checking       │
│  • Field-level validation           │
└─────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────┐
│ Layer 3: Database                   │
│  • Parameterized SQL (no interpolation) │
│  • Neon connection pooling + TLS    │
└─────────────────────────────────────┘
```

---

## Rate Limiting Algorithm

The rate limiter uses a fixed-window counter with Redis `INCR` + `EXPIRE`:

1. On each request, the middleware constructs a key: `ratelimit:<client-ip>`.
2. It issues `INCR ratelimit:<ip>`. If the key is new, Redis creates it with value `1`.
3. If the count is `1` (first request in the window), it sets `EXPIRE ratelimit:<ip> 10` to start a 10-second TTL.
4. If the count exceeds `50`, the middleware returns `429 Too Many Requests`.
5. After 10 seconds, the key expires and the window resets.

**Client IP** is extracted from `X-Forwarded-For` (first entry) or `X-Real-Ip`, falling back to `127.0.0.1`.

**Fail-open:** If Redis is unreachable (network error, timeout, misconfiguration), the `catch` block logs the error and allows the request through. A rate limiter outage must not cause an API outage.

### Limitations of this approach

- **Fixed window, not sliding window.** A client can send 50 requests at `T=9.9s` and another 50 at `T=10.1s` (100 in ~0.2s). For stricter enforcement, a sliding-window or token-bucket algorithm would be needed.
- **IP-based only.** Clients behind shared proxies or NAT share a rate limit bucket. authenticated rate limiting (per API key or user ID) would be more accurate.
- **Single-region Redis.** Upstash Redis is single-region; requests routed to a different edge location still hit the same Redis instance, adding latency. This is acceptable for a demo but not ideal for a global production API.

---

## CORS Enforcement

The middleware reads `ALLOWED_ORIGINS` (comma-separated) and validates the incoming `Origin` header:

- **No `Origin` header** (e.g., server-to-server `curl`, Postman): allowed through. This is intentional — non-browser clients don't send `Origin`.
- **Matching `Origin`**: allowed through.
- **Non-matching `Origin`**: returns `403 Forbidden` with `{ "error": "Origin not allowed" }`.

This prevents unauthorized websites from making cross-origin requests to the API using the user's browser cookies/credentials.

---

## Security Headers

Every response from protected routes includes:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | `DENY` | Prevents the page from being embedded in an iframe (clickjacking) |
| `X-Content-Type-Options` | `nosniff` | Prevents browsers from MIME-sniffing a response away from the declared content type |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Sends full URL as referrer for same-origin, only origin for cross-origin, nothing for downgrades (HTTP→HTTPS) |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disables access to camera, microphone, and geolocation APIs |

These headers are applied at the middleware level, so they are present on every API response regardless of which route handles the request.

---

## Database Security

- **Parameterized SQL only.** All queries use `@neondatabase/serverless` tagged template literals (`getSql()\`SELECT ... ${variable}\``), which bind parameters at the protocol level. No string concatenation or interpolation is used.
- **TLS required.** The connection string includes `sslmode=require`, enforcing encrypted connections to Neon.
- **Connection pooling.** Neon's serverless driver handles connection pooling automatically, preventing connection exhaustion.
- **No ORM, no query builder.** Raw SQL with explicit parameter binding — there is no abstraction layer that could introduce injection vectors.

---

## Payload Validation

`POST /api/logs` validates input before processing:

1. **Content-length check** — Rejects requests with `Content-Length > 1,048,576` (1 MB) before parsing the body.
2. **JSON parsing** — Catches malformed JSON and returns `400`.
3. **Type check** — Ensures the parsed body is a plain object (not an array, string, or null).
4. **Field validation** — Checks for the presence and type of `message` or `ciphertext`.
5. **Empty check** — Rejects whitespace-only messages.

---

## Out of Scope

The following are intentionally **not implemented** in this project:

| Feature | Rationale |
|---------|-----------|
| Authentication (JWT, OAuth, API keys) | The project focuses on edge middleware patterns, not identity. Adding auth would shift the scope significantly. |
| Authorization / RBAC | Follows from the absence of authentication. |
| `Content-Security-Policy` | This is an API, not a rendered HTML application. CSP protects against XSS in HTML responses, which this API doesn't produce. |
| `Strict-Transport-Security` (HSTS) | HTTPS enforcement is handled at the Vercel platform level, not by the application. Vercel redirects HTTP→HTTPS automatically. |
| CSRF protection | The API uses stateless JSON requests with no session cookies. CSRF attacks require session-based authentication to exploit. |
| Request logging / audit trail | The project uses `console.log` for debugging, not structured logging. Production observability is listed as a future improvement. |
| Input sanitization / HTML escaping | The API stores raw strings in PostgreSQL. Since it never renders HTML, XSS via stored content is not a vector. |

---

## Known Limitations

1. **Shared IP addresses.** Users behind corporate proxies or mobile carrier NAT share a single IP, causing them to share a rate limit bucket. This can lead to legitimate requests being rate-limited.
2. **Fixed-window counter.** As noted above, burst traffic across window boundaries can exceed the intended rate.
3. **No HSTS header.** While Vercel handles HTTP→HTTPS redirect at the platform level, adding `Strict-Transport-Security` would protect against SSL-stripping attacks if the API were ever deployed outside Vercel.
4. **`console.log` in production.** The middleware and routes contain debug logging (`[RateLimiter]`, `[RedisDebug]`). In production on Vercel, these appear in Function Logs but are not structured or retained long-term.

---

## Reporting Vulnerabilities

If you discover a security issue, please open a GitHub issue with the `[security]` tag. Do not disclose vulnerabilities publicly until a fix is available.
