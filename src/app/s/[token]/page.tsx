import Link from 'next/link';
import { findPublicProductByToken } from '@/lib/repos/products';
import { normalizeToken } from '@/lib/tokens';
import { Alert, Card, PageHeader } from '@/components/ui';
import { FoundReportForm } from '@/components/public-forms';
import { ShieldIcon } from '@/components/nav';
import { DEFAULT_BRAND, brandStyle, onBrandText } from '@/lib/brand';

export const metadata = { title: 'Device status' };
export const dynamic = 'force-dynamic';

/**
 * The page a CampusGuard QR code points at.
 *
 * Anyone with a phone camera can land here — that is the point. It therefore
 * shows the minimum: what kind of device this is, whether it is registered, and
 * whether it has been reported missing. No owner name, no contact details, no
 * serial number.
 *
 * It is also the most-read branded surface in the product: it carries the
 * organisation's name, mark and colour, so a finder knows whose registry they
 * are looking at and who to hand the device to.
 */
export default async function PublicStatusPage({ params }: { params: Promise<{ token: string }> }) {
  const { token: rawToken } = await params;
  const token = normalizeToken(rawToken);
  const product = token ? await findPublicProductByToken(token) : null;

  if (!product) {
    return (
      <main className="mx-auto max-w-lg px-4 py-12">
        <div className="mb-6 flex items-center justify-center gap-2">
          <ShieldIcon className="h-7 w-7 text-brand-700" />
          <span className="text-base font-semibold">CampusGuard</span>
        </div>
        <Card className="card-pad">
          <h1 className="text-lg font-semibold text-slate-900">Unknown code</h1>
          <p className="mt-1 text-sm text-slate-600">
            This code is not registered with CampusGuard. It may have been replaced, or it may not be a CampusGuard label
            at all.
          </p>
          <p className="mt-3 text-sm text-slate-600">
            If you found a device without a label, you can still hand it in —{' '}
            <Link href="/found" className="font-medium text-brand-700 hover:underline">
              report it here
            </Link>
            .
          </p>
        </Card>
      </main>
    );
  }

  const reportedMissing = product.status === 'REPORTED_MISSING';
  const brand = product.institution_brand_primary ?? DEFAULT_BRAND;

  return (
    <main className="mx-auto max-w-lg px-4 py-12" style={brandStyle(product.institution_brand_primary)}>
      <div
        className="mb-6 flex items-center justify-center gap-2 rounded-lg px-3 py-2"
        style={{ backgroundColor: brand, color: onBrandText(brand) }}
      >
        {product.institution_logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.institution_logo_url} alt="" className="h-6 w-6 object-contain" />
        ) : (
          <ShieldIcon className="h-6 w-6" />
        )}
        <span className="text-base font-semibold">{product.institution_name}</span>
      </div>

      <Card className="card-pad">
        <PageHeader
          title={reportedMissing ? 'This device has been reported missing' : 'This device is registered'}
          description={`${product.type.charAt(0) + product.type.slice(1).toLowerCase()} · ${product.brand} ${product.model}`}
        />

        <div className="mb-4">
          <Alert tone={reportedMissing ? 'danger' : 'ok'}>
            {reportedMissing
              ? `Please hand it in at ${product.institution_name}’s lost-property desk or security office. The owner has already filed a report and will be told it has been found.`
              : `If you found this device unattended, please hand it in to ${product.institution_name}. The owner will be notified — without you having to contact them yourself.`}
          </Alert>
        </div>

        <dl className="space-y-1 text-sm text-slate-700">
          <div className="flex justify-between">
            <dt className="text-slate-500">Colour</dt>
            <dd>{product.color ?? '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Distinguishing marks</dt>
            <dd>{product.distinguishing_marks ?? '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Code</dt>
            <dd className="font-mono text-xs">{product.token}</dd>
          </div>
        </dl>

        <p className="mt-4 text-xs text-slate-500">
          This page never shows who owns the device. That is deliberate: it protects the owner from being contacted
          directly by strangers.
        </p>
      </Card>

      <Card className="card-pad mt-4">
        <h2 className="text-base font-semibold text-slate-900">Report it found</h2>
        <p className="mt-1 text-sm text-slate-600">
          Telling us where you found it lets the desk match it to the report and contact the owner.
        </p>
        <div className="mt-3">
          <FoundReportForm token={product.token ?? undefined} showTokenField={false} />
        </div>
      </Card>

      <p className="mt-6 text-center text-xs text-slate-500">
        <Link href="/" className="hover:underline">
          What is CampusGuard?
        </Link>{' '}
        · Registered with {product.institution_name}
      </p>
    </main>
  );
}
