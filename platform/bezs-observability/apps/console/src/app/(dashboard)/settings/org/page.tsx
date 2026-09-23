// Organisation settings — update the active org's name and slug.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

function toSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

export default function OrgSettingsPage() {
  const router = useRouter();
  const { data: activeOrg, isPending } = authClient.useActiveOrganization();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeOrg) {
      setName(activeOrg.name);
      setSlug(activeOrg.slug);
    }
  }, [activeOrg]);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugEdited) setSlug(toSlug(value));
  }

  function handleSlugChange(value: string) {
    setSlugEdited(true);
    setSlug(toSlug(value));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrg) return;
    setSaving(true);
    const { error } = await authClient.organization.update({
      organizationId: activeOrg.id,
      data: { name: name.trim(), slug: slug.trim() },
    });
    if (error) {
      toast.error(error.message ?? "Failed to save changes");
    } else {
      toast.success("Organisation updated");
      router.refresh();
    }
    setSaving(false);
  }

  if (isPending) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Organisation</h1>
        <p className="text-sm text-muted-foreground">
          Manage your organisation's name and URL slug
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
          <CardDescription>
            Changes to the slug will affect all shared links.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organisation name</Label>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-slug">
                URL slug
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  app.watcher24.com/
                  <span className="text-foreground">{slug || "your-org"}</span>
                </span>
              </Label>
              <Input
                id="org-slug"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                pattern="[a-z0-9-]+"
                required
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={
                  saving ||
                  !name.trim() ||
                  !slug.trim() ||
                  (name === activeOrg?.name && slug === activeOrg?.slug)
                }
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Separator />

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            Danger Zone
          </CardTitle>
          <CardDescription>
            Deleting the organisation is permanent and cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" size="sm" disabled>
            Delete organisation
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Contact support to delete your organisation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
