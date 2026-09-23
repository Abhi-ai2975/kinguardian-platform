export type User = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
  username: string;
  displayUsername: string | null;
  twoFactorEnabled: boolean;
  role: string;
  banned: boolean;
  banReason: string | null;
  banExpires: string | null;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
};

export type Session = {
  id: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  ipAddress: string;
  userAgent: string;
  userId: string;
  activeOrganizationId: string | null;
  activeTeamId: string | null;
  impersonatedBy: string | null;
  apps: unknown[];
  permissions: string[];
  organizations: Organization[];
  activeOrganizationRoles: string[];
  activeRoleId: string;
  activeRole: string;
  activeRoleRedirectUrl: string | null;
};

export type AuthResponse = {
  user: User;
  session: Session;
};
