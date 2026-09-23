import nodemailer from "nodemailer";
import type { TSendAuthEmailPayload } from "./types"

let transporter: nodemailer.Transporter | null = null;

/**
 * Lazily create the SMTP transporter.
 * This avoids creating connections during CLI operations.
 */
function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false, // true if port 465
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

/**
 * Sends an email using SMTP.
 * Designed to be safe for BetterAuth CLI execution.
 */
export async function sendAuthEmail(
  payload: TSendAuthEmailPayload
): Promise<void> {
  try {
    const transporter = getTransporter();

    await transporter.sendMail({
      from:
        payload.from ??
        `BetterAuth Clean Architecture <${process.env.SMTP_EMAIL}>`,
      to: payload.to,
      subject: payload.subject,
      html: payload.html
    });
  } catch (error) {
    console.error("Email sending failed:", error);
    throw new Error("Failed to send authentication email");
  }
}