const ET = 'en-ET';

export function formatDate(value: Date | string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(ET, opts ?? { year: 'numeric', month: 'short', day: 'numeric' }).format(d);
}

export function formatDateTime(value: Date | string | null | undefined): string {
  return formatDate(value, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatRelative(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  const diffMs = Date.now() - d.getTime();
  if (Math.abs(diffMs) < 45_000) return 'just now';
  const mins = Math.round(diffMs / 60000);
  if (Math.abs(mins) < 1) return 'just now';
  if (Math.abs(mins) < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return `${days} d ago`;
  return formatDate(d);
}

export function hoursBetween(a: Date, b: Date): number {
  return Math.round(((b.getTime() - a.getTime()) / 3_600_000) * 10) / 10;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export function percent(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}
