import { getRedis } from "@/lib/redis";

export const runtime = "edge";

export async function GET(): Promise<Response> {
  const startedAt = Date.now();
  console.log("[RedisDebug] route invoked");

  let redisInitMs = 0;
  let pingMs = 0;
  let setMs = 0;
  let getMs = 0;

  try {
    const t0 = Date.now();
    console.log("[RedisDebug] initializing Redis...");
    const redis = getRedis();
    redisInitMs = Date.now() - t0;
    console.log("[RedisDebug] Redis init took", redisInitMs, "ms");

    const t1 = Date.now();
    console.log("[RedisDebug] sending PING...");
    const ping = await redis.ping();
    pingMs = Date.now() - t1;
    console.log("[RedisDebug] PING took", pingMs, "ms — result:", ping);

    const t2 = Date.now();
    console.log("[RedisDebug] sending SET debug:diagnostic ok...");
    const setResult = await redis.set("debug:diagnostic", "ok");
    setMs = Date.now() - t2;
    console.log("[RedisDebug] SET took", setMs, "ms — result:", setResult);

    const t3 = Date.now();
    console.log("[RedisDebug] sending GET debug:diagnostic...");
    const getResult = await redis.get("debug:diagnostic");
    getMs = Date.now() - t3;
    console.log("[RedisDebug] GET took", getMs, "ms — result:", getResult);

    const total = Date.now() - startedAt;
    console.log("[RedisDebug] total elapsed:", total, "ms");

    return Response.json({
      success: true,
      env: {
        urlPresent: Boolean(process.env.UPSTASH_REDIS_REST_URL),
        tokenPresent: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN),
      },
      elapsed: {
        total: total,
        redisInit: redisInitMs,
        ping: pingMs,
        set: setMs,
        get: getMs,
      },
      result: {
        ping,
        set: setResult,
        get: getResult,
      },
    });
  } catch (error) {
    const total = Date.now() - startedAt;
    console.error("[RedisDebug] ERROR:", error);
    console.log("[RedisDebug] error constructor:", (error as any)?.constructor?.name);
    console.log("[RedisDebug] error message:", (error as any)?.message);
    console.log("[RedisDebug] error stack:", (error as any)?.stack);

    return Response.json(
      {
        success: false,
        env: {
          urlPresent: Boolean(process.env.UPSTASH_REDIS_REST_URL),
          tokenPresent: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN),
        },
        elapsed: {
          total: total,
          redisInit: redisInitMs,
          ping: pingMs,
          set: setMs,
          get: getMs,
        },
        error: (error as any)?.message ?? String(error),
        constructor: (error as any)?.constructor?.name ?? typeof error,
      },
      { status: 500 },
    );
  }
}
