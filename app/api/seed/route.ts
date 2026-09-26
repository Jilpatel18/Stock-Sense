import { NextResponse } from "next/server";
import { seedDemoData } from "@/lib/seed-service";
import { requireManager, handleAuthError } from "@/lib/auth";

export async function POST() {
  try {
    await requireManager();
    const result = await seedDemoData();
    return NextResponse.json(result);
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    console.error("Seed API error:", err);
    return NextResponse.json({ error: err.message || "Failed to seed demo data" }, { status: 500 });
  }
}
