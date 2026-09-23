import OAuthClientsTable from "@/modules/client/admin/components/oauth-clients/OAuthClientsTable";
import { getOAuthClientsAction } from "@/modules/server/presentation/actions/admin";
import { requireRole } from "@/modules/server/shared/auth/require-role";

async function OAuthClientsPage() {
  await requireRole(["superadmin"]);

  const [oauthClients, error] = await getOAuthClientsAction();

  return (
    <div className="space-y-8 w-full">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">OAuth Clients</h1>
        <p className="text-sm">
          Manage applications registered to authenticate users via OAuth
          Provider.
        </p>
      </div>
      <OAuthClientsTable oauthClients={oauthClients} error={error} />
    </div>
  );
}

export default OAuthClientsPage;
