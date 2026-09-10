import { NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET() {
  try {
    await db()`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "unhealthy" }, { status: 503 });
  }
}
