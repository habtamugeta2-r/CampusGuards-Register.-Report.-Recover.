import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { getPageSession } from '@/lib/auth';
import { listProductsByOwner } from '@/lib/repos/products';
import { listMissingReportsForOwner } from '@/lib/repos/reports';
import { listAuthorizationsForBorrower, listAuthorizationsForOwner } from '@/lib/repos/borrow';
import { listNotifications } from '@/lib/repos/misc';
import { Alert, Badge, Card, CardHeader, EmptyState, LinkButton, PageHeader, Stat } from '@/components/ui';
import { formatRelative } from '@/lib/format';
import { PRODUCT_TYPE_LABEL } from '@/lib/constants';

export const metadata = { title: 'Overview' };
export const dynamic = 'force-dynamic';

export default async function StudentDashboard() {
  const session = await getPageSession(['STUDENT']);
  const [products, reports, granted, received, notifications] = await Promise.all([
    listProductsByOwner(session.user.id),
    listMissingReportsForOwner(session.user.id),
    listAuthorizationsForOwner(session.user.id),
    listAuthorizationsForBorrower(session.user.id),
    listNotifications(session.user.id, 5),
  ]);

  const openReports = reports.filter((report) => report.status === 'OPEN');
  const activeProducts = products.filter((product) => product.status !== 'RETIRED');

  return (
    <AppShell roles={['STUDENT']}>
      <PageHeader
        title={`Welcome, ${session.user.full_name.split(' ')[0]}`}
        description="Your registered devices, reports and notifications in one place."
        action={
          <Link href="/student/products/new" className="btn-primary">
            Register a device
          </Link>
        }
      />

      {openReports.length > 0 ? (
        <div className="mb-6">
          <Alert tone="danger" title="You have an open missing report">
            {openReports.length === 1
              ? `Your ${openReports[0]!.brand} ${openReports[0]!.model} is marked as reported missing. If anyone scans its label, you will be notified immediately.`
              : `${openReports.length} of your devices are currently reported missing.`}{' '}
            <Link href="/student/reports" className="font-semibold underline">
              View report
            </Link>
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Registered devices" value={activeProducts.length} hint="Devices attached to your account" />
        <Stat
          label="Open reports"
          value={openReports.length}
          tone={openReports.length ? 'danger' : 'ok'}
          hint={openReports.length ? 'Being handled by campus security' : 'Nothing outstanding'}
        />
        <Stat label="Loans you granted" value={granted.filter((a) => !a.revoked_at).length} hint="Devices others may carry" />
        <Stat label="Devices lent to you" value={received.filter((a) => !a.revoked_at).length} hint="You are an authorised borrower" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Your devices"
            subtitle="Each device has a QR label that links it to you — without publishing who you are."
            action={
              <Link href="/student/products" className="btn-secondary btn-sm">
                View all
              </Link>
            }
          />
          {activeProducts.length === 0 ? (
            <EmptyState
              title="No devices registered yet"
              description="Register a laptop, phone or instrument to give it a QR identity on campus."
              action={
                <Link href="/student/products/new" className="btn-primary">
                  Register your first device
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {activeProducts.slice(0, 6).map((product) => (
                <li key={product.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <Link href={`/student/products/${product.id}`} className="text-sm font-medium text-slate-900 hover:underline">
                      {product.brand} {product.model}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {PRODUCT_TYPE_LABEL[product.type]} · registered {formatRelative(product.registered_at)}
                      {product.serial_number ? ` · ··${product.serial_number.slice(-4)}` : ''}
                    </p>
                  </div>
                  {product.status === 'REPORTED_MISSING' ? (
                    <Badge tone="danger">Reported missing</Badge>
                  ) : product.token ? (
                    <Badge tone="ok">Labelled</Badge>
                  ) : (
                    <Badge tone="warn">No label</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Notifications" />
          {notifications.length === 0 ? (
            <EmptyState title="Nothing new" description="Updates about your devices and reports appear here." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {notifications.map((notification) => (
                <li key={notification.id} className="px-4 py-3">
                  <p className="text-sm font-medium text-slate-900">{notification.title}</p>
                  <p className="mt-0.5 text-xs text-slate-600">{notification.body}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{formatRelative(notification.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-slate-100 p-3">
            <LinkButton href="/student/notifications">All notifications</LinkButton>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
