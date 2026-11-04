import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser, roleHome } from '@/lib/auth';
import { LoginForm } from '@/components/auth-forms';
import { ShieldIcon } from '@/components/nav';
import { Card } from '@/components/ui';

export const metadata = { title: 'Sign in' };
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const session = await getUser();
  if (session) redirect(roleHome(session.role));

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-6 flex items-center justify-center gap-2">
        <ShieldIcon className="h-8 w-8 text-brand-700" />
        <span className="text-lg font-semibold tracking-tight">CampusGuard</span>
      </Link>

      <Card className="card-pad">
        <h1 className="text-lg font-semibold text-slate-900">Sign in</h1>
        <p className="mb-5 mt-1 text-sm text-slate-500">Use your university account.</p>
        <LoginForm />
      </Card>

      <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white/60 p-3 text-xs text-slate-600">
        <p className="font-semibold text-slate-700">Demo accounts (seeded data)</p>
        <ul className="mt-1 space-y-0.5">
          <li>
            Student — <span className="code-chip">abel@aastu.edu.et</span>
          </li>
          <li>
            Security officer — <span className="code-chip">officer@aastu.edu.et</span>
          </li>
          <li>
            Administrator — <span className="code-chip">admin@aastu.edu.et</span>
          </li>
          <li>
            Password for all: <span className="code-chip">Demo#2026</span>
          </li>
        </ul>
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        <Link href="/" className="hover:underline">
          ← Back to overview
        </Link>
      </p>
    </div>
  );
}
