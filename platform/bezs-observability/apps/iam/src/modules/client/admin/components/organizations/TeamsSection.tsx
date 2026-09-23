"use client";

import { Edit, Plus, Trash2, UserMinus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminStore } from "../../stores/admin.store";
import { TOrgTeam } from "../../types/organizations.type";
import { formatSmartDate } from "@/modules/shared/helper";

interface TeamsSectionProps {
  teams: TOrgTeam[];
  organizationId: string;
}

export function TeamsSection({ teams, organizationId }: TeamsSectionProps) {
  const openModal = useAdminStore((state) => state.onOpen);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => openModal({ type: "createTeam", data: { organizationId } })}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Team
        </Button>
      </div>

      {teams.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No teams yet. Create one to get started.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {teams.map((team) => (
            <Card key={team.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{team.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() =>
                        openModal({
                          type: "updateTeam",
                          data: { teamId: team.id, teamName: team.name, organizationId },
                        })
                      }
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-rose-600 hover:text-rose-600 dark:text-rose-500"
                      onClick={() =>
                        openModal({
                          type: "removeTeam",
                          data: { teamId: team.id, teamName: team.name, organizationId },
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {team.teammembers.length} member{team.teammembers.length !== 1 ? "s" : ""}
                  {team.createdAt && ` · Created ${formatSmartDate(team.createdAt)}`}
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {team.teammembers.map((tm) => (
                  <div key={tm.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {tm.user.image ? (
                        <img
                          src={tm.user.image}
                          alt={tm.user.name}
                          className="h-6 w-6 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                          {tm.user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium leading-none">{tm.user.name}</p>
                        <p className="text-xs text-muted-foreground">{tm.user.email}</p>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-rose-600 hover:text-rose-600 dark:text-rose-500 shrink-0"
                      onClick={() =>
                        openModal({
                          type: "removeTeamMember",
                          data: {
                            teamMemberId: tm.id,
                            memberName: tm.user.name,
                            teamId: team.id,
                            teamName: team.name,
                            organizationId,
                          },
                        })
                      }
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-2 gap-1"
                  onClick={() =>
                    openModal({
                      type: "addTeamMember",
                      data: { teamId: team.id, teamName: team.name, organizationId },
                    })
                  }
                >
                  <UserPlus className="h-4 w-4" />
                  Add Member
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
