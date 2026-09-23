/**
 * HipaaPage — dedicated marketing page explaining DrGodly's HIPAA compliance.
 *
 * Layer: client / (marketing) / pages
 *
 * Covers: what HIPAA requires, how DrGodly implements each safeguard,
 * PHI handling policy, encryption standards, BAA availability,
 * and audit trail architecture.
 */

"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { OAuthPkceButton } from "@/modules/client/auth/components/OAuthPkceButton";
import {
  ShieldCheck,
  Lock,
  Eye,
  ClipboardList,
  Server,
  Users,
  KeyRound,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import type { AuthResponse } from "@/modules/server/auth/types";

// ── HIPAA safeguard pillars ────────────────────────────────────────────────

const safeguards = [
  {
    icon: <Lock className="w-6 h-6 text-blue-500" />,
    color: "bg-blue-500/10 border-blue-500/20",
    title: "Technical Safeguards",
    badge: "Encryption",
    points: [
      "TLS 1.3 for all data in transit — no exceptions",
      "AES-256 encryption for all data at rest",
      "Automatic session timeouts and re-authentication",
      "Unique user IDs — no shared login credentials",
    ],
  },
  {
    icon: <Server className="w-6 h-6 text-emerald-500" />,
    color: "bg-emerald-500/10 border-emerald-500/20",
    title: "Physical Safeguards",
    badge: "Infrastructure",
    points: [
      "Hosted on SOC 2-certified infrastructure providers",
      "Isolated per-organization data environments",
      "No PHI stored on local client devices",
      "Geographically redundant, encrypted backups",
    ],
  },
  {
    icon: <Users className="w-6 h-6 text-violet-500" />,
    color: "bg-violet-500/10 border-violet-500/20",
    title: "Administrative Safeguards",
    badge: "Governance",
    points: [
      "Role-based access control (RBAC) for all PHI",
      "Workforce access limited to minimum necessary PHI",
      "Business Associate Agreements (BAA) available",
      "Documented security policies and procedures",
    ],
  },
  {
    icon: <ClipboardList className="w-6 h-6 text-amber-500" />,
    color: "bg-amber-500/10 border-amber-500/20",
    title: "Audit Controls",
    badge: "Traceability",
    points: [
      "Every PHI access and modification timestamped",
      "Immutable audit logs stored separately from clinical data",
      "AI recommendations logged with clinician review status",
      "Export-ready audit reports for compliance reviews",
    ],
  },
  {
    icon: <Eye className="w-6 h-6 text-rose-500" />,
    color: "bg-rose-500/10 border-rose-500/20",
    title: "Patient Rights",
    badge: "Transparency",
    points: [
      "Patients can access their own FHIR records at any time",
      "Data rectification requests supported via patient portal",
      "Consent management for data sharing and AI processing",
      "Clear privacy notices before any AI data processing",
    ],
  },
  {
    icon: <AlertTriangle className="w-6 h-6 text-orange-500" />,
    color: "bg-orange-500/10 border-orange-500/20",
    title: "Breach Notification",
    badge: "Response",
    points: [
      "Automated anomaly detection on PHI access patterns",
      "72-hour breach notification procedures in place",
      "Incident response playbook maintained and tested",
      "Risk assessments conducted on all system changes",
    ],
  },
];

// ── PHI handling practices ────────────────────────────────────────────────

const phiPractices = [
  { title: "Minimum Necessary", description: "Only the PHI required for the specific clinical task is ever accessed, processed, or transmitted." },
  { title: "Zero Third-Party Sharing", description: "PHI is never shared with third parties for advertising, analytics, or AI training without explicit consent." },
  { title: "AI Processing Boundaries", description: "AI agents process PHI only within the secure DrGodly environment. No PHI leaves your organization's data boundary." },
  { title: "Data Residency", description: "Clinical data is stored in the region you configure. Cross-region PHI transfer is disabled by default." },
];

// ── Animation ──────────────────────────────────────────────────────────────

const fade = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.5 } }),
};

// ── Component ──────────────────────────────────────────────────────────────

/**
 * HIPAA compliance dedicated marketing page.
 *
 * @param session - Active auth session for CTA variant.
 */
