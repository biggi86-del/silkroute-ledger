import { NextResponse } from "next/server";
import { fetchAllRows } from "@/lib/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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

    return NextResponse.json({ rows: sorted });
  } catch (err) {
    console.error("[/api/history]", err);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
