# FileNest v1.0 — Admin Dashboard & Console UI

**Version:** 1.0.0
**Status:** Approved for Engineering
**Last Updated:** 2026-06-15

---

## Table of Contents

1. [Architecture](#1-architecture)
2. [Authentication & User Accounts](#2-authentication--user-accounts)
3. [Navigation Structure](#3-navigation-structure)
4. [Page Specifications](#4-page-specifications)
5. [Component Library](#5-component-library)
6. [State Management](#6-state-management)
7. [API Integration Layer](#7-api-integration-layer)
8. [Onboarding Flow](#8-onboarding-flow)
9. [Team Management](#9-team-management)
10. [Security Considerations](#10-security-considerations)

---

## 1. Architecture

### 1.1 Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Framework | Next.js 14 (App Router) | SSR for initial load, client nav for UX |
| Language | TypeScript | Full type safety with FileNest SDK types |
| UI Components | shadcn/ui + Radix UI | Accessible, unstyled primitives |
| Styling | Tailwind CSS | Utility-first, consistent with FileNest brand |
| Data Fetching | TanStack Query v5 | Caching, pagination, optimistic updates |
| Forms | React Hook Form + Zod | Schema-validated forms |
| File UI | `@filenest/react` | FileExplorer, FilePreview, FileUpload from own SDK |
| Charts | Recharts | Usage/billing charts |
| Tables | TanStack Table v8 | Sortable, filterable data tables |
| Auth | Custom session (httpOnly cookie + refresh token) | No NextAuth dependency |
| Deployment | Vercel or same K8s cluster | |

### 1.2 Application Routes

```
/                          → Redirect to /dashboard or /login
/login                     → Email + password login
/signup                    → New organization signup
/verify-email              → Email verification
/forgot-password           → Password reset request
/reset-password            → Password reset form

/dashboard                 → Overview page (default project)
/onboarding                → First-run wizard

/projects                  → Project list
/projects/new              → Create project wizard
/projects/[id]             → Project overview
/projects/[id]/files       → File explorer
/projects/[id]/search      → Search interface
/projects/[id]/settings    → Project settings tabs

/org/settings              → Organization settings
/org/team                  → Team members + roles
/org/api-keys              → API key management
/org/service-accounts      → Service account management
/org/usage                 → Usage & billing
/org/audit                 → Audit log viewer
/org/compliance            → Compliance status + reports
/org/webhooks              → Webhook management
/org/notifications         → Notification preferences
```

### 1.3 Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ SIDEBAR (240px fixed)     │  MAIN CONTENT AREA                  │
│                           │                                     │
│  [FileNest logo]          │  [Breadcrumb]                       │
│  [Org switcher ▼]         │  [Page header + actions]            │
│                           │  ─────────────────────────          │
│  ● Dashboard              │                                     │
│  ● Projects               │  [Page content]                     │
│    └ patient-records      │                                     │
│    └ legal-docs           │                                     │
│  ─────────────────        │                                     │
│  Organization             │                                     │
│  ● Team                   │                                     │
│  ● API Keys               │                                     │
│  ● Usage & Billing        │                                     │
│  ● Audit Logs             │                                     │
│  ● Compliance             │                                     │
│  ● Webhooks               │                                     │
│  ─────────────────        │                                     │
│  [User avatar]            │                                     │
│  [Settings] [Logout]      │                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication & User Accounts

### 2.1 User Account Model

The dashboard has its own user authentication system separate from API keys. Users log in with email + password to access the dashboard. API keys are a separate credential type used by applications.

```python
# Database table (additions to 03_Database_Design.md schema)
class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(unique=True, nullable=False)
    email_verified: Mapped[bool] = mapped_column(default=False)
    email_verified_at: Mapped[datetime | None]
    password_hash: Mapped[str] = mapped_column(nullable=False)  # bcrypt
    first_name: Mapped[str]
    last_name: Mapped[str]
    avatar_url: Mapped[str | None]
    last_login_at: Mapped[datetime | None]
    failed_login_count: Mapped[int] = mapped_column(default=0)
    locked_until: Mapped[datetime | None]
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
```

### 2.2 Session Authentication

```python
# Dashboard auth uses httpOnly session cookies — NOT API keys
class DashboardAuthService:

    async def login(self, email: str, password: str, db: AsyncSession) -> SessionToken:
        user = await db.scalar(select(User).where(User.email == email))

        if user is None:
            raise InvalidCredentials()

        # Brute force protection
        if user.locked_until and user.locked_until > datetime.utcnow():
            raise AccountLocked(locked_until=user.locked_until)

        if not bcrypt.checkpw(password.encode(), user.password_hash.encode()):
            await self._record_failed_attempt(user, db)
            raise InvalidCredentials()

        # Create session
        session = UserSession(
            id=new_id("sess"),
            user_id=user.id,
            expires_at=datetime.utcnow() + timedelta(days=7),
            created_at=datetime.utcnow(),
        )
        db.add(session)
        await db.commit()

        return session

    async def _record_failed_attempt(self, user: User, db: AsyncSession) -> None:
        new_count = user.failed_login_count + 1
        locked_until = None
        if new_count >= 10:
            locked_until = datetime.utcnow() + timedelta(minutes=30)

        await db.execute(
            update(User)
            .where(User.id == user.id)
            .values(failed_login_count=new_count, locked_until=locked_until)
        )
```

### 2.3 Dashboard API Routes (Next.js)

```typescript
// app/api/auth/login/route.ts
export async function POST(req: Request) {
  const { email, password } = await req.json()

  const response = await fetch(`${process.env.API_URL}/v1/dashboard/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    const error = await response.json()
    return NextResponse.json(error, { status: response.status })
  }

  const { session_token, expires_at } = await response.json()

  const res = NextResponse.json({ success: true })
  res.cookies.set("fn_session", session_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(expires_at),
    path: "/",
  })
  return res
}
```

---

## 3. Navigation Structure

### 3.1 Sidebar Component

```tsx
// components/layout/Sidebar.tsx
export function Sidebar() {
  const { org, projects } = useOrg()
  const { pathname } = usePathname()

  return (
    <aside className="w-60 h-screen bg-gray-950 text-gray-200 flex flex-col fixed left-0 top-0">
      <div className="p-4 border-b border-gray-800">
        <Logo />
        <OrgSwitcher orgs={userOrgs} currentOrg={org} />
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <NavItem href="/dashboard" icon={<LayoutDashboard />} label="Dashboard" />

        <NavSection label="Projects">
          {projects.map(p => (
            <NavItem
              key={p.id}
              href={`/projects/${p.id}/files`}
              label={p.name}
              badge={p.config.compliance?.profile}
            />
          ))}
          <NavItem href="/projects/new" icon={<Plus />} label="New project" muted />
        </NavSection>

        <NavSection label="Organization">
          <NavItem href="/org/team" icon={<Users />} label="Team" />
          <NavItem href="/org/api-keys" icon={<Key />} label="API Keys" />
          <NavItem href="/org/usage" icon={<BarChart2 />} label="Usage & Billing" />
          <NavItem href="/org/audit" icon={<Shield />} label="Audit Logs" />
          <NavItem href="/org/compliance" icon={<CheckSquare />} label="Compliance" />
          <NavItem href="/org/webhooks" icon={<Webhook />} label="Webhooks" />
        </NavSection>
      </nav>

      <UserMenu />
    </aside>
  )
}
```

---

## 4. Page Specifications

### 4.1 Dashboard (Overview)

```
┌─────────────────────────────────────────────────────────────┐
│ Dashboard                              [+ New Project]      │
├─────────────────────────────────────────────────────────────┤
│ USAGE THIS MONTH                                           │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│ │ 45.2 GB  │ │ 12,045   │ │ 234,891  │ │  4,521   │     │
│ │ Storage  │ │ Processed│ │ API Req  │ │ Searches │     │
│ │ 45% used │ │ 12% used │ │ 23% used │ │  5% used │     │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
├─────────────────────────────────────────────────────────────┤
│ PROJECTS                                                    │
│ ┌────────────────────────────────────────────────────┐    │
│ │ patient-records    Healthcare  │ 8.2k files │ Prod │    │
│ │ legal-documents    Legal       │ 1.4k files │ Prod │    │
│ │ general-storage    Generic     │  342 files │ Dev  │    │
│ └────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│ RECENT ACTIVITY                      PROCESSING STATUS      │
│ 10:32 file.uploaded  • discharge..  │ Queue depth: 12      │
│ 10:31 file.processed • report.pdf   │ 3 workers active     │
│ 10:28 api_key.rotated               │ Last failure: none   │
│ 10:15 file.uploaded  • claim.pdf    │                      │
└─────────────────────────────────────────────────────────────┘
```

```tsx
// app/dashboard/page.tsx
export default async function DashboardPage() {
  return (
    <PageLayout title="Dashboard" action={<NewProjectButton />}>
      <UsageSummaryCards />
      <div className="grid grid-cols-3 gap-6 mt-6">
        <div className="col-span-2">
          <ProjectList />
        </div>
        <div>
          <RecentActivityFeed />
          <ProcessingStatusWidget />
        </div>
      </div>
    </PageLayout>
  )
}
```

### 4.2 File Explorer Page

```
┌─────────────────────────────────────────────────────────────┐
│ patient-records / Files            [Upload] [New Folder]    │
├───────────────────────────────────────────────────────────  │
│ [🔍 Search files...]  [Filter ▼]  [Sort: Date ▼] [⊞ ⊟]   │
├────────────────────────────────────────────────────────────-│
│ 📁 2026 / 📁 June /                                         │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ ☐ │ NAME              │ SIZE  │ STATUS  │ DATE      │    │
│ │ ☐ │ 📄 discharge.pdf  │ 245KB │ ✓ Ready │ Jun 15   │    │
│ │ ☐ │ 📄 lab-report.pdf │ 189KB │ ✓ Ready │ Jun 14   │    │
│ │ ☐ │ 🖼 chest-xray.jpg │ 2.1MB │ ⏳ Proc │ Jun 14   │    │
│ │ ☐ │ 📄 consent.pdf    │  56KB │ ⚠ PHI   │ Jun 13   │    │
│ └─────────────────────────────────────────────────────┘    │
│                                          [< 1 2 3 4 5 >]  │
└─────────────────────────────────────────────────────────────┘
```

The File Explorer uses `@filenest/react`'s `<FileExplorer>` component with dashboard-specific configuration:

```tsx
// app/projects/[id]/files/page.tsx
export default function FilesPage({ params }: { params: { id: string } }) {
  return (
    <FileNestProvider projectId={params.id} tokenEndpoint="/api/filenest-token">
      <FileExplorer
        columns={["name", "size", "status", "phi_detected", "created_at"]}
        actions={["preview", "download", "share", "move", "delete"]}
        bulkActions={["delete", "move", "tag", "download"]}
        onFileClick={(file) => openPreviewPanel(file)}
        uploadEnabled
        foldersEnabled
      />
    </FileNestProvider>
  )
}
```

### 4.3 API Keys Page

```
┌─────────────────────────────────────────────────────────────┐
│ API Keys                                  [+ Create Key]    │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐    │
│ │ NAME            │ PREFIX      │ SCOPES  │ LAST USED │    │
│ │ Production Key  │ fn_live_abc │ All     │ 2 min ago │ ⋮  │
│ │ Staging Key     │ fn_live_def │ read    │ 1 hr ago  │ ⋮  │
│ │ CI/CD Key       │ fn_test_ghi │ upload  │ 3 days    │ ⋮  │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ ⋮ menu options: View details | Rotate | Revoke             │
└─────────────────────────────────────────────────────────────┘

[Create API Key Modal]
┌─────────────────────────────────────────┐
│ Create API Key                      [x] │
├─────────────────────────────────────────┤
│ Name          [Production Backend Key ] │
│ Environment   (● Live  ○ Test)          │
│ Scopes        ☑ files:read             │
│               ☑ files:write            │
│               ☑ files:delete           │
│               ☐ admin                  │
│ Expiry        [No expiry          ▼]   │
│ IP Allowlist  [0.0.0.0/0         ]     │
├─────────────────────────────────────────┤
│            [Cancel] [Create Key]        │
└─────────────────────────────────────────┘

[Key Created — Show Once Modal]
┌─────────────────────────────────────────┐
│ ✅ API Key Created                  [x] │
├─────────────────────────────────────────┤
│ ⚠️ Copy this key now. It won't be      │
│ shown again.                            │
│                                         │
│ fn_live_xK9m2vPqR4nLwT8jY1cA3bZ...    │
│ [📋 Copy]                              │
├─────────────────────────────────────────┤
│                          [Done]         │
└─────────────────────────────────────────┘
```

### 4.4 Audit Log Viewer

```
┌─────────────────────────────────────────────────────────────┐
│ Audit Logs                    [Export ▼]  [Filter ▼]       │
├─────────────────────────────────────────────────────────────┤
│ Date range: [Jun 1] → [Jun 15]  Action: [All ▼]            │
│ Actor: [All ▼]  Resource: [All ▼]  Result: [All ▼]         │
├─────────────────────────────────────────────────────────────┤
│ TIMESTAMP         │ ACTION              │ ACTOR  │ RESULT  │
│ 2026-06-15 10:32  │ file.uploaded       │ API Key│ success │
│ 2026-06-15 10:31  │ file.downloaded     │ User   │ success │
│ 2026-06-15 10:28  │ api_key.rotated     │ Admin  │ success │
│ 2026-06-15 10:15  │ phi_detected        │ System │ flagged │ ◀ yellow
│ 2026-06-15 09:44  │ file.delete.denied  │ User   │ denied  │ ◀ red
├─────────────────────────────────────────────────────────────┤
│ [Row click → expands detail panel]                          │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Action: file.downloaded                               │  │
│ │ Actor: api_key fn_live_abc...  (Production Key)      │  │
│ │ Resource: discharge.pdf (file_abc)                    │  │
│ │ IP: 192.168.1.1                                       │  │
│ │ Request ID: req_xyz                                   │  │
│ │ Metadata: { "signedUrlTtl": 3600 }                    │  │
│ └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 4.5 Usage & Billing Page

```
┌─────────────────────────────────────────────────────────────┐
│ Usage & Billing                              June 2026      │
├─────────────────────────────────────────────────────────────┤
│ Plan: Professional   $299/month   [Upgrade Plan]           │
├─────────────────────────────────────────────────────────────┤
│ STORAGE                      API REQUESTS                   │
│ ██████░░░░░░░░  45%          ████░░░░░░░░░░  23%           │
│ 45.2 GB / 500 GB             234,891 / 1,000,000           │
│                                                             │
│ BANDWIDTH                    PROCESSING                     │
│ ██░░░░░░░░░░░░  10%          ████░░░░░░░░░░  12%           │
│ 10.7 GB / 100 GB             12,045 / 100,000              │
├─────────────────────────────────────────────────────────────┤
│ USAGE TREND (last 6 months)                                 │
│  [Recharts line chart — storage growth over time]           │
├─────────────────────────────────────────────────────────────┤
│ USAGE BY PROJECT                                            │
│ patient-records   ████████  38.2 GB  84%                   │
│ legal-documents   ███       5.8 GB   13%                   │
│ general-storage   ░         1.2 GB    3%                   │
└─────────────────────────────────────────────────────────────┘
```

### 4.6 Compliance Page

```
┌─────────────────────────────────────────────────────────────┐
│ Compliance                          [Download Report]       │
├─────────────────────────────────────────────────────────────┤
│ COMPLIANCE STATUS BY PROJECT                                │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ patient-records   Healthcare  ✅ HIPAA Compliant       │ │
│ │  ✅ PHI Detection active                               │ │
│ │  ✅ Audit logs immutable (7yr retention)               │ │
│ │  ✅ BAA signed                                         │ │
│ │  ⚠️ 3 files flagged for PHI — review required         │ │
│ ├────────────────────────────────────────────────────────┤ │
│ │ legal-documents   Legal       ✅ Compliant             │ │
│ │  ✅ Legal hold enabled                                 │ │
│ │  ✅ Chain of custody tracking                          │ │
│ └────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ LEGAL HOLDS                    [Place Legal Hold]           │
│ No active legal holds                                       │
├─────────────────────────────────────────────────────────────┤
│ RECENT COMPLIANCE EVENTS                                    │
│ Jun 15  PHI detected in chest-xray.jpg — flagged           │
│ Jun 10  WORM committed on batch of 45 files                 │
│ Jun 01  Retention enforcement ran — 0 files expired         │
└─────────────────────────────────────────────────────────────┘
```

### 4.7 Project Settings Page

```
┌─────────────────────────────────────────────────────────────┐
│ patient-records / Settings                                  │
├────────────────────────────────────────────────────────────-│
│ [General] [Storage] [Processing] [Compliance] [Metadata]   │
│           [Security] [Integrations] [Danger Zone]          │
├─────────────────────────────────────────────────────────────┤
│ GENERAL                                                     │
│ Project name    [patient-records              ]             │
│ Description     [Patient medical records      ]             │
│ Domain          Healthcare  🔒 (locked — files exist)      │
│ Environment     Production                                  │
├─────────────────────────────────────────────────────────────┤
│ PROCESSING                                                  │
│ Virus scan        ● Enabled                                 │
│ OCR               ● Enabled                                 │
│ PHI Detection     ● Enabled   Action: [Flag  ▼]            │
│ Classification    ● Enabled                                 │
│ Thumbnails        ● Enabled                                 │
│ Preview           ● Enabled                                 │
├─────────────────────────────────────────────────────────────┤
│ COMPLIANCE WARNINGS                                         │
│ ✅ No configuration warnings                                │
├─────────────────────────────────────────────────────────────┤
│                                    [Save Changes]           │
└─────────────────────────────────────────────────────────────┘
```

The **Domain** field shows `🔒 (locked — files exist)` after the first upload, matching the immutability rule in `01_PRD.md §12.4`. Compliance warnings from `08_Compliance_Framework.md §11.3` are displayed inline before saving.

---

## 5. Component Library

### 5.1 Core Components

```tsx
// All built on shadcn/ui primitives

// Status badge
<StatusBadge status="ready" />        // green
<StatusBadge status="processing" />   // blue + spinner
<StatusBadge status="quarantined" />  // red
<StatusBadge status="phi_detected" /> // amber

// Compliance profile badge
<ComplianceBadge profile="healthcare" />  // teal
<ComplianceBadge profile="legal" />       // purple
<ComplianceBadge profile="generic" />     // gray

// Usage progress bar
<UsageBar used={45.2} limit={500} unit="GB" />

// Domain locked indicator
<DomainLock profile="healthcare" locked={hasFiles} />

// Config warning banner
<ConfigWarnings warnings={project.config_warnings} />
```

### 5.2 File Preview Panel

Slides in from the right when a file row is clicked:

```tsx
// Slide-over panel with file preview + metadata
<FileDetailPanel fileId={selectedFileId} onClose={() => setSelected(null)}>
  <FilePreview fileId={selectedFileId} height={400} />
  <FileMetadata file={file} />
  <FileVersionHistory fileId={file.id} />
  <FileAuditTrail fileId={file.id} />
</FileDetailPanel>
```

---

## 6. State Management

```tsx
// No global state library — React Query handles server state
// Zustand only for UI state (selected files, open panels, etc.)

// Server state via React Query
const { data: files } = useQuery({
  queryKey: ["files", projectId, { folder, page, filters }],
  queryFn: () => filenest.files.list({ projectId, folderId: folder, ...filters }),
  staleTime: 30_000,
})

// Optimistic updates for bulk operations
const { mutate: bulkDelete } = useMutation({
  mutationFn: (fileIds: string[]) => filenest.files.bulkDelete({ fileIds }),
  onMutate: async (fileIds) => {
    await queryClient.cancelQueries({ queryKey: ["files", projectId] })
    // Optimistically remove from list
    queryClient.setQueryData(["files", projectId], (old) =>
      old?.filter((f) => !fileIds.includes(f.id))
    )
  },
  onError: () => queryClient.invalidateQueries({ queryKey: ["files", projectId] }),
})
```

---

## 7. API Integration Layer

The dashboard uses the FileNest Node SDK internally, authenticated via a server-side session token exchange:

```typescript
// lib/filenest-client.ts
import { FileNest } from "@filenest/node"
import { cookies } from "next/headers"

export async function getServerClient() {
  const sessionToken = cookies().get("fn_session")?.value
  if (!sessionToken) throw new Error("Not authenticated")

  // Exchange session token for a short-lived internal API key
  const apiKey = await exchangeSessionForApiKey(sessionToken)

  return new FileNest({ apiKey, baseUrl: process.env.FILENEST_API_URL })
}

// Client-side: uses upload tokens for file operations
export function getClientProvider(projectId: string) {
  return {
    tokenEndpoint: `/api/projects/${projectId}/upload-token`,
  }
}
```

---

## 8. Onboarding Flow

New organizations are guided through a 5-step wizard on first login:

```
Step 1: Welcome
  → "What will you use FileNest for?"
  → [Healthcare] [Legal] [Finance] [Insurance] [General]
  → (Selection pre-fills Step 3 with recommended settings)

Step 2: Create First Project
  → Project name
  → Domain (pre-filled from Step 1, with explanation of what it enables)
  → Environment: Production / Development

Step 3: Configure Storage
  → [Use FileNest storage (recommended)] [Bring your own S3 bucket]
  → If BYOB: IAM role ARN input + connection test button

Step 4: Get Your API Key
  → Auto-generates first API key
  → Shows key (copy-once)
  → Quick-start code snippet (Node.js / Python / cURL)

Step 5: Upload Your First File
  → Drag-and-drop zone
  → Shows processing pipeline progress in real time
  → "🎉 Your file is ready!" → [Go to dashboard]
```

---

## 9. Team Management

### 9.1 Team Page

```
┌─────────────────────────────────────────────────────────────┐
│ Team                                      [Invite Member]  │
├─────────────────────────────────────────────────────────────┤
│ MEMBERS (4)                                                 │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ [AV] Anya Varma      anya@acme.com  Owner    Active  ⋮ │ │
│ │ [JM] James Miller    james@acme.com Admin    Active  ⋮ │ │
│ │ [SR] Sarah Rodriguez sarah@acme.com Member   Active  ⋮ │ │
│ │ [  ] Pending Invite  dev@vendor.com Viewer   Pending ⋮ │ │
│ └────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ ROLES                                                       │
│ Owner    Full access including billing and org deletion     │
│ Admin    Full access except billing                         │
│ Member   Read + write files, no settings access            │
│ Viewer   Read-only access                                   │
│ Billing  Billing page only                                  │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Invite Flow

```typescript
// Invite sends email via NotificationService
POST /v1/team/invites
{
  "email": "dev@vendor.com",
  "role": "viewer",
  "project_ids": ["proj_abc"]  // Optional: restrict to specific projects
}

// Invitee receives email with magic link:
// https://app.filenest.io/invite/accept?token=...
// Token is single-use, expires in 48 hours
// On accept: creates user account if new, assigns role, redirects to dashboard
```

---

## 10. Security Considerations

### 10.1 Dashboard-Specific Security

| Control | Implementation |
|---------|---------------|
| Session cookies | `httpOnly`, `secure`, `sameSite=lax` — not accessible to JavaScript |
| Session expiry | 7-day sliding expiry; reset on each request |
| CSRF protection | `sameSite=lax` cookie + `Origin` header validation |
| Content Security Policy | Strict CSP headers on all dashboard responses |
| Sensitive page re-auth | Viewing API keys, changing billing — require password confirmation |
| Session invalidation | All sessions invalidated on password change |
| Login rate limiting | 10 attempts/15 min per IP + per email |

### 10.2 Sensitive Actions Require Re-Authentication

```tsx
// Modal shown before destructive/sensitive actions
<ReAuthModal
  action="view_api_key"
  onSuccess={() => setKeyVisible(true)}
>
  <p>Enter your password to view this API key.</p>
</ReAuthModal>
```

Actions that require re-authentication:
- View full API key details
- Rotate or revoke an API key
- Change compliance profile (when unlocked)
- Delete organization
- Change team member role to Owner
- Export audit logs
