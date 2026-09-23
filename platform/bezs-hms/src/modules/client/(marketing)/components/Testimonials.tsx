/**
 * Testimonials — repurposed as the HIPAA Security & Compliance trust section.
 *
 * Layer: client / (marketing) / components
 *
 * Displays four compliance pillars (HIPAA, FHIR R4, Encryption, Audit Trails)
 * alongside clinical stats to build trust with healthcare providers evaluating
 * DrGodly as their EMR platform.
 */

"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Database,
  Lock,
  ClipboardList,
  Eye,
  CheckCircle2,
} from "lucide-react";

// ── Animation variants ──────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

// ── Compliance pillars ──────────────────────────────────────────────────────

const compliancePillars = [
  {
    icon: <ShieldCheck className="w-7 h-7 text-emerald-500" />,
    title: "HIPAA Ready",
    badge: "Compliance",
    badgeColor: "border-emerald-500/30 text-emerald-600",
    points: [
      "Business Associate Agreement (BAA) ready",
      "PHI encrypted at rest and in transit",
      "Zero third-party PHI sharing without consent",
    ],
  },
  {
    icon: <Database className="w-7 h-7 text-blue-500" />,
    title: "HL7 FHIR R4 Compliant",
    badge: "Interoperability",
    badgeColor: "border-blue-500/30 text-blue-600",
    points: [
      "Patient, Practitioner, Appointment, Encounter",
      "Observation, Condition, MedicationRequest",
      "Standard FHIR REST + GraphQL interfaces",
    ],
  },
  {
    icon: <Lock className="w-7 h-7 text-violet-500" />,
    title: "End-to-End Encryption",
    badge: "Security",
    badgeColor: "border-violet-500/30 text-violet-600",
    points: [
      "TLS 1.3 for all data in transit",
      "AES-256 encryption at rest",
      "Isolated per-organization data boundaries",
    ],
  },
  {
    icon: <ClipboardList className="w-7 h-7 text-amber-500" />,
    title: "Full Audit Trails",
    badge: "Governance",
    badgeColor: "border-amber-500/30 text-amber-600",
    points: [
      "Every clinical action timestamped and logged",
      "AI recommendations tracked with human review",
      "Immutable audit records for compliance reviews",
    ],
  },
];

// ── Stats ──────────────────────────────────────────────────────────────────

const stats = [
  { value: "100%", label: "HIPAA Compliant Architecture" },
  { value: "FHIR R4", label: "All Clinical Records" },
  { value: "AES-256", label: "Encryption Standard" },
  { value: "MCP", label: "AI Tool Integration" },
];

// ── Component ──────────────────────────────────────────────────────────────

/**
 * Security, compliance, and trust section targeting healthcare decision-makers.
 */
export default function Testimonials() {
  return (
    <section id="security" className="py-20 sm:py-28 bg-background">
      <div className="max-w-[110rem] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-primary font-semibold tracking-wider uppercase text-sm">
            Security &amp; Compliance
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-foreground">
            HIPAA Compliance Isn&apos;t Optional. Neither Is FHIR.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            DrGodly is built from the ground up on healthcare compliance standards.
            HIPAA, FHIR R4, end-to-end encryption, and complete audit trails are
            not add-ons — they are the foundation.
          </p>
        </motion.div>

        {/* Compliance pillars */}
        <motion.div
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {compliancePillars.map((pillar, i) => (
            <motion.div key={i} variants={itemVariants}>
              <Card className="h-full border-border/50 hover:border-border transition-colors">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center">
                      {pillar.icon}
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold ${pillar.badgeColor}`}
                    >
                      {pillar.badge}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{pillar.title}</h3>
                  <ul className="space-y-2">
                    {pillar.points.map((point, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 px-8 py-10 rounded-2xl bg-secondary/50 border border-border/50"
        >
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-3xl sm:text-4xl font-bold text-primary">{stat.value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Human oversight note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-10 flex items-center justify-center gap-3 text-sm text-muted-foreground max-w-2xl mx-auto text-center"
        >
          <Eye className="w-4 h-4 shrink-0 text-primary" />
          <p>
            Every AI recommendation requires clinician review and approval before
            it is written to the FHIR record. Human oversight is enforced by design.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
