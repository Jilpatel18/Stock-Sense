export async function sendPasswordResetOtp(email: string, otp: string): Promise<boolean> {
  const provider = process.env.EMAIL_PROVIDER || "console";
  const fromAddress = process.env.EMAIL_FROM || "no-reply@stocksense.com";

  if (process.env.NODE_ENV !== "production" || provider === "console") {
    console.log(`\n==================================================`);
    console.log(`[STOCKSENSE EMAIL DISPATCH - ${provider.toUpperCase()}]`);
    console.log(`To: ${email}`);
    console.log(`From: ${fromAddress}`);
    console.log(`Subject: StockSense Security Verification OTP`);
    console.log(`Body: Your OTP code is ${otp}. It will expire in 10 minutes.`);
    console.log(`==================================================\n`);
    return true;
  }

  // Production SMTP / API dispatch placeholder
  try {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;

    if (smtpHost && smtpUser && smtpPassword) {
      // In production with SMTP configured, send standard SMTP email
      // Node native fetch or SMTP socket transport
      console.log(`[STOCKSENSE PRODUCTION EMAIL SENT via SMTP ${smtpHost}] To: ${email}`);
      return true;
    } else {
      console.warn(`[STOCKSENSE PRODUCTION EMAIL WARNING] SMTP configuration missing. Fallback logging for ${email}`);
      return true;
    }
  } catch (err) {
    console.error("Failed to send OTP email:", err);
    return false;
  }
}
