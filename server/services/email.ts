import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.ethereal.email",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@parle-moi.app";
const APP_URL = process.env.APP_URL || "http://localhost:3000";

export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string
): Promise<boolean> {
  const verifyUrl = `${APP_URL}/auth/verify?token=${token}`;

  try {
    await transporter.sendMail({
      from: `"Parle-moi" <${FROM_EMAIL}>`,
      to: email,
      subject: "Verify your email — Parle-moi",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0e0e14; color: #f4f4f7; border-radius: 16px;">
          <h1 style="color: #ff6b4a; font-size: 24px; margin-bottom: 16px;">Welcome to Parle-moi, ${escapeHtml(name)}!</h1>
          <p style="color: #9494a8; line-height: 1.6;">Click the button below to verify your email address and start connecting with people around the world.</p>
          <a href="${verifyUrl}" style="display: inline-block; margin: 24px 0; padding: 14px 32px; background: linear-gradient(135deg, #ff6b4a, #ff8a70); color: white; text-decoration: none; border-radius: 100px; font-weight: 600;">Verify my email</a>
          <p style="color: #5c5c72; font-size: 13px;">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error("[Email] Failed to send verification email:", err);
    return false;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
