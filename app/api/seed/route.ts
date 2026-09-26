import { NextResponse } from "next/server";
import { seedDemoData } from "@/lib/seed-service";

export async function POST() {
  try {
    const result = await seedDemoData();
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Seed API error:", err);
    return NextResponse.json({ error: err.message || "Failed to seed demo data" }, { status: 500 });
  }
}
