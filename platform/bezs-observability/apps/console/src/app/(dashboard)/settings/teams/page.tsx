// Teams settings — create and manage sub-groups of org members.
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, UsersRound } from "lucide-react";

interface Team {
  id: string;
  name: string;
  organizationId: string;
  createdAt: string | Date;
}

export default function TeamsPage() {
  const qc = useQueryClient();
  const [teamName, setTeamName] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: teams, isLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const result = await authClient.organization.listTeams();
      return (result.data ?? []) as Team[];
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await authClient.organization.removeTeam({ teamId });
      if (error) throw new Error(error.message ?? "Failed to remove team");
    },
    onSuccess: () => {
      toast.success("Team removed");
      qc.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName.trim()) return;
    setCreating(true);
    const { error } = await authClient.organization.createTeam({
      name: teamName.trim(),
    });
    if (error) {
      toast.error(error.message ?? "Failed to create team");
    } else {
      toast.success("Team created");
      setTeamName("");
      qc.invalidateQueries({ queryKey: ["teams"] });
    }
    setCreating(false);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Teams</h1>
        <p className="text-sm text-muted-foreground">
          Organise members into teams for easier access control
        </p>
      </div>

      {/* Create team */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create team
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex gap-3">
            <div className="flex-1 space-y-1">
              <Label htmlFor="team-name" className="text-xs">
                Team name
              </Label>
              <Input
                id="team-name"
                placeholder="e.g. Engineering"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="h-8 text-sm"
                required
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" size="sm" disabled={creating || !teamName.trim()}>
                {creating ? "Creating…" : "Create"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Team list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UsersRound className="h-4 w-4" />
            Teams{" "}
            {teams && (
              <span className="text-muted-foreground font-normal">
                ({teams.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : teams?.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No teams yet. Create one above.
            </p>
          ) : (
            <div className="space-y-2">
              {teams?.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between rounded-md border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                      <UsersRound className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">{team.name}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => removeMutation.mutate(team.id)}
                    disabled={removeMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
