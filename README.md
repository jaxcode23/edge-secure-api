# Edge Secure API

A production-grade Edge API built with Next.js, running on Vercel's Edge Runtime with serverless PostgreSQL and Redis rate limiting.

---

## Features

- **Edge Runtime** — Routes execute at the network edge for minimal latency
- **Serverless PostgreSQL** — Neon database with branching, autoscaling, and connection pooling
- **Distributed Rate Limiting** — Upstash Redis atomic counters for per-IP rate limiting (50 requests / 10s window)
- **CORS Enforcement** — Strict origin allowlist enforced in middleware
- **Security Headers** — X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy set on every response
- **Request Validation** — Payload size limits, JSON structure validation, and content-type checks
- **Encrypted Payload Support** — Accept and store opaque ciphertext without inspection
- **Type-Safe** — Full TypeScript coverage across the entire codebase
- **Tailwind CSS** — Utility-first styling for any admin UI or landing pages

---

## Architecture Overview

```
                         ┌──────────────┐
                         │   Client     │
                         └──────┬───────┘
                                │
                         ┌──────▼───────┐
                         │  Vercel Edge │
                         │   Runtime    │
                         └──────┬───────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
             ┌──────▼──────┐        ┌──────▼──────┐
             │    Neon     │        │  Upstash    │
             │ PostgreSQL  │        │   Redis     │
             └─────────────┘        └─────────────┘
```

Requests arrive at the Vercel Edge Network and are handled by Next.js middleware and API routes running on the Edge Runtime. The API connects to Neon PostgreSQL for persistent storage and Upstash Redis for rate-limiting state.

---

## Tech Stack

