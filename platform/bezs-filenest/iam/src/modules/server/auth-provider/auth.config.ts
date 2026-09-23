/**
 * @module auth-provider/auth.config
 * @description Central Better Auth configuration for the IAM server.
 *              Defines every plugin, database adapter, rate limit rule,
 *              session policy, email handler, social provider, OAuth provider setting,
 *              database hook, and auth middleware.
 * @category Configuration
 * @layer Auth Provider (Cross-cutting)
 *
 * ## Active Plugins (in order)
 *
 * | Plugin | Package | Purpose |
 * |--------|---------|---------|
 * | `openAPI` | `better-auth/plugins` | Auto-generated API reference at `/api/auth/reference` |
 * | `username` | `better-auth/plugins` | Username support with blocklist (admin, superadmin) |
 * | `twoFactor` | `better-auth/plugins` | Email OTP 2FA with `skipVerificationOnEnable` |
 * | `jwt` | `better-auth/plugins` | JWT token generation with custom payload (org context) |
 * | `organization` | `better-auth/plugins` | Multi-tenant orgs, teams, RBAC, dynamic access control |
 * | `admin` | `better-auth/plugins` | Role-based admin with `superadmin` + `guest` roles |
 * | `oauthProvider` | `@better-auth/oauth-provider` | Acts as OAuth 2.1 / OIDC authorization server |
 * | `lastLoginMethod` | `better-auth/plugins` | Tracks last used sign-in method per user |
 * | `magicLink` | `better-auth/plugins` | Passwordless sign-in via email link |
 * | `apiKey` | `@better-auth/api-key` | API key management (prefix: `fn_`) |
 * | `agentAuth` | `@better-auth/agent-auth` | AI agent identity, registration, capability execution |
 * | `customSession` | `better-auth/plugins` | Attaches nav apps, permissions, and org list to every session |
 * | `multiSession` | `better-auth/plugins` | Multiple simultaneous login sessions per user |
 * | `bearer` | `better-auth/plugins` | Accept `Authorization: Bearer <token>` for non-browser clients |
 * | `nextCookies` | `better-auth/next-js` | Cookie handling for Next.js server-side operations |
 *
 * ## Key Design Decisions
 * - `buildUserContext()` — shared function that builds nav apps, permissions,
 *   org memberships, and active role for both `customSession` and JWT payload.
 * - Session cookie cache: 60s TTL. Custom fields (apps, permissions, orgs)
 *   are NOT cached — always fetched fresh on cache miss.
 * - `requireEmailVerification: false` — toggle via `REQUIRE_EMAIL_VERIFICATION` constant.
 * - Dynamic trusted origins: fetched from registered OAuth client redirect URIs.
 * - `allowDynamicClientRegistration: false` — OAuth clients created by superadmin only.
 * - New users auto-join "drgodly" org with "patient" role on first session.
 */

"server-only";

import { randomUUID } from "crypto";

// packages import
import { APIError, type BetterAuthOptions } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware } from "better-auth/api";
// import { getJwtToken } from "better-auth/plugins/jwt";
import { oauthProvider } from "@better-auth/oauth-provider";
import {
  openAPI,
  admin,
  jwt,
  organization,
  twoFactor,
  username,
  lastLoginMethod,
  createAccessControl,
  magicLink,
  customSession,
  multiSession,
  bearer,
  haveIBeenPwned,
} from "better-auth/plugins";
import { apiKey } from "@better-auth/api-key";
import { agentAuth } from "@better-auth/agent-auth";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";
// import { createFromOpenAPI } from "@better-auth/agent-auth/openapi";

// local import
import { prisma } from "../../../../prisma/db";
import { executeCapability } from "../agent-auth/capability-executor";
import {
  getEmailVerificationTemplate,
  getPasswordResetTemplate,
  getChangeEmailTemplate,
  getDeleteAccountTemplate,
  getMagicLinkTemplate,
  getOtpTemplate,
  getExistingEmailSignupTemplate,
} from "@/modules/shared/email-templates/auth-email.templates";
import { sendAuthEmail } from "@/modules/server/utils/sendAuthEmail";
import {
  getOAuthClientOrigins,
  validAudiencesRef,
} from "./oauth-client-origins";
import { getUserPermissions } from "../utils/getUserPermissions";
import {
  DEFAULT_ORG_ROLE_PERMISSIONS,
  orgPermissionKeysToJson,
} from "../utils/org-permissions";

