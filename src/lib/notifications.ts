import { query } from './db';
import { id } from './ids';
import { sendEmail } from './mailer';

export type NotifyInput = {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  email?: { to: string; subject: string };
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

  const result = await sendEmail({ to: input.email.to, subject: input.email.subject, text: input.body });
  if (result.delivered) {
    await query(
      `INSERT INTO notifications (id, user_id, channel, type, title, body, link, sent_at)
       VALUES ($1,$2,'EMAIL',$3,$4,$5,$6, now())`,
      [id.notification(), input.userId, input.type, input.email.subject, input.body, input.link ?? null],
    );
  }
}

/** Fan-out to several users (e.g. every security officer on duty). */
export async function notifyMany(userIds: string[], input: Omit<NotifyInput, 'userId'>): Promise<void> {
  await Promise.all(userIds.map((userId) => notify({ ...input, userId })));
}
