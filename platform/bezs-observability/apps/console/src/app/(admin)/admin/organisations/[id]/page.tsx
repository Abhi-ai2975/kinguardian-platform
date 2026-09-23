// Admin org detail — shows org info, subscription, and member list.
"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Calendar, Hash } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface OrgMember {
  memberId: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  joinedAt: string;
}

interface OrgDetail {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: string;
  memberCount: number;
  plan: string | null;
  subscriptionStatus: string | null;
  members: OrgMember[];
}

const ROLE_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  owner: "default",
  admin: "secondary",
  member: "secondary",
};

export default function AdminOrgDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery<OrgDetail>({
    queryKey: ["admin-org", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/organisations/${id}`);
      if (!res.ok) throw new Error("Failed to load organisation");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-7 w-7">
          <Link href="/admin/organisations">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{data.name}</h1>
          <p className="text-sm text-muted-foreground">{data.slug}</p>
        </div>
      </div>

      {/* Info card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organisation details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">ID</p>
              <p className="text-xs font-mono truncate max-w-[120px]">{data.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="text-sm font-medium">
                {new Date(data.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Members</p>
              <p className="text-sm font-medium">{data.memberCount}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Plan</p>
            <Badge variant="secondary" className="capitalize">
              {data.plan ?? "free"}
            </Badge>
          </div>
          {data.subscriptionStatus && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Subscription</p>
              <Badge
                variant={data.subscriptionStatus === "active" ? "default" : "secondary"}
                className="capitalize"
              >
                {data.subscriptionStatus}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members ({data.members.length})</CardTitle>
          <CardDescription>All members of this organisation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.members.map((m) => (
            <div
              key={m.memberId}
              className="flex items-center gap-3 rounded-md border px-3 py-2.5"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {(m.userName || m.userEmail)[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.userName || "—"}</p>
                <p className="text-xs text-muted-foreground truncate">{m.userEmail}</p>
              </div>
              <Badge
                variant={ROLE_VARIANT[m.role] ?? "secondary"}
                className="text-xs capitalize shrink-0"
              >
                {m.role}
              </Badge>
              <p className="text-xs text-muted-foreground shrink-0">
                {new Date(m.joinedAt).toLocaleDateString()}
              </p>
            </div>
          ))}
          {data.members.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No members
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
