import ForgetPassword from "@/modules/client/auth/components/auth/ForgetPassword";

async function ForgetPasswordPage(
  props: PageProps<"/[locale]/auth/forget-password">,
) {
  const searchParams = await props.searchParams;
  const redirect = searchParams?.redirect as string | undefined;

  return <ForgetPassword redirect={redirect} />;
}

export default ForgetPasswordPage;
