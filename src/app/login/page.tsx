import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser, roleHome } from '@/lib/auth';
import { LoginForm } from '@/components/auth-forms';
import { AuthLayout } from '@/components/auth-layout';
import { Card } from '@/components/ui';

export const metadata = { title: 'Sign in' };
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const session = await getUser();
  if (session) redirect(roleHome(session.role, session.platformRole));

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in with the account your organisation gave you."
      footer={
        <p className="text-center text-xs text-slate-500">
          <Link href="/" className="hover:underline">
            ← Back to overview
          </Link>
        </p>
      }
    >
      <Card className="card-pad">
        <LoginForm demo />
      </Card>
    </AuthLayout>
  );
}
