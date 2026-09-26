import nodemailer from "nodemailer";

export async function sendPasswordResetOtp(email: string, otp: string): Promise<boolean> {
  const provider = process.env.EMAIL_PROVIDER || (process.env.NODE_ENV === "production" ? "smtp" : "console");
  const fromAddress = process.env.EMAIL_FROM || "no-reply@stocksense.com";

  if (provider === "console" || process.env.NODE_ENV !== "production") {
    console.log(`\n==================================================`);
    console.log(`[STOCKSENSE EMAIL DISPATCH - CONSOLE FALLBACK]`);
    console.log(`To: ${email}`);
    console.log(`From: ${fromAddress}`);
    console.log(`Subject: StockSense Security Verification OTP`);
    console.log(`Body: Your OTP code is ${otp}. It will expire in 10 minutes.`);
    console.log(`==================================================\n`);
    return true;
  }

  // Production SMTP email dispatch via nodemailer
  try {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "587");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (!host || !user || !pass) {
      console.error("[STOCKSENSE EMAIL ERROR] Missing SMTP credentials in production environment.");
      return false;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    const info = await transporter.sendMail({
      from: `StockSense IMS <${fromAddress}>`,
      to: email,
      subject: "StockSense Password Reset Verification OTP",
      text: `Your StockSense password reset verification OTP is ${otp}. This code is valid for 10 minutes. If you did not request a password reset, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 16px; background-color: #ffffff;">
          <h2 style="color: #09090b; font-size: 20px; font-weight: 800; margin-top: 0; letter-spacing: -0.5px;">StockSense IMS</h2>
          <p style="color: #3f3f46; font-size: 14px; line-height: 1.5;">You requested a password reset for your StockSense account.</p>
          <div style="background-color: #f4f4f5; padding: 20px; border-radius: 12px; text-align: center; margin: 24px 0; border: 1px solid #e4e4e7;">
            <span style="font-family: monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #09090b;">${otp}</span>
          </div>
          <p style="color: #71717a; font-size: 12px; line-height: 1.5;">This OTP will expire in <strong>10 minutes</strong>. If you did not request this, your account remains secure and no further action is required.</p>
        </div>
      `,
    });

    console.log(`[STOCKSENSE EMAIL SENT via SMTP ${host}] MessageId: ${info.messageId} to ${email}`);
    return true;
  } catch (err) {
    console.error("[STOCKSENSE EMAIL ERROR] Failed to send email via SMTP:", err);
    return false;
  }
}
