import { NextResponse } from "next/server";
import { fetchAllRows } from "@/lib/sheets";
import { apiGuard, buildCorsHeaders } from "@/lib/apiGuard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Security: rate limit + cross-origin check
  const guard = apiGuard(request);
  if (guard) return guard;

  const corsHeaders = buildCorsHeaders(request);

  try {
    const { searchParams } = new URL(request.url);
    const itemName = searchParams.get("item");

    const allRows = await fetchAllRows();

    const filtered = itemName
      ? allRows.filter((r) => r.itemName === itemName)
      : allRows;

    // Sort ascending by timestamp for charting
    const sorted = [...filtered].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return NextResponse.json({ rows: sorted }, { headers: corsHeaders });
  } catch (err) {
    console.error("[/api/history]", err);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle preflight OPTIONS requests
export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(request),
  });
}
