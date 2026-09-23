/**
 * /features/compliance — FileNest compliance feature detail page.
 * @module
 */
import { CompliancePage } from "@/modules/client/(marketing)/pages/CompliancePage";

export const metadata = {
  title: "Compliance — FileNest",
  description: "WORM, legal hold, retention policies, PHI detection, and audit logging — all configuration-driven.",
};

export default function ComplianceFeaturePage() {
  return <CompliancePage />;
}
