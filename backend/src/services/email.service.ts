import nodemailer, { Transporter } from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

/**
 * Email Service for BloodLink
 *
 * SMTP is used whenever configured. Console output requires an explicit
 * development/test transport; it is forbidden in production.
 *
 * Environment variables for production:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */

let transporter: Transporter | null = null;

export function assertEmailConfigured(): void {
  if (process.env.EMAIL_TRANSPORT === "console" && ["development", "test"].includes(process.env.NODE_ENV || "")) return;
  if (process.env.EMAIL_TRANSPORT === "console" || !process.env.SMTP_HOST || !process.env.SMTP_FROM) {
    throw new Error("Configure SMTP_HOST and SMTP_FROM; console transport requires NODE_ENV=development or test");
  }
  const port = Number(process.env.SMTP_PORT || "587");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid SMTP_PORT");
  if (!!process.env.SMTP_USER !== !!process.env.SMTP_PASS) throw new Error("Configure both SMTP_USER and SMTP_PASS");
}

function getTransporter(): Transporter {
  assertEmailConfigured();
  if (transporter) return transporter;
  if (process.env.EMAIL_TRANSPORT === "console") {
    transporter = nodemailer.createTransport({ jsonTransport: true });
  } else {
    const port = Number(process.env.SMTP_PORT || "587");
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      requireTLS: port !== 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }
  return transporter;
}

interface SendEmailOptions { to: string; subject: string; text: string; html: string; }
async function sendEmail(options: SendEmailOptions): Promise<void> {
  const info = await getTransporter().sendMail({ from: process.env.SMTP_FROM || "BloodLink <noreply@bloodlink.lk>", ...options });
  if (process.env.EMAIL_TRANSPORT === "console" && process.env.NODE_ENV === "development") {
    // Explicit local transport only; OTPs are never included in HTTP responses.
    console.log(JSON.parse(info.message).text);
  }
}

export async function sendRegistrationOtpEmail(
  to: string,
  otp: string
): Promise<void> {
  await sendEmail({
    to,
    subject: "BloodLink — Verify Your Email",
    text: `Your BloodLink verification code is: ${otp}\n\nThis code expires in 15 minutes.\n\nIf you did not request this, please ignore this email.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #fff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #C5162E; font-size: 24px; margin: 0;">BloodLink</h1>
          <p style="color: #64748B; font-size: 14px; margin-top: 4px;">Smart Blood Donation System</p>
        </div>
        <div style="background: #FEF2F2; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <p style="color: #64748B; font-size: 14px; margin: 0 0 12px 0;">Your verification code</p>
          <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #C5162E;">${otp}</div>
          <p style="color: #94A3B8; font-size: 12px; margin-top: 12px;">Expires in 15 minutes</p>
        </div>
        <p style="color: #64748B; font-size: 13px; text-align: center;">If you did not create a BloodLink account, please ignore this email.</p>
      </div>
    `,
  });
}

/**
 * Send OTP for password reset
 */
export async function sendPasswordResetOtpEmail(
  to: string,
  otp: string
): Promise<void> {
  await sendEmail({
    to,
    subject: "BloodLink — Password Reset Code",
    text: `Your BloodLink password reset code is: ${otp}\n\nThis code expires in 15 minutes.\n\nIf you did not request a password reset, please ignore this email and ensure your account is secure.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #fff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #C5162E; font-size: 24px; margin: 0;">BloodLink</h1>
          <p style="color: #64748B; font-size: 14px; margin-top: 4px;">Password Reset</p>
        </div>
        <div style="background: #FEF2F2; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <p style="color: #64748B; font-size: 14px; margin: 0 0 12px 0;">Your reset code</p>
          <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #C5162E;">${otp}</div>
          <p style="color: #94A3B8; font-size: 12px; margin-top: 12px;">Expires in 15 minutes</p>
        </div>
        <p style="color: #EF4444; font-size: 13px; text-align: center; font-weight: 600;">⚠️ If you did not request this reset, ignore this email. Your password remains unchanged.</p>
      </div>
    `,
  });
}
