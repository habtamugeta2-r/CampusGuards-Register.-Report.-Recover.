import { getPlatformPageSession } from '@/lib/auth';
import { listDomains, listInstitutionRows } from '@/lib/repos/platform';
import { Card, CardHeader, PageHeader } from '@/components/ui';
import { CreateOrganisationForm, OrganisationsConsole } from '@/components/platform-forms';

export const metadata = { title: 'Organisations · Platform' };
export const dynamic = 'force-dynamic';

export default async function PlatformOrganisationsPage() {
  await getPlatformPageSession();
  const [rows, domains] = await Promise.all([listInstitutionRows(), listDomains()]);

  const domainsByInstitution: Record<string, typeof domains> = {};
  for (const domain of domains) {
    (domainsByInstitution[domain.institution_id] ??= []).push(domain);
  }

  const organisations = rows.map((row) => ({
    ...row,
    licence_expires_at: row.licence_expires_at ? new Date(row.licence_expires_at).toISOString() : null,
  }));

  return (
    <>
      <PageHeader
        title="Organisations"
        description="Provision a tenant: claim its email domains, choose a type, set a seat limit and a licence. The organisation’s own administrators then run it from /admin."
      />

      <Card className="mb-4">
        <CardHeader title="Add an organisation" subtitle="Anyone with an email on its domains can register from /register." />
        <div className="px-4 py-4 sm:px-6">
          <CreateOrganisationForm />
        </div>
      </Card>

      <OrganisationsConsole organisations={organisations} domainsByInstitution={domainsByInstitution} />
    </>
  );
}
