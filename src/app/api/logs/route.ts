import { getSql } from "@/lib/db";

export const runtime = "edge";

const MAX_PAYLOAD_SIZE = 1_048_576; // 1 MB

interface LogRow {
  id: number;
  message: string;
  created_at: string;
}

export async function GET(): Promise<Response> {
  try {
    const rows = (await getSql()`
      SELECT id, message, created_at
      FROM logs
      ORDER BY created_at DESC
    `) as LogRow[];

    return Response.json(
      {
        success: true,
        count: rows.length,
        data: rows,
      },
      { status: 200 }
    );
  } catch {
    return Response.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  console.log("POST handler reached");
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (!isNaN(size) && size > MAX_PAYLOAD_SIZE) {
      return Response.json(
        { success: false, error: "Payload too large" },
        { status: 413 }
      );
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  if (typeof body !== "object" || body === null) {
    return Response.json(
      { success: false, error: "Request body must be a JSON object" },
      { status: 400 }
    );
  }

  const data = body as Record<string, unknown>;

  if (data.encrypted === true) {
    const { ciphertext } = data;
    if (typeof ciphertext !== "string" || ciphertext === "") {
      return Response.json(
        { success: false, error: "ciphertext is required" },
        { status: 400 }
      );
    }

    try {
      const rows = (await getSql()`
        INSERT INTO logs (message)
        VALUES (${ciphertext})
        RETURNING id, message, created_at
      `) as LogRow[];

      return Response.json(
        {
          success: true,
          message: "Log created successfully",
          data: rows[0],
        },
        { status: 201 }
      );
    } catch {
      return Response.json(
        { success: false, error: "Internal server error" },
        { status: 500 }
      );
    }
  }

  if (typeof data.message !== "string") {
    return Response.json(
      { success: false, error: "message is required" },
      { status: 400 }
    );
  }

  if (data.message.trim() === "") {
    return Response.json(
      { success: false, error: "message must not be empty" },
      { status: 400 }
    );
  }

  try {
    const rows = (await getSql()`
      INSERT INTO logs (message)
      VALUES (${data.message})
      RETURNING id, message, created_at
    `) as LogRow[];

    return Response.json(
      {
        success: true,
        message: "Log created successfully",
        data: rows[0],
      },
      { status: 201 }
    );
  } catch {
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
