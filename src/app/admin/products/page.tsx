import { AppShell } from '@/components/app-shell';
import { getPageSession } from '@/lib/auth';
import { listProducts } from '@/lib/repos/products';
import { Badge, Card, EmptyState, PageHeader, Table } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { PRODUCT_TYPE_LABEL } from '@/lib/constants';
import type { ProductStatus } from '@/lib/types';

export const metadata = { title: 'Registry' };
export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, 'ok' | 'warn' | 'danger' | 'neutral' | 'info'> = {
  ACTIVE: 'ok',
  REPORTED_MISSING: 'danger',
  RECOVERED: 'info',
  RETIRED: 'neutral',
};

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await getPageSession(['ADMIN']);
  const { q, status } = await searchParams;

  const { rows, total } = await listProducts(session.institution.id, {
    search: q,
    status: (status as ProductStatus | 'ALL') ?? 'ALL',
    limit: 100,
  });

  return (
    <AppShell roles={['ADMIN']}>
      <PageHeader
        title="Device registry"
        description={`${total} device${total === 1 ? '' : 's'} registered at ${session.institution.code}. Search by brand, model, serial, student or QR token.`}
      />

      <form className="mb-4 flex flex-wrap gap-2" method="get">
        <input aria-label="Search device, owner or code" name="q" defaultValue={q ?? ''} className="input max-w-sm" placeholder="Search device, owner or code" />
        <select aria-label="Filter by status" name="status" className="select w-auto" defaultValue={status ?? 'ALL'}>
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="REPORTED_MISSING">Reported missing</option>
          <option value="RECOVERED">Recovered</option>
          <option value="RETIRED">Retired</option>
        </select>
        <button className="btn-secondary">Search</button>
      </form>

      <Card>
        {rows.length === 0 ? (
          <EmptyState title="No devices match" description="Try a different search term." />
        ) : (
          <Table
            head={
              <>
                <th scope="col" className="th">Device</th>
                <th scope="col" className="th">Owner</th>
                <th scope="col" className="th">Serial</th>
                <th scope="col" className="th">QR token</th>
                <th scope="col" className="th">Registered</th>
                <th scope="col" className="th">Status</th>
              </>
            }
          >
            {rows.map((product) => (
              <tr key={product.id}>
                <td className="td">
                  <p className="font-medium text-slate-900">
                    {product.brand} {product.model}
                  </p>
                  <p className="text-xs text-slate-500">{PRODUCT_TYPE_LABEL[product.type]}</p>
                </td>
                <td className="td">
                  <p className="text-slate-800">{product.owner_name}</p>
                  <p className="text-xs text-slate-500">{product.owner_student_id ?? product.owner_email}</p>
                </td>
                <td className="td font-mono text-xs">{product.serial_number ?? '—'}</td>
                <td className="td font-mono text-xs text-slate-500">{product.token ?? '—'}</td>
                <td className="td whitespace-nowrap">{formatDate(product.registered_at)}</td>
                <td className="td">
                  <Badge tone={STATUS_TONE[product.status] ?? 'neutral'}>
                    {product.status.replace(/_/g, ' ').toLowerCase()}
                  </Badge>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </AppShell>
  );
}
