import { redirect } from "next/navigation";

async function MagicLinkRelayPage(
  props: PageProps<"/[locale]/auth/magic-link/relay">,
) {
  const searchParams = await props.searchParams;
  const encoded = searchParams?.redirect as string | undefined;

  if (!encoded) {
    redirect("/auth/magic-link");
  }

  let decoded: string;
  try {
    decoded = Buffer.from(encoded, "base64url").toString("utf-8");
  } catch {
    redirect("/auth/magic-link");
  }

  // Only allow OAuth authorize paths to prevent open redirect
  if (!decoded.startsWith("/api/auth/oauth2/authorize?")) {
    redirect("/");
  }

  redirect(decoded);
}

export default MagicLinkRelayPage;
