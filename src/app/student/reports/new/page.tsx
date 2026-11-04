import { AppShell } from '@/components/app-shell';
import { getPageSession } from '@/lib/auth';
import { listProductsByOwner } from '@/lib/repos/products';
import { MissingReportForm } from '@/components/forms';
import { Card, PageHeader } from '@/components/ui';
import { PRODUCT_TYPE_LABEL } from '@/lib/constants';

export const metadata = { title: 'Report missing' };
export const dynamic = 'force-dynamic';

export default async function NewMissingReportPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const session = await getPageSession(['STUDENT']);
  const { product: productParam } = await searchParams;
  const products = await listProductsByOwner(session.user.id);

  return (
    <AppShell roles={['STUDENT']}>
      <PageHeader
        title="Report a device missing"
        description="One report reaches security, the lost-property desk and every checkpoint. If someone later scans the label, you are told immediately."
      />

      <Card className="card-pad">
        <MissingReportForm
          defaultProductId={productParam}
          products={products
            .filter((product) => product.status !== 'RETIRED')
            .map((product) => ({
              id: product.id,
              label: `${product.brand} ${product.model} · ${PRODUCT_TYPE_LABEL[product.type]}`,
              status: product.status,
            }))}
        />
      </Card>

      <p className="mt-4 text-xs text-slate-500">
        Reporting here does not replace reporting a crime. If you believe a device was stolen, also report it to campus
        security in person so that a formal investigation can begin.
      </p>
    </AppShell>
  );
}