// ── Types for customSession context payload ──────────────────────────────────
interface NavNode {
  id: string;
  label: string;
  slug: string;
  icon: string | null;
  href: string | null;
  type: string;
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

// Warm the cache at module load so trustedOrigins and validAudiences are ready
// before the first request. Does not block module initialization.
void getOAuthClientOrigins();

// ── Shared user-context builder ───────────────────────────────────────────────
// Called by both customSession (has session → activeOrganizationId directly)
// and customUserInfoClaims (no session → resolved from latest DB session).
async function buildUserContext(userId: string, organizationId: string | null) {
  type RawNode = Awaited<
    ReturnType<typeof prisma.appMenuNode.findMany>
  >[number];

  const [permSet, memberships, appsData, userCtx] = await Promise.all([
    organizationId
      ? getUserPermissions(userId, organizationId)
      : Promise.resolve(new Set<string>()),
    prisma.member.findMany({
      where: { userId },
      select: {
        role: true,
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
    prisma.userContext.findUnique({
      where: { userId },
      select: { activeRoleId: true },
    }),
  ]);

  function filterNode(node: RawNode): boolean {
    return (
      node.permissionKeys.length === 0 ||
      node.permissionKeys.some((k) => permSet.has(k))
    );
  }

  function buildTree(
    allNodes: RawNode[],
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
            permissionKeys: n.permissionKeys,
            children,
          },
        ];
      });
  }

  const apps: NavApp[] = appsData
    .map((app) => ({
      id: app.id,
      name: app.name,
      slug: app.slug,
      menus: buildTree(app.menus),
    }))
    .filter((app) => app.menus.length > 0);

  const organizations: OrgSummary[] = memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    logo: m.organization.logo,
  }));

  const rawRole = organizationId
    ? (memberships.find((m) => m.organization.id === organizationId)?.role ??
      null)
    : null;
  const activeOrganizationRoles = rawRole
    ? rawRole.split(",").map((r) => r.trim())
    : [];

  const activeRoleId = userCtx?.activeRoleId ?? null;

  let activeRole: string | null = null;
  let activeRoleRedirectUrl: string | null = null;

  if (activeRoleId) {
    const orgRole = await prisma.organizationRole.findUnique({
      where: { id: activeRoleId },
      select: { role: true },
    });
    activeRole = orgRole?.role ?? null;

    if (activeRole && organizationId) {
      const redirect = await prisma.userOrgRoleRedirect.findUnique({
        where: {
          userId_organizationId_role: {
            userId,
            organizationId,
            role: activeRole,
          },
        },
        select: { redirectUrl: true },
      });
      activeRoleRedirectUrl = redirect?.redirectUrl ?? null;
    }
  }

  return {
    apps,
    permissions: Array.from(permSet),
    organizations,
    activeOrganizationRoles,
    activeRoleId,
    activeRole,
    activeRoleRedirectUrl,
  };
}

// Single source of truth — controls both emailAndPassword config and the
// OAuth2 authorize hook that enforces verification before the OAuth flow.
const REQUIRE_EMAIL_VERIFICATION = false;

const statement = {
  ...defaultStatements,
} as const;

const ac = createAccessControl(statement);

const superAdminRole = ac.newRole({
  ...adminAc.statements,
});

const guestRole = ac.newRole({
  user: ["get"],
});

// const spec = await fetch(process.env.FHIR_OPENAPI_URL!).then((r) => r.json());

