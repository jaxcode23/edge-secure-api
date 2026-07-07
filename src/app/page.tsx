export default function Home() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Edge Secure API</h1>
        <p className="text-neutral-600">
          Production-grade Edge API — Next.js App Router, Edge Runtime, Neon
          PostgreSQL, Upstash Redis
        </p>
      </div>

      <section className="w-full max-w-md space-y-2">
        <h2 className="text-lg font-semibold">Available Endpoints</h2>
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
          <li className="flex items-center justify-between px-4 py-3">
            <code className="text-sm font-mono">GET /api/health</code>
            <span className="text-xs text-neutral-500">Health check</span>
          </li>
          <li className="flex items-center justify-between px-4 py-3">
            <code className="text-sm font-mono">GET /api/logs</code>
            <span className="text-xs text-neutral-500">Logs (placeholder)</span>
          </li>
        </ul>
      </section>
    </main>
  );
}
