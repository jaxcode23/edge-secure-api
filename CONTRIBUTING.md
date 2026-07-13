# Contributing

Guide for developing, extending, and contributing to Edge Secure API.

---

## Prerequisites

- Node.js 18+ (for built-in `fetch` in load tests)
- npm
- A [Neon](https://neon.tech/) PostgreSQL account (free tier)
- An [Upstash Redis](https://upstash.com/) account (free tier)

---

## Setup

```bash
git clone <repository-url>
cd edge-secure-api
npm install
cp .env.example .env.local
```

Fill in your credentials in `.env.local`, then:

```bash
npm run dev
```

The server starts at `http://localhost:3000`.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build |
| `npm run start` | Production server (after build) |
| `npm run lint` | ESLint |

Always run `npm run lint` before committing.

---

## Project Conventions

### Edge Runtime

All API routes run on Vercel's Edge Runtime. This means:

- **No Node.js built-ins** — no `fs`, `crypto` (use `crypto.subtle`), `path`, `child_process`, `net`, `buffer`.
- **Web-standard APIs only** — `fetch`, `Request`, `Response`, `URL`, `TextEncoder`, `crypto.subtle`.
- Every route file must export:
  ```ts
  export const runtime = "edge";
  ```

### Error Responses

All error responses follow a consistent shape:

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

Success responses include `"success": true` and endpoint-specific data. Keep this pattern when adding new endpoints.

### Database Access

Use the shared SQL client singleton:

```ts
import { getSql } from "@/lib/db";

const rows = await getSql()`
  SELECT id, message, created_at
  FROM logs
  WHERE id = ${id}
`;
```

**Never** construct SQL via string concatenation. Always use tagged template literals for parameterized queries.

### Redis Access

Use the shared Redis client singleton:

```ts
import { getRedis } from "@/lib/redis";

const redis = getRedis();
const value = await redis.get("key");
```

### Singleton Pattern

Both `db.ts` and `redis.ts` use lazy-initialized singletons. This is intentional — one client instance per worker avoids connection exhaustion in Edge Runtime. Follow this pattern for any new external service clients.

---

## Adding a New API Route

1. Create a route file under `src/app/api/<path>/route.ts`:

   ```ts
   import { getSql } from "@/lib/db";

   export const runtime = "edge";

   export async function GET(): Promise<Response> {
     try {
       const rows = (await getSql()`SELECT ...`) as unknown[];
       return Response.json({ success: true, data: rows }, { status: 200 });
     } catch {
       return Response.json(
         { success: false, error: "Internal server error" },
         { status: 500 }
       );
     }
   }
   ```

2. If the route should be rate-limited and CORS-protected, ensure the middleware matcher includes it (the default matcher `/api/((?!debug).*)` covers all routes except `/api/debug/*`).

3. If the route should **bypass** middleware (like the debug endpoint), add an exclusion to the matcher in `src/middleware.ts`:
   ```ts
   matcher: ['/api/((?!debug|myroute).*)'],
   ```

---

## Running Load Tests

Two scripts verify the rate limiter under concurrent load:

```bash
# Node.js (requires Node.js 18+)
node tests/load-test.mjs

# PowerShell (requires PowerShell 7+)
pwsh -File tests/load-test.ps1
```

Override the target URL:

```bash
TARGET=http://localhost:3000/api/logs node tests/load-test.mjs
```

**Expected result:** ~50 requests return `200`, ~10 return `429`. Variation is normal due to network timing.

---

## Commit Conventions

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>
```

**Types:**
- `feat` — New feature or endpoint
- `fix` — Bug fix
- `docs` — Documentation only
- `refactor` — Code change that neither fixes a bug nor adds a feature
- `chore` — Tooling, dependencies, configuration

**Examples:**
```
docs: add security overview document
feat: add pagination to GET /api/logs
fix: handle Redis timeout in rate limiter
chore: update Next.js to 15.5
```

---

## Adding Database Tables

1. Write the `CREATE TABLE` migration as raw SQL.
2. Run it manually in the Neon SQL Editor (no migration framework is configured).
3. Update any route handlers that need the new table.
4. Document the schema in the README under the Deployment section.

---

## Code Style

- TypeScript strict mode is enabled.
- No semicolons are used in the existing codebase — follow this convention.
- Error responses use `{ success: false, error: "..." }`, never raw `throw` in route handlers.
- All external service clients use the lazy singleton pattern (`getSql()`, `getRedis()`).
- Console logging uses bracket-prefixed tags: `[RateLimiter]`, `[RedisDebug]`, etc.
