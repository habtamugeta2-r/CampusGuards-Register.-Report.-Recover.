import { AppShell } from '@/components/app-shell';
import { ProductForm } from '@/components/forms';
import { Card, PageHeader } from '@/components/ui';
import { Alert } from '@/components/ui';

export const metadata = { title: 'Register a device' };
export const dynamic = 'force-dynamic';

export default function NewProductPage() {
  return (
    <AppShell roles={['STUDENT']}>
      <PageHeader
        title="Register a device"
        description="Add one device at a time. Accuracy matters more than completeness — a serial number can prove a device is yours."
      />
      <Card className="card-pad">
        <ProductForm />
      </Card>
      <div className="mt-4">
        <Alert tone="info" title="What we do with this">
          The details you enter are visible to you and to the university’s lost-property desk. Security officers scanning
          your device see only its description, your name and its status — never your serial number, email or phone.
        </Alert>
      </div>
    </AppShell>
  );
}
