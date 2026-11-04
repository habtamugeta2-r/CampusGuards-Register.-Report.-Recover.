import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser, roleHome } from '@/lib/auth';
import { RegisterForm } from '@/components/auth-forms';
import { AuthLayout } from '@/components/auth-layout';
import { Card } from '@/components/ui';

export const metadata = { title: 'Create account' };
export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  const session = await getUser();
  if (session) redirect(roleHome(session.role, session.platformRole));

  return (
    <AuthLayout
      wide
      title="Create your account"
      subtitle="Registering is voluntary. You choose what to add, and you can delete your data at any time."
      footer={
        <div className="space-y-2 text-center text-xs text-slate-500">
          <p>
            Read the{' '}
            <Link href="/legal/privacy" className="font-medium text-brand-700 hover:underline">
              privacy notice
            </Link>{' '}
            and{' '}
            <Link href="/legal/data-rights" className="font-medium text-brand-700 hover:underline">
              your data rights
            </Link>
            .
          </p>
          <p>
            Your organisation is not on CampusGuard yet?{' '}
            <Link href="/join" className="font-medium text-brand-700 hover:underline">
              Ask them to join
            </Link>
            .
          </p>
        </div>
      }
    >
      <Card className="card-pad">
        <RegisterForm />
      </Card>
    </AuthLayout>
  );
}
