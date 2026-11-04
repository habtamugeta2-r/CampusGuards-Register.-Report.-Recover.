import { getPlatformPageSession } from '@/lib/auth';
import { listRequests } from '@/lib/repos/platform';
import { EmptyState, PageHeader } from '@/components/ui';
import { ApplicationCard } from '@/components/platform-forms';

export const metadata = { title: 'Applications · Platform' };
export const dynamic = 'force-dynamic';

export default async function PlatformRequestsPage() {
  await getPlatformPageSession();
  const requests = await listRequests('NEW');

  return (
    <>
      <PageHeader
        title="Applications to join"
        description="Organisations that asked to be on the platform. Approving one creates the tenant, claims its domains and provisions the first administrator with a one-time password."
      />

      {requests.length === 0 ? (
        <EmptyState
          title="Nothing waiting"
          description="Applications submitted at /join land here for review."
        />
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <ApplicationCard
              key={request.id}
              application={{
                id: request.id,
                organisation_name: request.organisation_name,
                kind: request.kind,
                country: request.country,
                city: request.city,
                contact_name: request.contact_name,
                contact_email: request.contact_email,
                primary_domain: request.primary_domain,
                extra_domains: request.extra_domains ?? [],
                estimated_people: request.estimated_people,
                message: request.message,
                status: request.status,
                created_at: new Date(request.created_at).toISOString(),
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
