# Edge Secure API

A production-grade Edge API built with Next.js, running on Vercel's Edge Runtime with serverless PostgreSQL and Redis caching.

---

## Features

- **Edge Runtime** — Routes execute at the network edge for minimal latency
- **Serverless PostgreSQL** — Neon database with branching, autoscaling, and connection pooling
- **Redis Caching** — Upstash Redis for rate limiting, session storage, and hot-data caching
- **Type-Safe** — Full TypeScript coverage across the entire codebase
- **Tailwind CSS** — Utility-first styling for any admin UI or landing pages

> **Note:** Application-level features (auth, rate limiting, observability) are marked as _[Planned]_ and will be implemented in subsequent iterations.

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

Requests arrive at the Vercel Edge Network and are handled by Next.js middleware and API routes running on the Edge Runtime. The API connects to Neon PostgreSQL for persistent storage and Upstash Redis for caching and rate-limiting state.

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
├── .github/              # GitHub Actions workflows (Planned)
├── public/               # Static assets
├── src/
│   ├── app/              # App Router routes
│   │   ├── api/          # API route handlers
│   │   │   └── v1/       # Versioned endpoints
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Landing/index page
│   ├── components/       # Shared UI components
│   ├── lib/              # Shared utilities and configurations
│   │   ├── db.ts         # Neon database client
│   │   ├── redis.ts      # Upstash Redis client
│   │   └── middleware.ts # Edge middleware (Planned)
│   └── types/            # Shared TypeScript types
├── .env.example          # Environment variable template
├── .gitignore
├── LICENSE
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

> **Note:** Some directories are placeholders for future implementation.

---

## Local Development

### Prerequisites

- Node.js 20+
- pnpm (recommended), npm, or yarn
- A [Neon](https://neon.tech/) project (free tier)
- An [Upstash Redis](https://upstash.com/) database (free tier)

### Setup

```bash
# Clone the repository
git clone https://github.com/JashAjmera/edge-secure-api.git
cd edge-secure-api

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Fill in your credentials in .env.local (see table below)

# Start the development server
pnpm dev
```

The server starts at `http://localhost:3000`.

---

## Environment Variables

| Variable              | Description                          | Required |
| --------------------- | ------------------------------------ | -------- |
| `DATABASE_URL`        | Neon PostgreSQL connection string    | Yes      |
| `KV_REST_API_URL`     | Upstash Redis REST API endpoint      | Yes      |
| `KV_REST_API_TOKEN`   | Upstash Redis REST API token         | Yes      |
| `NEXT_PUBLIC_APP_URL` | Public URL of the deployed instance  | No       |

See `.env.example` for the template.

---

## API Endpoints

> Endpoints will be documented as they are implemented. Below is a placeholder structure.

| Method | Path              | Description                          |
| ------ | ----------------- | ------------------------------------ |
| GET    | `/api/v1/health`  | Health check                         |
| ...    | ...               | _(Future endpoints)_                 |

---

## Security Features

- **Edge Middleware** _(Planned)_ — Request inspection, header validation, and early rejection at the network edge
- **Rate Limiting** _(Planned)_ — Token-bucket or sliding-window rate limiting via Upstash Redis
- **Input Validation** _(Planned)_ — Zod schemas for request body and parameter validation
- **CORS** _(Planned)_ — Strict origin allowlist enforced via middleware
- **Helmet-style Headers** _(Planned)_ — Security headers set at the edge

---

## Deployment

This project is designed to deploy seamlessly on Vercel.

### Automatic Deploy

Connect your GitHub repository to [Vercel](https://vercel.com/new). Vercel detects the Next.js framework automatically.

### Environment Variables

Add the same variables from `.env.example` to your Vercel project's environment settings.

### Production Build

```bash
pnpm build
pnpm start
```

---

## Future Improvements

- [ ] Authentication and authorization (JWT / OAuth)
- [ ] Rate limiting with Upstash Redis
- [ ] Request validation with Zod
- [ ] Structured logging and observability
- [ ] Integration tests with Playwright or Supertest
- [ ] CI/CD pipeline with GitHub Actions
- [ ] Automated database migrations with Neon branching
- [ ] OpenAPI documentation

---

## License

[MIT](LICENSE) © 2026 Jash Ajmera
