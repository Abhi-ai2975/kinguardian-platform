import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TGetOAuthClientsResponseDtoSchema } from "@/modules/entities/schemas/admin/oauthclient/oauthclient.schema";

interface OAuthClientsOverviewProps {
  clients: TGetOAuthClientsResponseDtoSchema;
}

export function OAuthClientsOverview({ clients }: OAuthClientsOverviewProps) {
  const shown = clients.slice(0, 4);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">OAuth Clients</CardTitle>
        <CardDescription>Registered applications</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {shown.map((client) => {
          const maskedId = `${client.client_id.slice(0, 8)}…`;
          const isDisabled = client.disabled;
          return (
            <div key={client.client_id} className="flex items-center gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-mono font-semibold text-muted-foreground">
                {(client.client_name ?? "?")[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-none">
                  {client.client_name ?? "Unnamed"}
                </p>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  {maskedId}
                </p>
              </div>
              <Badge
                variant={isDisabled ? "secondary" : "default"}
                className="flex-shrink-0 text-[10px]"
              >
                {isDisabled ? "disabled" : "active"}
              </Badge>
            </div>
          );
        })}
        {clients.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No clients yet</p>
        )}
      </CardContent>
    </Card>
  );
}
