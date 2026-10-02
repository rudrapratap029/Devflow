import nodemailer from "nodemailer";

/**
 * Send an Email OTP verification code
 * Supports:
 * 1. Brevo API (Priority 1 - BREVO_API_KEY)
 * 2. Resend API (Priority 2 - RESEND_API_KEY)
 * 3. Nodemailer SMTP (Priority 3 - SMTP_HOST, SMTP_USER, SMTP_PASS)
 * 4. Dev Console Fallback (logs OTP directly in terminal for easy local testing)
 */
export const sendVerificationEmail = async (toEmail, otp, name = "Developer") => {
  const subject = "DevFlow Email Verification";
  const textContent = `Hello ${name},\n\nYour DevFlow verification code is:\n\n${otp}\n\nThis OTP is valid for 5 minutes. Please do not share this code with anyone.\n\nBest regards,\nDevFlow Team`;

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; padding: 40px 20px; color: #f8fafc;">
      <div style="max-width: 480px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #818cf8; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">DevFlow</h1>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Modern Workspace & Collaboration</p>
        </div>
        <h2 style="color: #ffffff; font-size: 18px; margin-top: 0; margin-bottom: 12px;">Email Verification Code</h2>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Hello <strong>${name}</strong>,</p>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">Please use the following 6-digit verification code to complete your DevFlow account registration:</p>
        <div style="background-color: #0f172a; border: 1px dashed #6366f1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
          <span style="font-family: monospace; font-size: 34px; font-weight: 700; letter-spacing: 10px; color: #a5b4fc; display: inline-block;">${otp}</span>
        </div>
        <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 16px 0;">
          ⏳ This code is valid for <strong>5 minutes</strong> and can only be used once. Do not share this code with anyone.
        </p>
        <hr style="border: none; border-top: 1px solid #334155; margin: 24px 0;" />
        <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0;">
          If you did not request this email, please ignore it. Your account will not be created.
        </p>
      </div>
    </div>
  `;

  // 1. Brevo v3 API (Priority 1)
  if (process.env.BREVO_API_KEY) {
    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          sender: {
            name: process.env.BREVO_SENDER_NAME || "DevFlow",
            email: process.env.BREVO_SENDER_EMAIL || "no-reply@devflow.com"
          },
          to: [{ email: toEmail, name }],
          subject,
          htmlContent,
          textContent
        })
      });

      if (response.ok) {
        return { success: true, provider: "brevo" };
      }
      const errorText = await response.text();
      console.error("[Brevo Error]:", errorText);
    } catch (err) {
      console.error("[Brevo Request Failed]:", err.message);
    }
  }

  // 2. Resend API (Priority 2)
  if (process.env.RESEND_API_KEY) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: process.env.RESEND_SENDER_EMAIL || "DevFlow <onboarding@resend.dev>",
          to: [toEmail],
          subject,
          html: htmlContent,
          text: textContent
        })
      });

      if (response.ok) {
        return { success: true, provider: "resend" };
      }
      const errorText = await response.text();
      console.error("[Resend Error]:", errorText);
    } catch (err) {
      console.error("[Resend Request Failed]:", err.message);
    }
  }

  // 3. Nodemailer SMTP (Priority 3)
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587", 10),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || "DevFlow"}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to: toEmail,
        subject,
        text: textContent,
        html: htmlContent
      });

      return { success: true, provider: "nodemailer" };
    } catch (err) {
      console.error("[Nodemailer Error]:", err.message);
    }
  }

  // 4. Fallback / Local Development Mode: Log to console
  console.log("\n========================================================");
  console.log("📨 [DevFlow Email Service] OTP Generated");
  console.log(`👤 To: ${toEmail} (${name})`);
  console.log(`🔑 Verification OTP: ${otp}`);
  console.log(`⏰ Valid for: 5 minutes`);
  console.log("========================================================\n");

  return { success: true, provider: "dev-console" };
};
