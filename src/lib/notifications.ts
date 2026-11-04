import { query } from './db';
import { id } from './ids';
import { sendEmail } from './mailer';

export type NotifyInput = {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  /**
   * Optional, and worth filling in: the organisation this message is sent on
   * behalf of. It is written into the body, because a plain-text email is the
   * only kind this product sends and "who is emailing me?" is the first
   * question a recipient asks.
   */
  email?: { to: string; subject: string; organisation?: string | null };
};

/**
 * Notifications are always written to the in-app inbox. Email is best-effort:
 * connectivity and SMTP availability at Ethiopian universities vary, so no
 * workflow may depend on email being delivered.
 */
export async function notify(input: NotifyInput): Promise<void> {
  await query(
    `INSERT INTO notifications (id, user_id, channel, type, title, body, link, sent_at)
     VALUES ($1,$2,'IN_APP',$3,$4,$5,$6, now())`,
    [id.notification(), input.userId, input.type, input.title, input.body, input.link ?? null],
  );

  if (!input.email) return;

  const text = brandedEmailBody(input.body, input.email.organisation);
  const result = await sendEmail({ to: input.email.to, subject: input.email.subject, text });
  if (result.delivered) {
    await query(
      `INSERT INTO notifications (id, user_id, channel, type, title, body, link, sent_at)
       VALUES ($1,$2,'EMAIL',$3,$4,$5,$6, now())`,
      [id.notification(), input.userId, input.type, input.email.subject, text, input.link ?? null],
    );
  }
}

/**
 * The organisation's name above the message and in the sign-off. Deliberately
 * plain text: this product sends no HTML email, and a recipient deserves to
 * know whose registry the message came from.
 */
export function brandedEmailBody(body: string, organisation?: string | null): string {
  const name = organisation?.trim();
  if (!name) return body;
  return `${name} · CampusGuard\n\n${body}\n\n— CampusGuard on behalf of ${name}`;
}

/** Fan-out to several users (e.g. every security officer on duty). */
export async function notifyMany(userIds: string[], input: Omit<NotifyInput, 'userId'>): Promise<void> {
  await Promise.all(userIds.map((userId) => notify({ ...input, userId })));
}
