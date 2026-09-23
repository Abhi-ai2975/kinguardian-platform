/**
 * Auth layout — shared wrapper for all authentication pages.
 *
 * Renders a centered container (full-screen, muted background) so each
 * auth page only needs to render its own small card or spinner content.
 * No session check here — these routes are intentionally public.
 *
 * @module
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
