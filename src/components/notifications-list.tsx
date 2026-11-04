'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge, Card, EmptyState } from './ui';
import { apiPost } from '@/lib/client/api';
import { formatRelative } from '@/lib/format';

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | Date | null;
  created_at: string | Date;
};

export function NotificationList({ rows }: { rows: NotificationRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function markRead(id: string) {
    setPendingId(id);
    try {
      await apiPost('/api/notifications/read', { id });
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  if (!rows.length) {
    return (
      <Card>
        <EmptyState title="No notifications" description="Anything important about your devices will appear here." />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <Card key={row.id} className={row.read_at ? 'opacity-75' : ''}>
          <div className="flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">{row.title}</p>
                {!row.read_at ? <Badge tone="info">New</Badge> : null}
              </div>
              <p className="mt-1 text-sm text-slate-700">{row.body}</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-xs text-slate-400">{formatRelative(row.created_at)}</span>
                {row.link ? (
                  <Link href={row.link} className="text-xs font-medium text-brand-700 hover:underline">
                    Open
                  </Link>
                ) : null}
                {!row.read_at ? (
                  <button
                    onClick={() => markRead(row.id)}
                    disabled={pendingId === row.id}
                    className="text-xs font-medium text-slate-500 hover:underline"
                  >
                    {pendingId === row.id ? 'Marking…' : 'Mark as read'}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function MarkAllReadButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      className="btn-secondary btn-sm"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await apiPost('/api/notifications/read', {});
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? 'Marking…' : 'Mark all as read'}
    </button>
  );
}
