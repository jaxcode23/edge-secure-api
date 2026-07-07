export const runtime = "edge";

export async function GET(): Promise<Response> {
  return Response.json(
    {
      success: true,
      status: "ok",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
