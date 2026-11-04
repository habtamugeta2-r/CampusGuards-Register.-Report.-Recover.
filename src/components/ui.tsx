import Link from 'next/link';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  InboxIcon,
  InfoIcon,
  ShieldIcon,
} from './icons';

/**
 * Shared UI primitives.
 *
 * Every page in the product is composed from these, so the design language
 * (radii, shadows, tone colours, spacing) is decided once, here. Components
 * keep their original props so pages can adopt new affordances (icons,
 * eyebrows) incrementally.
 */

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('card', className)}>{children}</div>;
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-slate-100 px-5 py-4 sm:px-6">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'neutral';

const TONE_CLASS: Record<Tone, string> = {
  ok: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  warn: 'bg-amber-50 text-amber-900 ring-amber-200',
  danger: 'bg-red-50 text-red-800 ring-red-200',
  info: 'bg-sky-50 text-sky-800 ring-sky-200',
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONE_CLASS[tone],
      )}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
      {children}
    </span>
  );
}

const STAT_TONE_TEXT: Record<Tone, string> = {
  ok: 'text-emerald-700',
  warn: 'text-amber-700',
  danger: 'text-red-700',
  info: 'text-sky-700',
  neutral: 'text-slate-900',
};

const STAT_TONE_CHIP: Record<Tone, string> = {
  ok: 'bg-emerald-50 text-emerald-700',
  warn: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
  info: 'bg-sky-50 text-sky-700',
  neutral: 'bg-brand-50 text-brand-700',
};

export function Stat({
  label,
  value,
  hint,
  tone = 'neutral',
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
  /** Optional glyph shown in a tinted chip — makes the card scannable. */
  icon?: ReactNode;
}) {
  return (
    <div className="card card-pad">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        {icon ? (
          <span className={clsx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', STAT_TONE_CHIP[tone])}>
            {icon}
          </span>
        ) : null}
      </div>
      <p className={clsx('mt-1 font-display text-3xl font-semibold tabular-nums tracking-tight', STAT_TONE_TEXT[tone])}>
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{hint}</p> : null}
    </div>
  );
}

/** A labelled horizontal bar — used for result mixes and checkpoint activity. */
export function ProgressBar({
  value,
  max,
  tone = 'info',
  className,
}: {
  value: number;
  max: number;
  tone?: Tone;
  className?: string;
}) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  const bar: Record<Tone, string> = {
    ok: 'bg-emerald-500',
    warn: 'bg-amber-500',
    danger: 'bg-red-500',
    info: 'bg-brand-500',
    neutral: 'bg-slate-400',
  };
  return (
    <div className={clsx('h-1.5 w-full overflow-hidden rounded-full bg-slate-100', className)} aria-hidden="true">
      <div className={clsx('h-full rounded-full transition-all', bar[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

const ALERT_STYLE: Record<Exclude<Tone, 'neutral'>, { box: string; icon: ReactNode }> = {
  danger: {
    box: 'border-red-200 bg-red-50 text-red-900',
    icon: <AlertCircleIcon className="h-5 w-5 shrink-0 text-red-600" />,
  },
  warn: {
    box: 'border-amber-200 bg-amber-50 text-amber-900',
    icon: <AlertTriangleIcon className="h-5 w-5 shrink-0 text-amber-600" />,
  },
  ok: {
    box: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    icon: <CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-600" />,
  },
  info: {
    box: 'border-sky-200 bg-sky-50 text-sky-900',
    icon: <InfoIcon className="h-5 w-5 shrink-0 text-sky-600" />,
  },
};

export function Alert({
  tone = 'info',
  title,
  children,
  live,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  /**
   * Set on alerts that appear in response to something the user just did
   * (a failed save, a successful report). It turns the alert into a live region
   * so the message is announced instead of only appearing. Static, always-on
   * page warnings must NOT set this — they would be announced on every load.
   */
  live?: 'polite' | 'assertive';
}) {
  const style = ALERT_STYLE[tone === 'neutral' ? 'info' : tone];
  return (
    <div
      role={live === 'assertive' ? 'alert' : live === 'polite' ? 'status' : undefined}
      aria-live={live}
      className={clsx('flex gap-3 rounded-xl border px-4 py-3 text-sm', style.box)}
    >
      {style.icon}
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={title ? 'mt-1' : ''}>{children}</div> : null}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="px-6 py-12 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        {icon ?? <InboxIcon className="h-6 w-6" />}
      </span>
      <p className="mt-3 text-sm font-semibold text-slate-800">{title}</p>
      {description ? <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-slate-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Table({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50/80">
          <tr>{head}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>
      </table>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
  eyebrow,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  /** Small caps context line above the title, e.g. the workspace name. */
  eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow mb-1.5">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px] sm:leading-9">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function LinkButton({
  href,
  children,
  variant = 'secondary',
  size,
}: {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm';
}) {
  return (
    <Link
      href={href}
      className={clsx(
        variant === 'primary' ? 'btn-primary' : variant === 'danger' ? 'btn-danger' : 'btn-secondary',
        size === 'sm' && 'btn-sm',
      )}
    >
      {children}
    </Link>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      {label}
    </span>
  );
}

/** The product lockup: gradient shield chip + wordmark. */
export function BrandLogo({
  size = 'md',
  onDark = false,
  subtitle,
}: {
  size?: 'sm' | 'md' | 'lg';
  onDark?: boolean;
  subtitle?: ReactNode;
}) {
  const chip = size === 'lg' ? 'h-11 w-11 rounded-2xl' : size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-9 w-9 rounded-xl';
  const glyph = size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
  const word = size === 'lg' ? 'text-xl' : size === 'sm' ? 'text-sm' : 'text-base';
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={clsx(
          'flex shrink-0 items-center justify-center bg-gradient-to-br from-brand-500 to-brand-800 text-white shadow-sm',
          chip,
        )}
      >
        <ShieldIcon className={glyph} />
      </span>
      <span className="min-w-0">
        <span className={clsx('block font-display font-semibold tracking-tight', word, onDark ? 'text-white' : 'text-slate-900')}>
          CampusGuard
        </span>
        {subtitle ? (
          <span className={clsx('block truncate text-xs', onDark ? 'text-slate-400' : 'text-slate-500')}>{subtitle}</span>
        ) : null}
      </span>
    </span>
  );
}
