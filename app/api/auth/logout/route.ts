import { NextResponse } from "next/server";
import { clearSessionCookie, getCurrentUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (user) {
      await logAuditEvent({
        userId: user.id,
        userEmail: user.email,
        action: "LOGOUT",
      });
    }
    await clearSessionCookie();
    return NextResponse.json({ success: true, message: "Logged out successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to logout" }, { status: 500 });
  }
}