| Layer       | Technology                                        |
| ----------- | ------------------------------------------------- |
| Framework   | [Next.js](https://nextjs.org/) (App Router)       |
| Language    | [TypeScript](https://www.typescriptlang.org/)     |
| Runtime     | [Edge Runtime](https://nextjs.org/docs/app/api-reference/edge) |
| Styling     | [Tailwind CSS](https://tailwindcss.com/)          |
| Database    | [Neon](https://neon.tech/) (Serverless PostgreSQL)|
| Cache       | [Upstash Redis](https://upstash.com/)             |
| Deployment  | [Vercel](https://vercel.com/)                     |

---

## Folder Structure

```
edge-secure-api/
├── public/               # Static assets
├── src/
│   ├── app/              # App Router routes
│   │   ├── api/
│   │   │   ├── health/   # GET /api/health
│   │   │   └── logs/     # GET+POST /api/logs
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Landing/index page
│   ├── lib/
│   │   ├── db.ts         # Neon database client
│   │   └── redis.ts      # Upstash Redis client
│   └── middleware.ts     # Edge middleware (CORS, rate limiting, security headers)
├── .env.example          # Environment variable template
├── .gitignore
├── LICENSE
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

---

## Local Development

### Prerequisites

- Node.js 20+
- npm or yarn
- A [Neon](https://neon.tech/) project (free tier)
- An [Upstash Redis](https://upstash.com/) database (free tier)

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd edge-secure-api

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Fill in your credentials in .env.local (see table below)

# Start the development server
npm run dev
```

The server starts at `http://localhost:3000`.

---

## Environment Variables

| Variable              | Description                                    | Required |
| --------------------- | ---------------------------------------------- | -------- |
| `DATABASE_URL`        | Neon PostgreSQL connection string              | Yes      |
| `KV_REST_API_URL`     | Upstash Redis REST API endpoint                | Yes      |
| `KV_REST_API_TOKEN`   | Upstash Redis REST API token                   | Yes      |
| `ALLOWED_ORIGINS`     | Comma-separated list of allowed CORS origins   | Yes      |
| `NEXT_PUBLIC_APP_URL` | Public URL of the deployed instance            | No       |

See `.env.example` for the template.

---

## API Endpoints

### `GET /api/health`

Returns the current health status of the API.

**Response `200`**

```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2026-07-08T12:00:00.000Z"
}
```

---

### `GET /api/logs`

Retrieves all log entries ordered by creation date (newest first).

**Response `200`**

```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 2,
      "message": "Hello Edge",
      "created_at": "2026-07-08T12:01:00.000Z"
    },
    {
      "id": 1,
      "message": "System started",
      "created_at": "2026-07-08T12:00:00.000Z"
    }
  ]
}
```

**Response `500`**

```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

### `POST /api/logs`

Creates a new log entry. Supports two payload formats: standard message and encrypted payload.

#### Standard Message

**Request**

```json
{
  "message": "Hello Edge"
}
```

**Response `201`**

```json
{
  "success": true,
  "message": "Log created successfully",
  "data": {
    "id": 3,
    "message": "Hello Edge",
    "created_at": "2026-07-08T12:02:00.000Z"
  }
}
```

**Error `400`** — message is missing, not a string, or empty

```json
{
  "success": false,
  "error": "message is required"
}
```

```json
{
  "success": false,
  "error": "message must not be empty"
}
```

#### Encrypted Payload

**Request**

```json
{
  "encrypted": true,
  "ciphertext": "<opaque encrypted string>"
}
```

**Response `201`**

```json
{
  "success": true,
  "message": "Log created successfully",
  "data": {
    "id": 4,
    "message": "<opaque encrypted string>",
    "created_at": "2026-07-08T12:03:00.000Z"
  }
}
```

**Error `400`** — ciphertext is missing, not a string, or empty

```json
{
  "success": false,
  "error": "ciphertext is required"
}
```

#### Shared Errors (both formats)

**Error `413`** — request body exceeds 1 MB

```json
{
  "success": false,
  "error": "Payload too large"
}
```

**Error `400`** — malformed JSON

```json
{
  "success": false,
  "error": "Invalid JSON in request body"
}
```

**Error `400`** — valid JSON but not an object

```json
{
  "success": false,
  "error": "Request body must be a JSON object"
}
```

---

## Security Features

- **Edge Middleware** — Request inspection, header validation, and early rejection at the network edge
- **Rate Limiting** — Per-IP sliding-window rate limiting via Upstash Redis atomic counters (50 requests per 10 seconds)
- **CORS Enforcement** — Strict origin allowlist read from `ALLOWED_ORIGINS` environment variable; unknown origins receive a 403 response
- **Security Headers** — `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy` set on every API response
- **Payload Validation** — Request body size limited to 1 MB; JSON structure validated before processing
- **Fail-Open Resilience** — Rate limiter failures (e.g. Redis unavailable) allow requests through without returning 5xx errors

---

## Deployment

This project is designed to deploy seamlessly on Vercel.

### Prerequisites

- A [Neon](https://neon.tech/) project — create a free tier database and copy the connection string
- An [Upstash Redis](https://upstash.com/) database — create a free tier and copy `KV_REST_API_URL` and `KV_REST_API_TOKEN`

### Vercel CLI

```bash
# Install the Vercel CLI
npm install -g vercel

# Log in to your Vercel account
vercel login

# Link your project
vercel link

# Add environment variables (one at a time)
vercel env add DATABASE_URL
vercel env add KV_REST_API_URL
vercel env add KV_REST_API_TOKEN
vercel env add ALLOWED_ORIGINS
vercel env add NEXT_PUBLIC_APP_URL

# Pull environment variables locally
vercel env pull

# Deploy to production
vercel --prod
```

### Environment Variables

Add the same variables from `.env.example` to your Vercel project's environment settings (either via CLI above or the Vercel dashboard).

### Production Build

```bash
npm run build
npm run start
```

---

## Future Improvements

- [ ] Authentication and authorization (JWT / OAuth)
- [ ] Request validation with Zod
- [ ] Structured logging and observability
- [ ] Integration tests with Playwright or Supertest
- [ ] CI/CD pipeline with GitHub Actions
- [ ] Automated database migrations with Neon branching
- [ ] OpenAPI documentation

---

## License

[MIT](LICENSE) © 2026 Jash Ajmera
