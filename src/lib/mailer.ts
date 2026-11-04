import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Email delivery is behind an adapter so the platform works with or without an
 * SMTP server. In development (and in institutions that cannot yet provide
 * SMTP) messages are written to the application log and remain visible as
 * in-app notifications.
 */
let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    });
  }
  return transporter;
}

export type OutboundEmail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendResult = { delivered: boolean; channel: 'smtp' | 'log'; error?: string };

export async function sendEmail(message: OutboundEmail): Promise<SendResult> {
  const from = process.env.MAIL_FROM ?? 'CampusGuard <no-reply@campusguard.local>';
  const t = getTransporter();

  if (!t) {
    console.info('[mailer:log-only]', {
      to: message.to,
      subject: message.subject,
      body: message.text,
    });
    return { delivered: false, channel: 'log' };
  }

  try {
    await t.sendMail({ ...message, from });
    return { delivered: true, channel: 'smtp' };
  } catch (error) {
    console.error('[mailer] send failed', error);
    return { delivered: false, channel: 'smtp', error: String(error) };
  }
}
