"use client";

import { AlertCircle, Building2, Mail, Shield, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button, buttonVariants } from "@/components/ui/button";
import { IOrgDetailProps } from "../../types/organizations.type";
import { EmptyState } from "@/modules/client/shared/components/EmptyState";
import { useAdminStore } from "../../stores/admin.store";
import DataTable from "@/modules/client/shared/components/table/data-table";
import { membersTableColumn } from "./MembersTableColumn";
import { invitationsTableColumn } from "./InvitationsTableColumn";
import { TeamsSection } from "./TeamsSection";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

function OrganizationDetail({ organization, error }: IOrgDetailProps) {
  const openModal = useAdminStore((state) => state.onOpen);

  if (error) {
    return (
      <EmptyState
        icon={<AlertCircle />}
        title="An Unexpected Error Occurred!"
        description={error.message || "Please try again later."}
        error={error}
      />
    );
  }

  if (!organization) {
    return (
      <EmptyState
        icon={<Building2 />}
        title="Organization Not Found"
        description="This organization does not exist or was deleted."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link
          href={`/admin/organizations/${organization.id}/roles`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
        >
          <Shield className="h-4 w-4" />
          Manage Roles
        </Link>
      </div>
    <Tabs defaultValue="members" className="space-y-6">
      <TabsList>
        <TabsTrigger value="members" className="gap-2">
          <Users className="h-4 w-4" />
          Members ({organization.members.length})
        </TabsTrigger>
        <TabsTrigger value="invitations" className="gap-2">
          <Mail className="h-4 w-4" />
          Invitations ({organization.invitations.length})
        </TabsTrigger>
        <TabsTrigger value="teams" className="gap-2">
          <Building2 className="h-4 w-4" />
          Teams ({organization.teams.length})
        </TabsTrigger>
      </TabsList>

      {/* Members */}
      <TabsContent value="members" className="space-y-4">
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() =>
              openModal({ type: "addMember", data: { organizationId: organization.id } })
            }
          >
            <Users className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        </div>
        <DataTable
          columns={membersTableColumn(organization.id)}
          data={organization.members}
          dataSize={organization.members.length}
          label="Member"
          isAddButton={false}
          searchField="user"
          fallbackText="No Members Found"
        />
      </TabsContent>

      {/* Invitations */}
      <TabsContent value="invitations" className="space-y-4">
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() =>
              openModal({ type: "createInvitation", data: { organizationId: organization.id } })
            }
          >
            <Mail className="mr-2 h-4 w-4" />
            Send Invitation
          </Button>
        </div>
        <DataTable
          columns={invitationsTableColumn(organization.id)}
          data={organization.invitations}
          dataSize={organization.invitations.length}
          label="Invitation"
          isAddButton={false}
          searchField="email"
          fallbackText="No Invitations Found"
        />
      </TabsContent>

      {/* Teams */}
      <TabsContent value="teams">
        <TeamsSection teams={organization.teams} organizationId={organization.id} />
      </TabsContent>
    </Tabs>
    </div>
  );
}

export default OrganizationDetail;
