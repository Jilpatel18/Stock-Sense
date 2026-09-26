import { NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/lib/db";
import { initDatabase } from "@/lib/schema";
import { hashPassword, comparePassword } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    await initDatabase();
    const body = await request.json();
    const { action, email, otp, newPassword } = body;

    // Action 1: Request OTP
    if (action === "request_otp") {
      if (!email) {
        return NextResponse.json({ error: "Email is required" }, { status: 400 });
      }

      const userRes = await query(`SELECT id, name FROM users WHERE email = $1`, [email]);
      if (userRes.rows.length === 0) {
        return NextResponse.json({ error: "No account found with this email" }, { status: 404 });
      }

      // Generate cryptographically secure random 6-digit OTP
      const generatedOtp = crypto.randomInt(100000, 999999).toString();
      const otpHash = await hashPassword(generatedOtp);

      // Invalidate previous unused OTPs for this email
      await query(
        `UPDATE password_reset_otps SET is_used = true WHERE email = $1 AND is_used = false`,
        [email]
      );

      // Store hashed OTP in PostgreSQL with 10-minute expiry
      await query(
        `INSERT INTO password_reset_otps (email, otp_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
        [email, otpHash]
      );

      // Development / Local console log fallback
      console.log(`\n==================================================`);
      console.log(`[STOCKSENSE RESET OTP] Email: ${email} | OTP: ${generatedOtp}`);
      console.log(`==================================================\n`);

      await logAuditEvent({
        userEmail: email,
        action: "OTP_REQUESTED",
      });

      return NextResponse.json({
        success: true,
        message: "Verification OTP generated and sent. (In dev mode, check your server log).",
      });
    }

    // Action 2: Verify OTP
    if (action === "verify_otp") {
      if (!email || !otp) {
        return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
      }

      const otpRes = await query(
        `SELECT * FROM password_reset_otps 
         WHERE email = $1 AND is_used = false AND expires_at > NOW() 
         ORDER BY created_at DESC LIMIT 1`,
        [email]
      );

      if (otpRes.rows.length === 0) {
        return NextResponse.json(
          { error: "OTP has expired or no reset request was found. Please request a new OTP." },
          { status: 400 }
        );
      }

      const record = otpRes.rows[0];

      if (record.attempts >= 5) {
        await query(`UPDATE password_reset_otps SET is_used = true WHERE id = $1`, [record.id]);
        return NextResponse.json(
          { error: "Too many failed attempts. Please request a new OTP." },
          { status: 400 }
        );
      }

      const isValid = await comparePassword(otp, record.otp_hash);

      if (!isValid) {
        await query(`UPDATE password_reset_otps SET attempts = attempts + 1 WHERE id = $1`, [record.id]);
        return NextResponse.json({ error: "Invalid OTP code. Please check and try again." }, { status: 400 });
      }

      // Mark verified
      await query(`UPDATE password_reset_otps SET is_verified = true WHERE id = $1`, [record.id]);

      await logAuditEvent({
        userEmail: email,
        action: "OTP_VERIFIED",
      });

      return NextResponse.json({
        success: true,
        message: "OTP verified successfully. You may now enter your new password.",
      });
    }

    // Action 3: Reset Password
    if (action === "reset_password") {
      if (!email || !newPassword) {
        return NextResponse.json({ error: "Email and new password are required" }, { status: 400 });
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 });
      }

      // Verify that there is a verified, un-used, non-expired OTP record
      const otpRes = await query(
        `SELECT * FROM password_reset_otps 
         WHERE email = $1 AND is_verified = true AND is_used = false AND expires_at > NOW() 
         ORDER BY created_at DESC LIMIT 1`,
        [email]
      );

      if (otpRes.rows.length === 0) {
        return NextResponse.json(
          { error: "OTP verification missing or session expired. Please verify your OTP again." },
          { status: 400 }
        );
      }

      const record = otpRes.rows[0];

      // Update password hash in users table
      const newHash = await hashPassword(newPassword);
      await query(
        `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2`,
        [newHash, email]
      );

      // Invalidate all OTPs for this email
      await query(`UPDATE password_reset_otps SET is_used = true WHERE email = $1`, [email]);

      await logAuditEvent({
        userEmail: email,
        action: "PASSWORD_RESET_SUCCESS",
      });

      return NextResponse.json({
        success: true,
        message: "Password reset successfully! You can now log in with your new password.",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
