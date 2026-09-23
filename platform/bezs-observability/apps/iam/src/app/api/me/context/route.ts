import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/modules/server/auth-provider/auth";
import { prisma } from "../../../../../prisma/db";
import { getUserPermissions } from "@/modules/server/utils/getUserPermissions";

interface NavNode {
  id: string;
  label: string;
  slug: string;
  icon: string | null;
  href: string | null;
  type: string;
  isVisible: boolean;
  permissionKeys: string[];
  children: NavNode[];
}

interface NavApp {
  id: string;
  name: string;
  slug: string;
  menus: NavNode[];
}

interface OrgSummary {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionData = session.session as typeof session.session & {
    activeOrganizationId?: string | null;
  };

  const organizationId =
    req.nextUrl.searchParams.get("organizationId") ??
    sessionData.activeOrganizationId;

  const [permSet, memberships, appsWithMenus] = await Promise.all([
    organizationId
      ? getUserPermissions(session.user.id, organizationId)
      : Promise.resolve(new Set<string>()),
    prisma.member.findMany({
      where: { userId: session.user.id },
      select: {
        organization: {
          select: { id: true, name: true, slug: true, logo: true },
        },
      },
    }),
    prisma.app.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
      include: {
        menus: {
          where: { isActive: true },
          orderBy: { order: "asc" },
        },
      },
    }),
  ]);

  const organizations: OrgSummary[] = memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    logo: m.organization.logo,
  }));

  function filterNode(node: { permissionKeys: string[] }): boolean {
    return (
      node.permissionKeys.length === 0 ||
      node.permissionKeys.some((k) => permSet.has(k))
    );
  }

  function buildTree(
    allNodes: (typeof appsWithMenus)[number]["menus"],
    parentId: string | null = null,
  ): NavNode[] {
    return allNodes
      .filter((n) => (n.parentId ?? null) === parentId)
      .flatMap((n) => {
        if (!filterNode(n)) return [];
        const children = buildTree(allNodes, n.id);
        if (n.type === "GROUP" && children.length === 0) return [];
        return [
          {
            id: n.id,
            label: n.label,
            slug: n.slug,
            icon: n.icon ?? null,
            href: n.href ?? null,
            type: n.type,
            isVisible: n.isVisible,
            permissionKeys: n.permissionKeys,
            children,
          },
        ];
      });
  }

  const apps: NavApp[] = appsWithMenus
    .map((app) => ({
      id: app.id,
      name: app.name,
      slug: app.slug,
      menus: buildTree(app.menus),
    }))
    .filter((app) => app.menus.length > 0);

  return NextResponse.json({
    apps,
    permissions: Array.from(permSet),
    organizations,
    activeOrganizationId: sessionData.activeOrganizationId ?? null,
  });
}
