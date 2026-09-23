import SigninWithMagicLink from "@/modules/client/auth/components/auth/SigninWithMagicLink";

async function MagicLinkPage(props: PageProps<"/[locale]/auth/magic-link">) {
  const searchParams = await props.searchParams;
  const redirect = searchParams?.redirect as string | undefined;

  return <SigninWithMagicLink redirect={redirect} />;
}

export default MagicLinkPage;
