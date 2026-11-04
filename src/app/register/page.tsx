import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser, roleHome } from '@/lib/auth';
import { RegisterForm } from '@/components/auth-forms';
import { ShieldIcon } from '@/components/nav';
import { Card } from '@/components/ui';

export const metadata = { title: 'Create account' };
export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  const session = await getUser();
  if (session) redirect(roleHome(session.role));

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-6 flex items-center justify-center gap-2">
        <ShieldIcon className="h-8 w-8 text-brand-700" />
        <span className="text-lg font-semibold tracking-tight">CampusGuard</span>
      </Link>

      <Card className="card-pad">
        <h1 className="text-lg font-semibold text-slate-900">Create your account</h1>
        <p className="mb-5 mt-1 text-sm text-slate-500">
          Registering is voluntary. You choose what to add, and you can delete your data at any time.
        </p>
        <RegisterForm />
      </Card>

      <p className="mt-4 text-center text-xs text-slate-400">
        Read the{' '}
        <Link href="/legal/privacy" className="hover:underline">
          privacy notice
        </Link>{' '}
        and{' '}
        <Link href="/legal/data-rights" className="hover:underline">
          your data rights
        </Link>
        .
      </p>
    </div>
  );
}