export const authConfig = {
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // rateLimit: {
  //   window: 60,
  //   max: 50,
  //   customRules: {
  //     "/sign-in/email": { window: 60, max: 5 },
  //     "/sign-up/email": { window: 60, max: 3 },
  //     "/forget-password": { window: 300, max: 3 },
  //     "/reset-password": { window: 300, max: 5 },
  //     "/two-factor/verify-otp": { window: 60, max: 5 },
  //     "/magic-link/send-magic-link": { window: 60, max: 3 },
  //     "/oauth2/authorize": { window: 60, max: 20 },
  //     "/oauth2/token": { window: 60, max: 30 },
  //     "/agent/register": { window: 300, max: 10 },
  //     "/host/enroll": { window: 300, max: 10 },
  //     "/capability/execute": { window: 60, max: 60 },
  //     "/admin/list-users": { window: 60, max: 30 },
  //     "/admin/create-user": { window: 60, max: 10 },
  //   },
  // },

  session: {
    storeSessionInDatabase: true,
    expiresIn: 60 * 60 * 24 * 7, // 7-day absolute expiry
    updateAge: 60 * 60 * 24, // refresh if session is older than 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60, // 1 min
    },
  },

  experimental: {
    joins: true,
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Generate username for OAuth users who don't have one
          if (!user.username) {
            try {
              const base =
                user.name
                  .toLowerCase()
                  .replace(/[^a-z0-9]/g, "")
                  .slice(0, 20) || "user";

              let username = "";
              for (let i = 0; i < 10; i++) {
                const suffix = Math.floor(1000 + Math.random() * 9000);
                const candidate = `${base}${suffix}`;
                const existing = await prisma.user.findFirst({
                  where: { username: candidate },
                  select: { id: true },
                });
                if (!existing) {
                  username = candidate;
                  break;
                }
              }

              // if (username) {
              //   await prisma.user.update({
              //     where: { id: user.id },
              //     data: { username },
              //   });
              // }
              return {
                data: {
                  ...user,
                  username,
                },
              };
            } catch {
              return {
                data: {
                  ...user,
                },
              };
              // Don't block signup if username generation fails
            }
          }
        },
      },
    },

    session: {
      create: {
        before: async (session) => {
          const userCtx = await prisma.userContext.findUnique({
            where: { userId: session.userId },
            select: { activeOrganizationId: true },
          });

          // No UserContext means this is the first session after signup.
          // Leave activeOrganizationId as null — the console onboarding
          // wizard handles org creation and activation on first login.
          if (!userCtx) {
            await prisma.userContext.create({
              data: {
                userId: session.userId,
                activeOrganizationId: null,
                activeRoleId: null,
              },
            });
            return { data: { ...session, activeOrganizationId: null } };
          }

          // Existing user — prefer stored activeOrganizationId, fall back to
          // earliest membership if the context row has no org set yet.
          const activeOrganizationId =
            userCtx.activeOrganizationId ??
            (
              await prisma.member.findFirst({
                where: { userId: session.userId },
                orderBy: { createdAt: "asc" },
                select: { organizationId: true },
              })
            )?.organizationId ??
            null;

          return {
            data: { ...session, activeOrganizationId },
          };
        },
      },
    },
  },

  // advanced: {
  //   crossSubDomainCookies: {
  //     enabled: true,
  //     domain: "drgodly.com",
  //   },
  // },

  // Dynamically load redirect URI origins from registered OAuth clients.
  // Better Auth calls this async function per-request (with TTL cache).
  trustedOrigins: async () => getOAuthClientOrigins(),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: REQUIRE_EMAIL_VERIFICATION,
    sendResetPassword: async ({ user, url }) => {
      void sendAuthEmail({
        to: user.email,
        subject: "Reset your password",
        html: getPasswordResetTemplate(url, user.name),
      });
    },
    onPasswordReset: async ({ user: _user }) => {},
    onExistingUserSignUp: async ({ user }) => {
      void sendAuthEmail({
        to: user.email,
        subject: "Sign-in attempt on your account",
        html: getExistingEmailSignupTemplate(),
      });
    },
  },

  emailVerification: {
    autoSignInAfterVerification: true,
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      void sendAuthEmail({
        to: user.email,
        subject: "Verify email",
        html: getEmailVerificationTemplate(url, user.name, "FileNest"),
      });
    },
  },

  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  user: {
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async ({ user, url }) => {
        void sendAuthEmail({
          to: user.email,
          subject: "Confirm your new email address",
          html: getChangeEmailTemplate(url, user.name),
        });
      },
    },
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async ({ user, url }) => {
        void sendAuthEmail({
          to: user.email,
          subject: "Confirm account deletion",
          html: getDeleteAccountTemplate(url, user.name),
        });
      },
    },
  },

  disabledPaths: [],

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const token = ctx.getCookie(ctx.context.authCookies.sessionToken.name);

      // ── OAuth authorize: block authenticated but unverified users ───────────
      if (ctx.path === "/oauth2/authorize") {
        // Not authenticated — Better Auth redirects to loginPage automatically
        if (!token) return;

        const [sessionId] = token.split(".");
        const session =
          await ctx.context.internalAdapter.findSession(sessionId);

        if (
          session &&
          !session.user.emailVerified &&
          REQUIRE_EMAIL_VERIFICATION
        ) {
          // Preserve the full OAuth query string so the flow can resume after verification
          const requestUrl = new URL(ctx.request?.url as string);
          const authorizeRelativeUrl = `/api/auth/oauth2/authorize?${requestUrl.searchParams.toString()}`;
          const appUrl = process.env.BETTER_AUTH_URL!;
          const location = `${appUrl}/auth/email-verification?email=${encodeURIComponent(session.user.email)}&redirect=${encodeURIComponent(authorizeRelativeUrl)}`;

          return new Response(null, {
            status: 302,
            headers: { Location: location },
          });
        }

        return;
      }

      // ── Admin-only paths ─────────────────────────────────────────────────────
      const protectedPaths = new Set([
        "/oauth2/create-client",
        "/oauth2/register",
      ]);

      if (!protectedPaths.has(ctx.path)) return;

      if (!token)
        throw new APIError("UNAUTHORIZED", {
          message: "You must be logged in to perform this action",
        });

      const [sessionId] = token.split(".");

      const session = await ctx.context.internalAdapter.findSession(sessionId);

      if (!session) {
        throw new APIError("UNAUTHORIZED", {
          message: "Session expired or invalid. Please log in again.",
        });
      }

      const user = session.user;

      if (user.role !== "superadmin") {
        throw new APIError("FORBIDDEN", {
          message: "Only superadmin can create OAuth clients",
        });
      }
    }),
  },

  plugins: [
    openAPI(),

    username({
      minUsernameLength: 4,
      maxUsernameLength: 32,
      usernameValidator: (username) => {
        if (username === "admin" || username === "superadmin") {
          return false;
        }
        return true;
      },
    }),

    twoFactor({
      skipVerificationOnEnable: true,
      otpOptions: {
        sendOTP: async ({ user, otp }) => {
          void sendAuthEmail({
            to: user.email,
            subject: "Your 2FA verification code",
            html: getOtpTemplate(otp, "Your 2FA verification code"),
          });
        },
      },
    }),

    jwt({
      jwt: {
        definePayload: async ({ user, session }) => {
          const orgId = session.activeOrganizationId;

          const ctx = await buildUserContext(user.id, orgId);

          return {
            ...user,
            activeOrganizationId: session.activeOrganizationId,
            activeTeamId: session.activeTeamId,
            ...ctx,
          };
        },
      },
    }),

    organization({
      allowUserToCreateOrganization: true,
      teams: {
        enabled: true,
        allowRemovingAllTeams: true,
      },
      ac,
      dynamicAccessControl: {
        enabled: true,
      },
      organizationHooks: {
        afterCreateOrganization: async ({ organization }) => {
          // Seed the owner role with full permissions so the org creator's JWT
          // carries the right scopes from the very first session after org creation.
          // All other roles get no permissions until granted via the invite flow.
          await prisma.organizationRole.create({
            data: {
              id: randomUUID(),
              organizationId: organization.id,
              role: "owner",
              permission: orgPermissionKeysToJson(
                DEFAULT_ORG_ROLE_PERMISSIONS.owner!,
              ),
            },
          });
        },
      },
    }),

    admin({
      ac,
      roles: {
        superadmin: superAdminRole,
        guest: guestRole,
      },
      adminRoles: ["superadmin"],
      defaultRole: "guest",
    }),

    oauthProvider({
      loginPage: process.env.LOGIN_PAGE!,
      consentPage: process.env.CONSENT_PAGE!,
      signup: {
        page: process.env.SIGNUP_PAGE!,
      },

      silenceWarnings: {
        oauthAuthServerConfig: true,
      },

      scopes: ["openid", "profile", "email", "offline_access"],

      storeClientSecret: "hashed",

      allowDynamicClientRegistration: false,

      clientPrivileges: ({ user }) => {
        if (!user) return false;
        return user.role === "superadmin";
      },

      customUserInfoClaims: async ({ user, jwt }) => {
        // jwt.sid is the session ID that authorized this token.
        // Use it directly — no OauthAccessToken join needed, and it is
        // correct even when the user has multiple active sessions with
        // different activeOrganizationIds.
        const sid = (jwt as Record<string, unknown> | null)?.sid as
          | string
          | undefined;

        let organizationId: string | null = null;

        if (sid) {
          const session = await prisma.session.findUnique({
            where: { id: sid },
          });
          organizationId =
            (
              session as typeof session & {
                activeOrganizationId?: string | null;
              }
            )?.activeOrganizationId ?? null;
        }

        const ctx = await buildUserContext(user.id, organizationId);
        return { ...ctx, activeOrganizationId: organizationId };
      },

      // Mutable array reference: Better Auth reads opts.validAudiences on
      // every token/authorize request, so mutating this array in-place
      // (done by refreshOAuthClientOrigins) makes it effectively dynamic.
      validAudiences: validAudiencesRef,
    }),

    lastLoginMethod(),

    magicLink({
      sendMagicLink: async ({ email, url }) => {
        void sendAuthEmail({
          to: email,
          subject: "Your sign-in link",
          html: getMagicLinkTemplate(url),
        });
      },
    }),

    apiKey({
      defaultPrefix: "fn_",
      // referenceId = organizationId; BA validates the caller is a member of
      // that org before creating the key. Enables listApiKeys?organizationId=...
      references: "organization",
      // Allow callers to embed { organizationId, projectId, scopes } in the
      // key record so verify-api-key can return the full tenant context.
      enableMetadata: true,
      rateLimit: {
        enabled: false,
      },
    }),

    agentAuth({
      providerName: "FileNest IAM",
      providerDescription:
        "Central authentication authority for the FileNest platform",
      modes: ["delegated", "autonomous"],
      capabilities: [
        {
          name: "profile:read",
          description: "Read the authenticated user's profile",
        },
        {
          name: "organizations:read",
          description: "List organizations the user belongs to",
        },
        {
          name: "projects:read",
          description: "List FileNest projects in the active organization",
        },
        {
          name: "api_keys:read",
          description: "List API keys for the active organization",
        },
        {
          name: "api_keys:create",
          description: "Create API keys for the active organization",
        },
        {
          name: "api_keys:revoke",
          description: "Revoke API keys",
        },
      ],
      async onExecute({ capability, arguments: args, agentSession }) {
        return executeCapability(
          capability,
          (args ?? {}) as Record<string, unknown>,
          agentSession,
        );
      },
    }),

    // ── Context: attach nav apps, permissions, and org list to every session ──
    // Runs at most once per cookie-cache TTL (60 s).
    customSession(async ({ user, session }) => {
      const sessionData = session as typeof session & {
        activeOrganizationId?: string | null;
      };
      const organizationId = sessionData.activeOrganizationId ?? null;
      const ctx = await buildUserContext(user.id, organizationId);

      return {
        user,
        session: { ...session, ...ctx },
      };
    }),

    multiSession(),

    bearer(),

    // haveIBeenPwned(),

    // NOTE: This plugin make sure the application knows how to set cookies in next.js, it is required for server side operations with better-auth
    nextCookies(),
  ],
} satisfies BetterAuthOptions;
