export const adminSidebarData = {
  navGroups: [
    {
      title: "OVERVIEW",
      items: [
        {
          title: "Dashboard",
          url: "/admin",
          icon: "layout-dashboard",
        },
      ],
    },

    // Identity (BetterAuth domain)
    {
      title: "IDENTITY",
      items: [
        {
          title: "Users",
          url: "/admin/users",
          icon: "users",
        },
        {
          title: "Organizations",
          url: "/admin/organizations",
          icon: "building-2",
        },
      ],
    },

    // Authorization (THIS is where your changes matter)
    {
      title: "AUTHORIZATION",
      items: [
        {
          title: "Resources",
          url: "/admin/resources",
          icon: "database",
        },
        {
          title: "Actions",
          url: "/admin/resource-actions",
          icon: "zap",
        },
      ],
    },

    // App + UI layer
    {
      title: "APPLICATION BUILDER",
      items: [
        {
          title: "Apps",
          url: "/admin/apps",
          icon: "grid",
        },
      ],
    },

    // System integrations
    {
      title: "APPLICATION",
      items: [
        {
          title: "OAuth Clients",
          url: "/admin/oauth-clients",
          icon: "globe",
        },
        {
          title: "Agent Auth",
          url: "/admin/agent-auth",
          icon: "bot",
        },
        {
          title: "Consents",
          url: "/admin/consents",
          icon: "file-check",
        },
        {
          title: "API Keys",
          url: "/admin/api-keys",
          icon: "key",
        },
      ],
    },

    // Security
    {
      title: "SECURITY",
      items: [
        {
          title: "Sessions",
          url: "/admin/sessions",
          icon: "activity",
        },
        {
          title: "Audit Logs",
          url: "/admin/audit-logs",
          icon: "scroll-text",
        },
        {
          title: "Security Policies",
          url: "/admin/security-policies",
          icon: "shield-check",
        },
      ],
    },
  ],
};

/* 
sample data

{
  title: "IDENTITY",
  items: [
    {
      title: "Users",
      icon: "users",
      items: [
        {
          title: "All Users",
          url: "/admin/users",
        },
        {
          title: "User Roles",
          url: "/admin/users/roles",
        },
      ],
    },
    {
      title: "Organizations",
      icon: "building-2",
      items: [
        {
          title: "All Organizations",
          url: "/admin/organizations",
        },
      ],
    },
    {
      title: "Teams",
      icon: "users",
      items: [
        {
          title: "All Teams",
          url: "/admin/teams",
        },
      ],
    },
  ],
}
*/
