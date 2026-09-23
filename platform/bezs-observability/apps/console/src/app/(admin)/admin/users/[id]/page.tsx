// Admin user detail — shows user info, role, ban status, and quick actions.
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  ShieldBan,
  ShieldCheck,
  LogOut,
  Mail,
  Calendar,
  Shield,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  role: string | null;
  banned: boolean | null;
  banReason: string | null;
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>("");

  // Fetch via list endpoint with search — there's no single-user admin endpoint.
  const { data, isLoading } = useQuery<{ users: AdminUser[] }>({
    queryKey: ["admin-user", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users?limit=500`);
      if (!res.ok) throw new Error("Failed to load user");
      return res.json();
    },
    select: (d) => ({
      users: d.users.filter((u) => u.id === id),
    }),
  });

  const user = data?.users[0];

  const mutation = useMutation({
    mutationFn: async ({
      action,
      role,
    }: {
      action: string;
      role?: string;
    }) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, role }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed");
      }
    },
    onSuccess: (_, vars) => {
      const labels: Record<string, string> = {
        ban: "User banned",
        unban: "User unbanned",
        "set-role": "Role updated",
        "revoke-sessions": "Sessions revoked",
      };
      toast.success(labels[vars.action] ?? "Done");
      qc.invalidateQueries({ queryKey: ["admin-user", id] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl">
        <p className="text-muted-foreground">User not found.</p>
        <Button variant="outline" size="sm" asChild className="mt-4">
          <Link href="/admin/users">← Back to users</Link>
        </Button>
      </div>
    );
  }

  const currentRole = user.role ?? "user";

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-7 w-7">
          <Link href="/admin/users">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{user.name || "—"}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        {user.banned && (
          <Badge variant="destructive" className="ml-auto">Banned</Badge>
        )}
      </div>

      {/* User info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">User details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium">{user.email}</p>
              {!user.emailVerified && (
                <p className="text-xs text-yellow-600">Not verified</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Role</p>
              <Badge variant="secondary" className="capitalize text-xs">
                {currentRole}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Joined</p>
              <p className="text-sm font-medium">
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          {user.banned && user.banReason && (
            <div>
              <p className="text-xs text-muted-foreground">Ban reason</p>
              <p className="text-sm text-destructive">{user.banReason}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Ban / Unban */}
          {user.banned ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Unban user</p>
                <p className="text-xs text-muted-foreground">
                  Restore access to the platform
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => mutation.mutate({ action: "unban" })}
                disabled={mutation.isPending}
              >
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                Unban
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Ban user</p>
                <p className="text-xs text-muted-foreground">
                  Immediately block this user&apos;s access
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-yellow-600 border-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-950/20"
                onClick={() => mutation.mutate({ action: "ban" })}
                disabled={mutation.isPending}
              >
                <ShieldBan className="mr-1.5 h-3.5 w-3.5" />
                Ban
              </Button>
            </div>
          )}

          {/* Change role */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Change role</p>
              <p className="text-xs text-muted-foreground">
                Current: <strong>{currentRole}</strong>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={selectedRole || currentRole}
                onValueChange={setSelectedRole}
              >
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">user</SelectItem>
                  <SelectItem value="admin">admin</SelectItem>
                  <SelectItem value="superadmin">superadmin</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-8"
                onClick={() =>
                  mutation.mutate({
                    action: "set-role",
                    role: selectedRole || currentRole,
                  })
                }
                disabled={
                  mutation.isPending ||
                  (selectedRole || currentRole) === currentRole
                }
              >
                Save
              </Button>
            </div>
          </div>

          {/* Revoke sessions */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Revoke all sessions</p>
              <p className="text-xs text-muted-foreground">
                Force sign out from all devices
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => mutation.mutate({ action: "revoke-sessions" })}
              disabled={mutation.isPending}
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              Revoke
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
