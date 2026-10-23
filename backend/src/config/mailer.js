import nodemailer from "nodemailer";
import { env } from "./env.js";

let transporter = null;

export const isMailConfigured = () =>
  Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);

export const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }
  return transporter;
};
