import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { initDatabase } from "@/lib/schema";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    await initDatabase();
    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 });
    }

    const existing = await query(`SELECT id FROM users WHERE email = $1`, [email]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
    }

    // Public signup ALWAYS defaults to WAREHOUSE_STAFF (Server-side RBAC protection)
    const userRole = "WAREHOUSE_STAFF";
    const passwordHash = await hashPassword(password);

    const res = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
      [name, email, passwordHash, userRole]
    );

    const user = res.rows[0];
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
      action: "USER_SIGNUP",
      details: { role: user.role },
    });

    return NextResponse.json({ success: true, user: userPayload });
  } catch (err: any) {
    console.error("Signup API error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
