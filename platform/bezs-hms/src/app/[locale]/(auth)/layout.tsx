/**
 * Auth layout — shared wrapper for all authentication pages (/login, /signup,
 * /callback, /forgot-password, /reset-password, /verify-email).
 *
 * Renders a vertically and horizontally centered container so each page only
 * needs to render its own small card/spinner content.
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh flex items-center justify-center bg-muted/40 p-4">
      {children}
    </div>
  );
}
