import EmailVerification from "@/modules/client/auth/components/auth/EmailVerification";

async function EmailVerificationPage(
  props: PageProps<"/[locale]/auth/email-verification">,
) {
  const searchParams = await props.searchParams;
  const email = searchParams?.email as string;
  const redirect = searchParams?.redirect as string | undefined;

  return <EmailVerification email={email} redirect={redirect} />;
}

export default EmailVerificationPage;
