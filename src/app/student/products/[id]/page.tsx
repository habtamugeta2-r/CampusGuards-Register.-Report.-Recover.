import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { getPageSession } from '@/lib/auth';
import { findProductByIdFor, listProductIdentifiers } from '@/lib/repos/products';
import { activeAuthorizationsForProduct } from '@/lib/repos/borrow';
import { listMissingReportsForOwner } from '@/lib/repos/reports';
import { qrPngDataUrl } from '@/lib/qr';
import { publicScanUrl } from '@/lib/tokens';
import { QrLabel } from '@/components/qr-label';
import { BorrowForm, RetireProductButton, RotateQrButton } from '@/components/forms';
import { Alert, Badge, Card, CardHeader, PageHeader } from '@/components/ui';
import { formatDate, formatDateTime } from '@/lib/format';
import { PRODUCT_TYPE_LABEL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getPageSession(['STUDENT']);
  const { id: productId } = await params;

  const product = await findProductByIdFor(productId, session.user.id);
  if (!product) notFound();

  const [identifiers, authorizations, reports] = await Promise.all([
    listProductIdentifiers(productId),
    activeAuthorizationsForProduct(productId),
    listMissingReportsForOwner(session.user.id),
  ]);

  const primaryToken = identifiers.find((i) => i.kind === 'QR_TOKEN' && !i.revoked_at)?.value ?? null;
  const qrDataUrl = primaryToken
    ? await qrPngDataUrl(publicScanUrl(primaryToken, process.env.NEXT_PUBLIC_APP_URL), 400)
    : null;

  const productReports = reports.filter((report) => report.product_id === productId);
  const openReport = productReports.find((report) => report.status === 'OPEN');

  return (
    <AppShell roles={['STUDENT']}>
      <PageHeader
        title={`${product.brand} ${product.model}`}
        description={`${PRODUCT_TYPE_LABEL[product.type]} · registered ${formatDate(product.registered_at)}`}
        action={
          <Link href="/student/products" className="btn-secondary">
            Back to devices
          </Link>
        }
      />

      {openReport ? (
        <div className="mb-6">
          <Alert tone="danger" title="This device is reported missing">
            Reported {formatDateTime(openReport.reported_at)} as {openReport.category.toLowerCase()}. If it is found and
            scanned, you will be notified here.{' '}
            <Link href="/student/reports" className="font-semibold underline">
              Manage report
            </Link>
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card className="card-pad">
            <h2 className="text-base font-semibold text-slate-900">Details</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Type" value={PRODUCT_TYPE_LABEL[product.type]} />
              <Field label="Brand" value={product.brand} />
              <Field label="Model" value={product.model} />
              <Field label="Colour" value={product.color} />
              <Field label="Serial number" value={product.serial_number} mono />
              <Field label="Distinguishing marks" value={product.distinguishing_marks} />
              <div className="sm:col-span-2">
                <Field label="Notes (private)" value={product.notes} />
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge tone={product.status === 'REPORTED_MISSING' ? 'danger' : product.status === 'RETIRED' ? 'neutral' : 'ok'}>
                {product.status.replace('_', ' ').toLowerCase()}
              </Badge>
              {product.status !== 'REPORTED_MISSING' && product.status !== 'RETIRED' ? (
                <Link href={`/student/reports/new?product=${product.id}`} className="btn-secondary btn-sm">
                  Report it missing
                </Link>
              ) : null}
              <RotateQrButton productId={product.id} />
              {product.status !== 'RETIRED' ? <RetireProductButton productId={product.id} /> : null}
            </div>
          </Card>

          <Card className="card-pad">
            <h2 className="text-base font-semibold text-slate-900">Let someone else carry it</h2>
            <div className="mt-3">
              <BorrowForm productId={product.id} productLabel={`${product.brand} ${product.model}`} />
            </div>
            {authorizations.length ? (
              <ul className="mt-4 space-y-2">
                {authorizations.map((authorization) => (
                  <li key={authorization.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="font-medium text-slate-800">{authorization.borrower_name}</span> until{' '}
                    {formatDateTime(authorization.ends_at)}
                    {authorization.reason ? <span className="text-slate-500"> · {authorization.reason}</span> : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>

          {productReports.length ? (
            <Card>
              <CardHeader title="Report history" />
              <ul className="divide-y divide-slate-100">
                {productReports.map((report) => (
                  <li key={report.id} className="px-4 py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-800">{report.category}</span>
                      <Badge
                        tone={
                          report.status === 'OPEN'
                            ? 'danger'
                            : report.status === 'RESOLVED_RECOVERED'
                              ? 'ok'
                              : 'neutral'
                        }
                      >
                        {report.status.replace(/_/g, ' ').toLowerCase()}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Filed {formatDateTime(report.reported_at)}
                      {report.resolved_at ? ` · closed ${formatDateTime(report.resolved_at)}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <div className="lg:col-span-2">
          {qrDataUrl && primaryToken ? (
            <QrLabel
              token={primaryToken}
              qrDataUrl={qrDataUrl}
              device={`${product.brand} ${product.model}`}
              owner={session.user.full_name}
              institution={session.institution.name}
              institutionLogoUrl={session.institution.logo_url}
              brandColour={session.institution.brand_primary}
              publicUrl={publicScanUrl(primaryToken, process.env.NEXT_PUBLIC_APP_URL)}
            />
          ) : (
            <Card className="card-pad">
              <Alert tone="warn" title="No active QR code">
                Issue a replacement label to generate a new code.
              </Alert>
              <div className="mt-3">
                <RotateQrButton productId={product.id} />
              </div>
            </Card>
          )}

          <Card className="card-pad mt-4">
            <h2 className="text-sm font-semibold text-slate-900">Label history</h2>
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              {identifiers
                .filter((i) => i.kind === 'QR_TOKEN')
                .map((identifier) => (
                  <li key={identifier.id} className="flex items-center justify-between gap-2">
                    <span className="font-mono">{identifier.value}</span>
                    {identifier.revoked_at ? (
                      <Badge tone="neutral">revoked {formatDate(identifier.revoked_at)}</Badge>
                    ) : (
                      <Badge tone="ok">active</Badge>
                    )}
                  </li>
                ))}
            </ul>
            <p className="mt-2 text-xs text-slate-500">
              A revoked code stops resolving immediately. That is what makes a lost or stolen label harmless.
            </p>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-0.5 text-sm text-slate-800 ${mono ? 'font-mono' : ''}`}>{value || '—'}</dd>
    </div>
  );
}
