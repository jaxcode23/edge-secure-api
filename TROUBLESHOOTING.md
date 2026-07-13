# Troubleshooting

Common issues and solutions when setting up or running Edge Secure API locally or in production.

---

## Neon PostgreSQL

### `Error: connection refused` or `ECONNREFUSED`

**Cause:** The `DATABASE_URL` is wrong, or Neon's compute endpoint is sleeping.

**Fix:**
1. Verify `DATABASE_URL` in `.env.local` matches the value in the Neon dashboard (Connect → Connection details).
2. Ensure `sslmode=require` is present in the connection string:
   ```
   postgresql://user:pass@ep-xxx-region.aws.neon.tech/neondb?sslmode=require
   ```
3. If the project has been idle, Neon suspends the compute endpoint. The first request wakes it (~1–2 s). Check the Neon dashboard — the endpoint status should show **Active**.

### `relation "logs" does not exist`

**Cause:** The database schema was never created.

**Fix:** Run the following SQL in the Neon SQL Editor (dashboard → SQL Editor):

```sql
CREATE TABLE IF NOT EXISTS logs (
  id SERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### `password authentication failed`

**Cause:** The password in `DATABASE_URL` is incorrect or was regenerated in the Neon dashboard.

**Fix:** Go to Neon dashboard → Reset the password → Copy the new connection string → Update `.env.local`.

### SSL errors in Edge Runtime

**Cause:** `sslmode=require` is missing from the connection string.

**Fix:** Append `?sslmode=require` (or `&sslmode=require` if other params exist) to the `DATABASE_URL`.

---

## Upstash Redis

### `UPSTASH_REDIS_REST_URL is not defined` or empty response

**Cause:** The environment variables are missing or misnamed.

**Fix:** Verify both variables are set in `.env.local`:
```
UPSTASH_REDIS_REST_URL="https://xxxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AXXX..."
```

Check the Upstash dashboard → your database → **REST API** section for the correct values.

### Rate limiter returns 200 for all requests (no 429s)

**Cause:** Redis is unreachable, and the middleware is failing open.

**Fix:**
1. Hit `/api/debug/redis` directly to test connectivity:
   ```bash
   curl https://your-project.vercel.app/api/debug/redis
   ```
2. Check the response — if `success` is `false`, the error message will indicate the issue (invalid token, network error, etc.).
3. In local development, verify that `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are correct and that your network allows HTTPS outbound requests to `*.upstash.io`.

### `ECONNREFUSED` or timeout in local development

**Cause:** Corporate firewall or proxy blocking outbound HTTPS to Upstash.

**Fix:** Check if your network allows outbound HTTPS on port 443 to `*.upstash.io`. Try:
```bash
curl https://your-upstash-url.upstash.io
```
If this fails, the issue is network-level, not application-level.

---

## CORS Errors

### `Origin not allowed` (403)

**Cause:** The `Origin` header sent by the browser doesn't match any entry in `ALLOWED_ORIGINS`.

**Fix:**
1. Check the exact origin in the browser's developer tools (Network tab → request headers → `Origin`).
2. Ensure `ALLOWED_ORIGINS` in `.env.local` includes that exact origin (protocol, domain, port):
   ```
   ALLOWED_ORIGINS="http://localhost:3000,https://edge-secure-api.vercel.app"
   ```
3. **Common mistakes:**
   - Trailing whitespace or characters after the URL (e.g., `https://app.vercel.appY`)
   - Missing port number (e.g., `http://localhost` instead of `http://localhost:3000`)
   - Trailing slash (use `https://app.vercel.app`, not `https://app.vercel.app/`)
   - HTTP instead of HTTPS (or vice versa)

### `curl` requests work but browser requests get 403

**Cause:** Browsers send the `Origin` header on cross-origin requests; `curl` does not. The middleware allows requests without an `Origin` header, but blocks requests with a non-matching one.

**Fix:** If testing from a browser at `http://localhost:3000`, add it to `ALLOWED_ORIGINS`:
```
ALLOWED_ORIGINS="http://localhost:3000"
```

### CORS works locally but fails in production

**Cause:** `ALLOWED_ORIGINS` is not set in Vercel's environment variables.

**Fix:** Add the variable in the Vercel dashboard (Project Settings → Environment Variables) or via CLI:
```bash
vercel env add ALLOWED_ORIGINS production
```
Value: `https://your-project.vercel.app`

---

## Edge Runtime

### `Error: Module not found` or Node.js API errors

**Cause:** Edge Runtime does not support Node.js built-in modules (`fs`, `crypto`, `path`, `buffer`, etc.).

**Fix:** Edge Runtime only supports Web-standard APIs (`fetch`, `Request`, `Response`, `crypto.subtle`, etc.). If you need a Node.js API, use a Node.js runtime route instead:
```ts
export const runtime = "nodejs"; // Not "edge"
```

### `Dynamic requires of "xyz" are not supported`

**Cause:** A dependency uses `require()` with a dynamic path, which Edge Runtime cannot bundle.

**Fix:** This is a bundler limitation. The dependency must be pre-bundled or replaced with an Edge-compatible alternative.

### Middleware doesn't run for `/api/debug/redis`

**This is expected.** The middleware matcher is configured as:
```ts
matcher: ['/api/((?!debug).*)']
```
This excludes `/api/debug/*` routes from CORS and rate limiting. The debug endpoint is intentionally unprotected for diagnostics.

---

## Load Testing

### All 60 requests return 200 (no 429s)

**Cause:** The rate limiter is not functioning (Redis unreachable, failing open) or the requests are not truly concurrent.

**Fix:**
1. Verify Redis is working: `curl /api/debug/redis`
2. Ensure you're using the load test scripts (not sequential `curl` commands).
3. Check that `RATE_LIMIT_MAX` (50) is lower than your `CONCURRENCY` (60) in the test script.

### Results fluctuate between runs

**This is normal.** Network timing, Redis latency, and Node.js scheduling mean the exact split varies. As long as you see *some* 429s (typically 5–15), the rate limiter is working. The total (200 + 429) should equal 60.

### Load test targets wrong endpoint

The default target is `https://edge-secure-api.vercel.app/api/logs`. Override it with the `TARGET` environment variable:
```bash
TARGET=http://localhost:3000/api/logs node tests/load-test.mjs
```

---

## Vercel Deployment

### Build fails with `Module not found` in edge function

**Cause:** A dependency in the edge bundle is not Edge Runtime compatible.

**Fix:** Check the build output for which module is failing. Common culprits:
- `mysql2`, `pg` (use `@neondatabase/serverless` instead)
- `ioredis` (use `@upstash/redis` instead)
- Any package that uses Node.js `child_process`, `fs`, or `net`

### Environment variables not available at runtime

**Cause:** Variables prefixed with `NEXT_PUBLIC_` are bundled into client code. Variables without the prefix are only available server-side. Ensure sensitive keys (DATABASE_URL, Redis tokens) do **not** have the `NEXT_PUBLIC_` prefix.

### Function times out

**Cause:** Neon compute is sleeping (cold start) or the query is slow.

**Fix:** Neon free-tier compute has a ~1–2 s cold start. This is expected. For production, consider keeping the compute active or upgrading the Neon plan.

---

## Local Development

### `npm run dev` starts but endpoints return 500

1. Check the terminal for error messages — they will indicate whether it's a database or Redis issue.
2. Verify `.env.local` exists and contains all required variables (copy from `.env.example`).
3. Run `npm run lint` to check for configuration errors.

### Port 3000 already in use

```bash
npx kill-port 3000
npm run dev
```

Or use a different port:
```bash
npm run dev -- -p 3001
```
