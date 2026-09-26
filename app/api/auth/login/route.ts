import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { initDatabase } from "@/lib/schema";
import { comparePassword, setSessionCookie } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    await initDatabase();
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const res = await query(`SELECT * FROM users WHERE email = $1`, [email]);
    if (res.rows.length === 0) {
      await logAuditEvent({
        userEmail: email,
        action: "LOGIN_FAILED",
        details: { reason: "User not found" },
      });
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const user = res.rows[0];
    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      await logAuditEvent({
        userId: user.id,
        userEmail: email,
        action: "LOGIN_FAILED",
        details: { reason: "Password mismatch" },
      });
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (user.status === "INACTIVE") {
      return NextResponse.json({ error: "Account deactivated. Contact system administrator." }, { status: 403 });
    }

    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    await setSessionCookie(userPayload);
    await logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      action: "LOGIN_SUCCESS",
    });

    return NextResponse.json({ success: true, user: userPayload });
  } catch (err: any) {
    console.error("Login API error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
