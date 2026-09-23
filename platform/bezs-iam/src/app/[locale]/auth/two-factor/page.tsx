import TwoFactor from "@/modules/client/auth/components/auth/TwoFactor";

async function TwoFactorPage(
  props: PageProps<"/[locale]/auth/two-factor">,
) {
  const searchParams = await props.searchParams;
  const redirect = searchParams?.redirect as string | undefined;

  return <TwoFactor redirect={redirect} />;
}

export default TwoFactorPage;
