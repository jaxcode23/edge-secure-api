import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

export const config = {
  matcher: ['/api/((?!debug).*)'],
};

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const RATE_LIMIT_WINDOW = 10;
const RATE_LIMIT_MAX = 50;

const CORS_ERROR = JSON.stringify({
  success: false,
  error: "Origin not allowed",
});
const RATE_LIMIT_ERROR = JSON.stringify({
  success: false,
  error: "Too many requests",
});

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "127.0.0.1";
}

function checkCors(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  if (!origin || ALLOWED_ORIGINS.includes(origin)) {
    return null;
  }
  return new NextResponse(CORS_ERROR, {
    status: 403,
    headers: { "content-type": "application/json" },
  });
}

function buildSecurityHeaders(): Record<string, string> {
  return {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}

function applySecurityHeaders(response: NextResponse): void {
  const headers = buildSecurityHeaders();
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  console.log("[RateLimiter] middleware invoked");

  const url = request.nextUrl.pathname;
  console.log("[RateLimiter] URL:", url);

  const corsResponse = checkCors(request);
  if (corsResponse) {
    return corsResponse;
  }

  const ip = getClientIp(request);
  const key = `ratelimit:${ip}`;
  console.log("[RateLimiter] Client IP:", ip);
  console.log("[RateLimiter] Key:", key);

  try {
    const redis = getRedis();
    console.log("[RateLimiter] Redis instance obtained");
    const count = await redis.incr(key);
    console.log("[RateLimiter] Redis count:", count, "for key:", key);
    if (count === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW);
      console.log("[RateLimiter] EXPIRE set for key:", key);
    }
    if (count > RATE_LIMIT_MAX) {
      console.log("[RateLimiter] Limit exceeded — returning 429 for key:", key);
      return new NextResponse(RATE_LIMIT_ERROR, {
        status: 429,
        headers: { "content-type": "application/json" },
      });
    }
  } catch (error) {
    console.error("[RateLimiter] Redis error:", error);
    console.log("[RateLimiter] error constructor:", (error as any)?.constructor?.name);
    console.log("[RateLimiter] error stack:", (error as any)?.stack);
    // fail open — rate limiter unavailable, allow request through
  }

  const response = NextResponse.next();
  applySecurityHeaders(response);
  return response;
}
