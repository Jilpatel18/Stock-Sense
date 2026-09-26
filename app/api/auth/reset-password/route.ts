import { NextResponse } from "next/server";
import crypto from "crypto";
import { query, pool } from "@/lib/db";
import { initDatabase } from "@/lib/schema";
import { hashPassword, comparePassword } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { sendPasswordResetOtp } from "@/lib/email";
import { validatePasswordPolicy } from "@/lib/password-policy";

export async function POST(request: Request) {
  try {
    await initDatabase();
    const body = await request.json();
    const { action, email, otp, newPassword } = body;

    // Action 1: Request OTP (with Rate Limiting & Anti-Enumeration)
    if (action === "request_otp") {
      if (!email || typeof email !== "string") {
        return NextResponse.json({ error: "Email is required" }, { status: 400 });
      }

      const trimmedEmail = email.trim().toLowerCase();

      // Rate limit check: Maximum 3 requests within 15 minutes
      const rateCheck = await query(
        `SELECT COUNT(*) FROM password_reset_otps 
         WHERE email = $1 AND created_at >= NOW() - INTERVAL '15 minutes'`,
        [trimmedEmail]
      );
      const requestCount = parseInt(rateCheck.rows[0].count);

      if (requestCount >= 3) {
        return NextResponse.json(
          { error: "Too many OTP requests for this email. Please wait 15 minutes before trying again." },
          { status: 429 }
        );
      }

      // Check account existence
      const userRes = await query(`SELECT id FROM users WHERE email = $1`, [trimmedEmail]);
      if (userRes.rows.length > 0) {
        // Generate 6-digit OTP
        const generatedOtp = crypto.randomInt(100000, 999999).toString();
        const otpHash = await hashPassword(generatedOtp);

        // Invalidate prior active OTPs for email
        await query(
          `UPDATE password_reset_otps SET is_used = true WHERE email = $1 AND is_used = false`,
          [trimmedEmail]
        );

        // Store hashed OTP with 10-minute expiry
        await query(
          `INSERT INTO password_reset_otps (email, otp_hash, expires_at)
           VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
          [trimmedEmail, otpHash]
        );

        // Send OTP via email abstraction
        await sendPasswordResetOtp(trimmedEmail, generatedOtp);

        await logAuditEvent({
          userEmail: trimmedEmail,
          action: "OTP_REQUESTED",
        });
      }

      // Safe anti-enumeration generic response
      return NextResponse.json({
        success: true,
        message: "If an account exists for this email, a verification OTP has been sent.",
      });
    }

    // Action 2: Verify OTP
    if (action === "verify_otp") {
      if (!email || !otp) {
        return NextResponse.json({ error: "Email and OTP code are required" }, { status: 400 });
      }

      const trimmedEmail = email.trim().toLowerCase();

      const otpRes = await query(
        `SELECT * FROM password_reset_otps 
         WHERE email = $1 AND is_used = false AND expires_at > NOW() 
         ORDER BY created_at DESC LIMIT 1`,
        [trimmedEmail]
      );

      if (otpRes.rows.length === 0) {
        return NextResponse.json(
          { error: "OTP has expired or no active reset request exists. Please request a new OTP." },
          { status: 400 }
        );
      }

      const record = otpRes.rows[0];

      if (record.attempts >= 5) {
        await query(`UPDATE password_reset_otps SET is_used = true WHERE id = $1`, [record.id]);
        return NextResponse.json(
          { error: "Too many failed verification attempts. Please request a new OTP." },
          { status: 400 }
        );
      }

      const isValid = await comparePassword(otp, record.otp_hash);

      if (!isValid) {
        await query(`UPDATE password_reset_otps SET attempts = attempts + 1 WHERE id = $1`, [record.id]);
        return NextResponse.json(
          { error: "Invalid OTP code. Please check and try again." },
          { status: 400 }
        );
      }

      // Mark verified
      await query(`UPDATE password_reset_otps SET is_verified = true WHERE id = $1`, [record.id]);

      await logAuditEvent({
        userEmail: trimmedEmail,
        action: "OTP_VERIFIED",
      });

      return NextResponse.json({
        success: true,
        message: "OTP verified successfully. You may now enter your new password.",
      });
    }

    // Action 3: Atomic Reset Password
    if (action === "reset_password") {
      if (!email || !newPassword) {
        return NextResponse.json({ error: "Email and new password are required" }, { status: 400 });
      }

      const trimmedEmail = email.trim().toLowerCase();

      // Password policy validation
      const policyError = validatePasswordPolicy(newPassword);
      if (policyError) {
        return NextResponse.json({ error: policyError }, { status: 400 });
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // 1. Lock verified OTP row (FOR UPDATE)
        const otpRes = await client.query(
          `SELECT * FROM password_reset_otps 
           WHERE email = $1 AND is_verified = true AND is_used = false AND expires_at > NOW() 
           ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
          [trimmedEmail]
        );

        if (otpRes.rows.length === 0) {
          throw new Error("OTP verification missing, expired, or already used. Please request a new OTP.");
        }

        const record = otpRes.rows[0];

        // 2. Update password hash
        const newHash = await hashPassword(newPassword);
        await client.query(
          `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2`,
          [newHash, trimmedEmail]
        );

        // 3. Mark OTP as used
        await client.query(
          `UPDATE password_reset_otps SET is_used = true WHERE email = $1`,
          [trimmedEmail]
        );

        // 4. Record audit event inside transaction
        await client.query(
          `INSERT INTO audit_logs (user_email, action, details, created_at)
           VALUES ($1, 'PASSWORD_RESET_SUCCESS', $2, NOW())`,
          [trimmedEmail, JSON.stringify({ otp_id: record.id })]
        );

        await client.query("COMMIT");
        return NextResponse.json({
          success: true,
          message: "Password reset successfully! You can now log in with your new password.",
        });
      } catch (err: any) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: err.message || "Failed to reset password" }, { status: 400 });
      } finally {
        client.release();
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
