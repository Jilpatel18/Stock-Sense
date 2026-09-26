import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { validateDelivery } from "@/lib/inventory-service";

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    const params = await props.params;
    const id = parseInt(params.id);

    const userId = user?.id || 1;
    const result = await validateDelivery(id, userId);

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to validate delivery" }, { status: 400 });
  }
}
