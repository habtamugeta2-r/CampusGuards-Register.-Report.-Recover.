import { AppShell } from '@/components/app-shell';
import { getPageSession } from '@/lib/auth';
import { listNotifications } from '@/lib/repos/misc';
import { MarkAllReadButton, NotificationList } from '@/components/notifications-list';
import { PageHeader } from '@/components/ui';

export const metadata = { title: 'Notifications' };
export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const session = await getPageSession();
  const rows = await listNotifications(session.user.id, 60);

  return (
    <AppShell>
      <PageHeader
        title="Notifications"
        description="Updates from campus security and the lost-property desk about your devices."
        action={rows.some((row) => !row.read_at) ? <MarkAllReadButton /> : undefined}
      />
      <NotificationList rows={rows} />
    </AppShell>
  );
}