export function HipaaPage({ session }: { session: AuthResponse | null }) {
  return (
    <div className="pt-20">

      {/* ── Hero ── */}
      <section className="py-20 sm:py-28 bg-background relative overflow-hidden">
        <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl opacity-50 pointer-events-none" />
        <div className="max-w-[110rem] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div className="max-w-3xl" initial="hidden" animate="visible" variants={fade}>
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 text-xs">
                HIPAA Compliant
              </Badge>
              <Badge variant="secondary" className="text-xs">Healthcare Data Security</Badge>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.08] mb-6">
              HIPAA Compliance Built Into Every Layer of DrGodly
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-8">
              The Health Insurance Portability and Accountability Act (HIPAA) sets the
              legal standard for protecting patient health information in the US.
              DrGodly is designed to satisfy every HIPAA safeguard requirement — not as
              a checklist, but as a fundamental architectural principle.
            </p>
            <div className="flex flex-wrap gap-3">
              {!session && (
                <OAuthPkceButton size="lg" className="rounded-full px-8">
                  Get Started Free <ArrowRight className="ml-2 w-4 h-4" />
                </OAuthPkceButton>
              )}
              <a href="#safeguards" className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors">
                View Safeguards <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </motion.div>

          {/* Stat row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 p-8 rounded-2xl bg-secondary/40 border border-border/50"
          >
            {[
              { icon: <ShieldCheck className="w-5 h-5 text-primary" />, value: "HIPAA", label: "All safeguards covered" },
              { icon: <Lock className="w-5 h-5 text-primary" />, value: "AES-256", label: "Encryption standard" },
              { icon: <KeyRound className="w-5 h-5 text-primary" />, value: "RBAC", label: "Access control model" },
              { icon: <FileCheck className="w-5 h-5 text-primary" />, value: "BAA", label: "Available on request" },
            ].map((f, i) => (
              <div key={i} className="text-center">
                <div className="flex justify-center mb-2">{f.icon}</div>
                <p className="text-2xl font-bold text-foreground">{f.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{f.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── What HIPAA requires + how DrGodly implements ── */}
      <section id="safeguards" className="py-20 sm:py-24 bg-secondary/30">
        <div className="max-w-[110rem] mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fade}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <span className="text-primary font-semibold tracking-wider uppercase text-sm">HIPAA Safeguards</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-foreground">
              Six Safeguard Areas, Fully Addressed
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              HIPAA defines six safeguard categories for protecting PHI. DrGodly
              implements controls across all six — from infrastructure encryption to
              patient rights management.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {safeguards.map((s, i) => (
              <motion.div
                key={s.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fade}
              >
                <Card className={`h-full border ${s.color}`}>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="w-11 h-11 rounded-xl bg-background border border-border flex items-center justify-center">
                        {s.icon}
                      </div>
                      <Badge variant="secondary" className="text-[10px]">{s.badge}</Badge>
                    </div>
                    <h3 className="font-bold text-lg text-foreground">{s.title}</h3>
                    <ul className="space-y-2">
                      {s.points.map((p, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PHI handling ── */}
      <section className="py-20 sm:py-24 bg-background">
        <div className="max-w-[110rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <span className="text-primary font-semibold tracking-wider uppercase text-sm">PHI Handling</span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-foreground mb-6">
                How DrGodly Treats Patient Health Information
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Protected Health Information (PHI) is the most sensitive data a healthcare
                system handles. DrGodly applies strict data minimization, isolation, and
                transparency principles to every PHI interaction.
              </p>
              <div className="space-y-5">
                {phiPractices.map((p, i) => (
                  <motion.div
                    key={i}
                    custom={i}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fade}
                    className="flex items-start gap-4 p-4 rounded-xl bg-secondary/50 border border-border/50"
                  >
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground">{p.title}</p>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{p.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="space-y-6"
            >
              {/* BAA card */}
              <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <FileCheck className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground mb-2">Business Associate Agreement (BAA)</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        A signed BAA is required under HIPAA whenever a business associate
                        handles PHI on behalf of a covered entity. DrGodly provides a
                        standard BAA on request — making your organization&apos;s HIPAA
                        compliance straightforward from day one.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Audit trails card */}
              <Card className="border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                      <ClipboardList className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground mb-2">Immutable Audit Trails</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Every read, write, update, and delete operation on PHI is logged
                        with a timestamp, user ID, action type, and resource reference.
                        Audit logs are stored in append-only storage and are included in
                        your compliance reports.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Human oversight card */}
              <Card className="border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                      <Eye className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground mb-2">Human Oversight on AI Decisions</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        No AI-generated clinical content is written to a FHIR record without
                        explicit clinician review and approval. AI recommendations are advisory
                        — all PHI-affecting decisions remain with the licensed clinician.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 sm:py-28 bg-secondary/30">
        <div className="max-w-[110rem] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Build on a Platform That Takes HIPAA Seriously
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
              Request our BAA, review our security documentation, or start your free
              trial today.
            </p>
            {!session && (
              <OAuthPkceButton size="lg" className="rounded-full px-10 h-12">
                Get Started Free <ArrowRight className="ml-2 w-4 h-4" />
              </OAuthPkceButton>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
