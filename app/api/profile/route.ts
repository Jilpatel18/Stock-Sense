import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { initDatabase } from "@/lib/schema";
import { requireAuth, comparePassword, hashPassword, setSessionCookie, handleAuthError } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { validatePasswordPolicy } from "@/lib/password-policy";

export async function GET() {
  try {
    await initDatabase();
    const currentUser = await requireAuth();

    const res = await query(`SELECT id, name, email, role, status, created_at FROM users WHERE id = $1`, [
      currentUser.id,
    ]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: res.rows[0] });
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return NextResponse.json({ error: err.message || "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await initDatabase();
    const currentUser = await requireAuth();
    const { name, currentPassword, newPassword } = await request.json();

    const userRes = await query(`SELECT * FROM users WHERE id = $1`, [currentUser.id]);
    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const dbUser = userRes.rows[0];

    let updatedName = dbUser.name;
    if (name && typeof name === "string" && name.trim()) {
      updatedName = name.trim();
      await query(`UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2`, [updatedName, currentUser.id]);
    }

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Current password is required to set a new password." }, { status: 400 });
      }

      const isMatch = await comparePassword(currentPassword, dbUser.password_hash);
      if (!isMatch) {
        return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
      }

      const policyError = validatePasswordPolicy(newPassword);
      if (policyError) {
        return NextResponse.json({ error: policyError }, { status: 400 });
      }

      const newHash = await hashPassword(newPassword);
      await query(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [newHash, currentUser.id]);

      await logAuditEvent({
        userId: currentUser.id,
        userEmail: currentUser.email,
        action: "PASSWORD_CHANGED",
      });
    }

    const updatedPayload = {
      id: dbUser.id,
      name: updatedName,
      email: dbUser.email,
      role: dbUser.role,
    };

    await setSessionCookie(updatedPayload);

    await logAuditEvent({
      userId: currentUser.id,
      userEmail: currentUser.email,
      action: "PROFILE_UPDATED",
      details: { name: updatedName },
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
      user: updatedPayload,
    });
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return NextResponse.json({ error: err.message || "Failed to update profile" }, { status: 500 });
  }
}
