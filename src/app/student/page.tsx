import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { getPageSession } from '@/lib/auth';
import { listProductsByOwner } from '@/lib/repos/products';
import { listMissingReportsForOwner } from '@/lib/repos/reports';
import { listAuthorizationsForBorrower, listAuthorizationsForOwner } from '@/lib/repos/borrow';
import { listNotifications } from '@/lib/repos/misc';
import { Alert, Badge, Card, CardHeader, EmptyState, PageHeader, Stat } from '@/components/ui';
import {
  AlertCircleIcon,
  BellIcon,
  ChevronRightIcon,
  DeviceTypeIcon,
  FileTextIcon,
  LaptopIcon,
  PlusIcon,
  SwapIcon,
} from '@/components/icons';
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
        eyebrow="Student portal"
        title={`Welcome, ${session.user.full_name.split(' ')[0]}`}
        description="Your registered devices, reports and notifications in one place."
        action={
          <Link href="/student/products/new" className="btn-primary">
            <PlusIcon className="h-4 w-4" />
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Registered devices"
          value={activeProducts.length}
          hint="Devices attached to your account"
          icon={<LaptopIcon className="h-5 w-5" />}
        />
        <Stat
          label="Open reports"
          value={openReports.length}
          tone={openReports.length ? 'danger' : 'ok'}
          hint={openReports.length ? 'Being handled by campus security' : 'Nothing outstanding'}
          icon={<AlertCircleIcon className="h-5 w-5" />}
        />
        <Stat
          label="Loans you granted"
          value={granted.filter((a) => !a.revoked_at).length}
          hint="Devices others may carry"
          icon={<SwapIcon className="h-5 w-5" />}
        />
        <Stat
          label="Devices lent to you"
          value={received.filter((a) => !a.revoked_at).length}
          hint="You are an authorised borrower"
          icon={<FileTextIcon className="h-5 w-5" />}
        />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
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
              icon={<LaptopIcon className="h-6 w-6" />}
              title="No devices registered yet"
              description="Register a laptop, phone or instrument to give it a QR identity on campus."
              action={
                <Link href="/student/products/new" className="btn-primary">
                  <PlusIcon className="h-4 w-4" />
                  Register your first device
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {activeProducts.slice(0, 6).map((product) => (
                <li key={product.id}>
                  <Link
                    href={`/student/products/${product.id}`}
                    className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50 sm:px-6"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                      <DeviceTypeIcon type={product.type} className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900 group-hover:text-brand-700">
                        {product.brand} {product.model}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {PRODUCT_TYPE_LABEL[product.type]} · registered {formatRelative(product.registered_at)}
                        {product.serial_number ? ` · ··${product.serial_number.slice(-4)}` : ''}
                      </span>
                    </span>
                    {product.status === 'REPORTED_MISSING' ? (
                      <Badge tone="danger">Reported missing</Badge>
                    ) : product.token ? (
                      <Badge tone="ok">Labelled</Badge>
                    ) : (
                      <Badge tone="warn">No label</Badge>
                    )}
                    <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-brand-500" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="flex flex-col">
          <CardHeader title="Notifications" />
          {notifications.length === 0 ? (
            <EmptyState
              icon={<BellIcon className="h-6 w-6" />}
              title="Nothing new"
              description="Updates about your devices and reports appear here."
            />
          ) : (
            <ul className="flex-1 divide-y divide-slate-100">
              {notifications.map((notification) => (
                <li key={notification.id} className="flex gap-3 px-5 py-3.5 sm:px-6">
                  <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-400" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{notification.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{notification.body}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{formatRelative(notification.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-slate-100 p-4">
            <Link href="/student/notifications" className="btn-secondary btn-sm w-full">
              All notifications
            </Link>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
