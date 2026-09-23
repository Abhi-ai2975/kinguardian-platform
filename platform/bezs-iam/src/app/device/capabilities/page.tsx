import { createHash } from "crypto";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/modules/server/auth-provider/auth";
import { prisma } from "../../../../prisma/db";
import { DeviceApproval } from "@/modules/client/auth/components/device/DeviceApproval";

interface PageProps {
  searchParams: Promise<{ user_code?: string }>;
}

export default async function DeviceCapabilitiesPage({ searchParams }: PageProps) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    const params = await searchParams;
    const code = params.user_code ? `?user_code=${encodeURIComponent(params.user_code)}` : "";
    redirect(`/en/auth/sign-in?callbackUrl=/device/capabilities${encodeURIComponent(code)}`);
  }

  const { user_code: userCode } = await searchParams;

  if (!userCode) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-4">
        <DeviceApproval />
      </main>
    );
  }

  const codeHash = createHash("sha256").update(userCode.toUpperCase()).digest("hex");

  const approval = await prisma.approvalRequest.findFirst({
    where: {
      userCodeHash: codeHash,
      status: "pending",
    },
    include: {
      agent: { select: { id: true, name: true } },
    },
  });

  if (!approval) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-4">
        <DeviceApproval prefillCode={userCode} />
      </main>
    );
  }

  const capabilities: string[] = (() => {
    try {
      const parsed: unknown = JSON.parse(approval.capabilities ?? "[]");
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  })();

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <DeviceApproval
        prefillCode={userCode}
        approvalInfo={{
          approvalId: approval.id,
          agentId: approval.agentId,
          agentName: approval.agent?.name ?? null,
          capabilities,
          bindingMessage: approval.bindingMessage,
          expiresAt: approval.expiresAt,
        }}
      />
    </main>
  );
}
