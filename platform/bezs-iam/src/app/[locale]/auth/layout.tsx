import { AuthLayout } from "@/modules/client/auth/components/layout/AuthLayout";

function AuthPageLayout({ children }: LayoutProps<"/[locale]/auth">) {
  return <AuthLayout>{children}</AuthLayout>;
}

export default AuthPageLayout;
