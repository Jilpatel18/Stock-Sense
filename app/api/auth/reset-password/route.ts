import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { initDatabase } from "@/lib/schema";
import { hashPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    await initDatabase();
    const body = await request.json();
    const { action, email, otp, newPassword } = body;

    if (action === "request_otp") {
      if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
      const userRes = await query(`SELECT id FROM users WHERE email = $1`, [email]);
      if (userRes.rows.length === 0) {
        return NextResponse.json({ error: "No account found with this email" }, { status: 404 });
      }
      // Demo OTP (fixed to 123456 or generated for demonstration)
      return NextResponse.json({
        success: true,
        message: "OTP sent to your email. (For demo testing, use OTP: 123456)",
        demoOtp: "123456",
      });
    }

    if (action === "reset_password") {
      if (!email || !otp || !newPassword) {
        return NextResponse.json({ error: "Email, OTP, and new password are required" }, { status: 400 });
      }
      if (otp !== "123456") {
        return NextResponse.json({ error: "Invalid OTP code" }, { status: 400 });
      }

      const newHash = await hashPassword(newPassword);
      await query(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2`, [newHash, email]);

      return NextResponse.json({ success: true, message: "Password reset successfully! You can now log in." });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
