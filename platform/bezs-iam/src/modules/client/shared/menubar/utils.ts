export type RbacSessionDataType = {
  id: string;
  organizationId: string;
  userId: string;
  roleId: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    metadata: any;
    appOrganization: {
      appId: string;
      organizationId: string;
      createdAt: string;
      updatedAt: string;
      app: {
        id: string;
        name: string;
        description: string;
        slug: string;
        type: string;
        imageUrl: string | null;
        createdAt: string;
        updatedAt: string;
      };
    }[];
  };
  role: {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    menuPermission: {
      id: string;
      roleId: string;
      appId: string;
      appMenuItemId: string;
      createdAt: string;
      updatedAt: string;
      app: {
        id: string;
        name: string;
        description: string;
        slug: string;
        type: string;
        imageUrl: string | null;
        createdAt: string;
        updatedAt: string;
      };
      appMenuItem: {
        id: string;
        name: string;
        description: string;
        slug: string;
        icon: string;
        appId: string;
        createdAt: string;
        updatedAt: string;
      };
    }[];
  };
};

type AppMenuItem = {
  name: string;
  slug: string;
  icon: string;
  description: string;
};

type MenuConfig = {
  [appName: string]: AppMenuItem[];
};

export function getRolewiseAppMenuItems(
  rbacSessionData: RbacSessionDataType[],
  appName: string
) {
  if (!appName || !rbacSessionData) return null;

  const orgApps = new Set(
    rbacSessionData.flatMap(
      (data) =>
        data?.organization?.appOrganization.map((app) => app?.appId) || []
    )
  );

  const uniqueApps = new Set();

  rbacSessionData.forEach((data) => {
    data?.role?.menuPermission.forEach((menuItem) => {
      const appName = menuItem.app.slug.split("/").pop();
      const isOrgApp = orgApps.has(menuItem.app.id);

      if (isOrgApp) {
        uniqueApps.add(appName);
      }
    });
  });

  const uniqueAppsMenuItems: MenuConfig = {};

  uniqueApps.forEach((app) => {
    uniqueAppsMenuItems[app as string] = [];
  });

  rbacSessionData?.forEach((data) => {
    data?.role?.menuPermission.forEach((menuItem) => {
      const isOrgApp = orgApps.has(menuItem.app.id);
      const appName = menuItem.app.slug.split("/").pop() || "";

      if (isOrgApp) {
        if (uniqueApps.has(appName)) {
          if (
            !uniqueAppsMenuItems[appName].find(
              (data) => data.slug === menuItem.appMenuItem.slug
            )
          ) {
            uniqueAppsMenuItems[appName].push({
              name: menuItem.appMenuItem.name,
              slug: menuItem.appMenuItem.slug,
              icon: menuItem.appMenuItem.icon,
              description: menuItem.appMenuItem.description,
            });
          }
        }
      }
    });
  });

  return uniqueAppsMenuItems[appName];
}

export function getRoleOrgWiseApps(rbacSessionData: any, userRole: string) {
  const orgApps = new Set(
    rbacSessionData.flatMap(
      (data: any) =>
        data?.organization?.appOrganization.map((app: any) => app?.appId) || []
    )
  );

  const uniqueApps: any = [];

  rbacSessionData.forEach((data: any) => {
    if (data?.role?.name === userRole) {
      data?.role?.menuPermission.forEach((menuItem: any) => {
        const isOrgApp = orgApps.has(menuItem.app.id);

        if (isOrgApp) {
          if (!uniqueApps.find((app: any) => app.name === menuItem.app.name)) {
            uniqueApps.push({
              name: menuItem.app.name,
              imageUrl: menuItem.app.imageUrl,
              slug: menuItem.app.slug,
            });
          }
        }
      });
    }
  });

  return uniqueApps;
}
