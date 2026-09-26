import { NextResponse } from "next/server";
import { requireAuth, handleAuthError } from "@/lib/auth";
import { validateReceipt } from "@/lib/inventory-service";

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const params = await props.params;
    const id = parseInt(params.id);

    const result = await validateReceipt(id, user.id);

    return NextResponse.json(result);
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return NextResponse.json({ error: err.message || "Failed to validate receipt" }, { status: 400 });
  }
}
