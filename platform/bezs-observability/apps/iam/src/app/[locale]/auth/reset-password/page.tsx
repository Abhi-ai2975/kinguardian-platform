import ResetPassword from "@/modules/client/auth/components/auth/ResetPassword";
import { redirect } from "next/navigation";

async function ResetPasswordPage(
  props: PageProps<"/[locale]/auth/reset-password">,
) {
  const searchParams = await props.searchParams;
  const token = searchParams?.token as string | undefined;
  const oauthRedirect = searchParams?.redirect as string | undefined;

  if (!token) {
    redirect("/auth/forget-password");
  }

  return <ResetPassword token={token} redirect={oauthRedirect} />;
}

export default ResetPasswordPage;
