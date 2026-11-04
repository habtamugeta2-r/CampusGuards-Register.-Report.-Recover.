import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { getPageSession } from '@/lib/auth';
import { listProductsByOwner } from '@/lib/repos/products';
import { Badge, Card, EmptyState, LinkButton, PageHeader, Table } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { PRODUCT_TYPE_LABEL } from '@/lib/constants';

export const metadata = { title: 'My devices' };
export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, 'ok' | 'warn' | 'danger' | 'neutral'> = {
  ACTIVE: 'ok',
  REPORTED_MISSING: 'danger',
  RECOVERED: 'info' as never,
  RETIRED: 'neutral',
};

export default async function ProductsPage() {
  const session = await getPageSession(['STUDENT']);
  const products = await listProductsByOwner(session.user.id);
  const active = products.filter((p) => p.status !== 'RETIRED');
  const retired = products.filter((p) => p.status === 'RETIRED');

  return (
    <AppShell roles={['STUDENT']}>
      <PageHeader
        title="My devices"
        description="Everything you have registered. Print a label for each one — an unlabelled device cannot be matched back to you."
        action={
          <Link href="/student/products/new" className="btn-primary">
            Register a device
          </Link>
        }
      />

      <Card>
        {active.length === 0 ? (
          <EmptyState
            title="No devices registered yet"
            description="Add your laptop, phone, tablet or instrument. Registration takes about a minute."
            action={
              <Link href="/student/products/new" className="btn-primary">
                Register your first device
              </Link>
            }
          />
        ) : (
          <Table
            head={
              <>
                <th className="th">Device</th>
                <th className="th">Type</th>
                <th className="th">Status</th>
                <th className="th">Registered</th>
                <th className="th">Label</th>
              </>
            }
          >
            {active.map((product) => (
              <tr key={product.id}>
                <td className="td">
                  <Link href={`/student/products/${product.id}`} className="font-medium text-slate-900 hover:underline">
                    {product.brand} {product.model}
                  </Link>
                  {product.color ? <span className="ml-1 text-xs text-slate-500">({product.color})</span> : null}
                </td>
                <td className="td">{PRODUCT_TYPE_LABEL[product.type]}</td>
                <td className="td">
                  <Badge tone={STATUS_TONE[product.status] ?? 'neutral'}>
                    {product.status === 'REPORTED_MISSING'
                      ? 'Reported missing'
                      : product.status === 'RECOVERED'
                        ? 'Recovered'
                        : 'Active'}
                  </Badge>
                </td>
                <td className="td whitespace-nowrap">{formatDate(product.registered_at)}</td>
                <td className="td">
                  {product.token ? (
                    <span className="font-mono text-xs text-slate-500">{product.token}</span>
                  ) : (
                    <Badge tone="warn">None</Badge>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {retired.length ? (
        <Card className="mt-6">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Removed devices</h2>
            <p className="text-xs text-slate-500">
              Kept for the audit trail, but their codes no longer resolve at a checkpoint.
            </p>
          </div>
          <Table head={<th className="th">Device</th>}>
            {retired.map((product) => (
              <tr key={product.id}>
                <td className="td">
                  <span className="text-slate-500 line-through">
                    {product.brand} {product.model}
                  </span>
                  <span className="ml-2 text-xs text-slate-400">{product.retired_reason ?? 'Removed'}</span>
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      ) : null}

      <div className="mt-4">
        <LinkButton href="/student">Back to overview</LinkButton>
      </div>
    </AppShell>
  );
}
