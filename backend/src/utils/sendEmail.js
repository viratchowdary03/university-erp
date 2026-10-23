import { env } from "../config/env.js";
import { getTransporter, isMailConfigured } from "../config/mailer.js";
import { ApiError } from "./ApiError.js";

const escapeHtml = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export async function sendEmail({ to, subject, text, html }) {
  if (!isMailConfigured()) {
    if (env.nodeEnv === "production") {
      throw new ApiError(500, "Email service is not configured");
    }
    // Development fallback: show the email in the terminal instead of sending it
    console.log(`\n[DEV EMAIL - SMTP not configured]\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
    return { dev: true };
  }
  await getTransporter().sendMail({ from: env.smtp.from, to, subject, text, html });
  return { dev: false };
}

export function sendOtpEmail({ to, name, otp }) {
  const minutes = env.otp.ttlMinutes;
  const uni = env.university;
  const text =
    `Hello ${name},\n\nYour ${uni} verification code is ${otp}.\n` +
    `It expires in ${minutes} minutes. If you did not create an account, ignore this email.\n`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px">
      <h2 style="margin:0 0 4px;color:#0f766e">${escapeHtml(uni)}</h2>
      <p style="color:#475569">Hello ${escapeHtml(name)}, use this code to verify your email:</p>
      <p style="font-size:32px;letter-spacing:8px;font-weight:700;margin:16px 0;color:#134e4a">${escapeHtml(otp)}</p>
      <p style="color:#64748b;font-size:13px">This code expires in ${minutes} minutes. If you did not create an account, you can ignore this email.</p>
    </div>`;
  return sendEmail({ to, subject: `${otp} is your ${uni} verification code`, text, html });
}

export function sendAccountDecisionEmail({ to, name, approved }) {
  const uni = env.university;
  const subject = approved ? `Your ${uni} account is approved` : `Your ${uni} account request`;
  const text = approved
    ? `Hello ${name},\n\nYour account has been approved. You can now sign in at ${env.clientUrl}/login.\n`
    : `Hello ${name},\n\nYour account request was not approved. Please contact the university office for details.\n`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px">
      <h2 style="margin:0 0 8px;color:#0f766e">${escapeHtml(uni)}</h2>
      <p style="color:#475569">Hello ${escapeHtml(name)},</p>
      <p style="color:#475569">${approved
        ? `Your account has been approved. You can now <a href="${escapeHtml(env.clientUrl)}/login">sign in</a>.`
        : "Your account request was not approved. Please contact the university office for details."}</p>
    </div>`;
  return sendEmail({ to, subject, text, html });
}

export function sendResetEmail({ to, name, otp }) {
  const uni = env.university;
  const text = `Hello ${name},\n\nYour ${uni} password reset code is ${otp}. It expires in ${env.otp.ttlMinutes} minutes.\nIf you did not ask for this, ignore this email - your password stays the same.\n`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px">
      <h2 style="margin:0 0 4px;color:#0f766e">${escapeHtml(uni)}</h2>
      <p style="color:#475569">Hello ${escapeHtml(name)}, use this code to reset your password:</p>
      <p style="font-size:32px;letter-spacing:8px;font-weight:700;margin:16px 0;color:#134e4a">${escapeHtml(otp)}</p>
      <p style="color:#64748b;font-size:13px">It expires in ${env.otp.ttlMinutes} minutes. If you did not ask for this, ignore this email.</p>
    </div>`;
  return sendEmail({ to, subject: `${otp} is your ${uni} password reset code`, text, html });
}

export function sendPlainEmail({ to, name, subject, lines }) {
  const text = `Hello ${name},\n\n${lines.join("\n\n")}\n\n${env.university}`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px"><h2 style="margin:0 0 8px;color:#0f766e">${escapeHtml(env.university)}</h2><p style="color:#475569">Hello ${escapeHtml(name)},</p>${lines.map((l) => `<p style="color:#475569">${escapeHtml(l)}</p>`).join("")}</div>`;
  return sendEmail({ to, subject, text, html });
}
