/**
 * FhirEmrSection — dedicated FHIR EMR interoperability showcase section.
 *
 * Layer: client / (marketing) / components
 *
 * Highlights the HL7 FHIR R4 resource model powering DrGodly's electronic
 * medical records layer. Shows the seven core FHIR resources used in the
 * platform with descriptions of how each maps to clinical workflows.
 *
 * Also surfaces the "why FHIR matters" comparison vs. proprietary EMR formats.
 */

"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Database,
  User,
  UserCheck,
  Calendar,
  ClipboardList,
  Activity,
  Pill,
  FileText,
  CheckCircle2,
  XCircle,
} from "lucide-react";

// ── FHIR resource cards ─────────────────────────────────────────────────────

const fhirResources = [
  {
    icon: <User className="w-5 h-5 text-blue-500" />,
    resource: "Patient",
    color: "bg-blue-500/10 border-blue-500/20",
    description: "Complete demographic and contact information for every patient.",
  },
  {
    icon: <UserCheck className="w-5 h-5 text-emerald-500" />,
    resource: "Practitioner",
    color: "bg-emerald-500/10 border-emerald-500/20",
    description: "Verified clinician profiles, specialties, and scheduling data.",
  },
  {
    icon: <Calendar className="w-5 h-5 text-violet-500" />,
    resource: "Appointment",
    color: "bg-violet-500/10 border-violet-500/20",
    description: "Bookings with FHIR status codes: booked, fulfilled, cancelled.",
  },
  {
    icon: <ClipboardList className="w-5 h-5 text-amber-500" />,
    resource: "Encounter",
    color: "bg-amber-500/10 border-amber-500/20",
    description: "Clinical encounters created on consultation completion with SOAP notes.",
  },
  {
    icon: <Activity className="w-5 h-5 text-rose-500" />,
    resource: "Observation",
    color: "bg-rose-500/10 border-rose-500/20",
    description: "AI-extracted vitals, symptoms, and clinical measurements from intake.",
  },
  {
    icon: <Pill className="w-5 h-5 text-cyan-500" />,
    resource: "Condition",
    color: "bg-cyan-500/10 border-cyan-500/20",
    description: "Diagnoses and conditions linked to SNOMED CT terminology codes.",
  },
  {
    icon: <FileText className="w-5 h-5 text-indigo-500" />,
    resource: "DocumentReference",
    color: "bg-indigo-500/10 border-indigo-500/20",
    description: "Clinical documents, discharge summaries, and intake reports.",
  },
];

// ── Comparison: FHIR vs. Proprietary ─────────────────────────────────────

const fhirAdvantages = [
  { pro: "Interoperability with any FHIR-compatible system", con: "Vendor lock-in — data trapped in proprietary formats" },
  { pro: "AI tools query structured resources natively (MCP)", con: "AI must parse unstructured text or fragile CSV exports" },
  { pro: "HIPAA-aligned data model with standardized fields", con: "Compliance requires expensive middleware mappings" },
  { pro: "Ecosystem of FHIR apps, libraries, and validators", con: "Closed API requiring expensive integration contracts" },
];

// ── Animation variants ──────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

// ── Component ──────────────────────────────────────────────────────────────

/**
 * FHIR EMR interoperability section with resource showcase and comparison table.
 */
export default function FhirEmrSection() {
  return (
    <section id="fhir-emr" className="py-20 sm:py-28 bg-secondary/30">
      <div className="max-w-[110rem] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Database className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">HL7 FHIR R4 Native</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Electronic Medical Records Powered by FHIR
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Every piece of clinical data in DrGodly — from patient demographics to
            AI-generated observations — is stored as a structured HL7 FHIR R4 resource,
            enabling true interoperability with any compliant health system.
          </p>
        </motion.div>

        {/* FHIR resource grid */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-20"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {fhirResources.map((res, i) => (
            <motion.div key={i} variants={itemVariants}>
              <Card
                className={`border ${res.color} hover:shadow-md transition-shadow`}
              >
                <CardContent className="pt-5 space-y-3">
                  <div className="flex items-center gap-2">
                    {res.icon}
                    <Badge variant="outline" className="text-[10px] font-mono border-border/60">
                      {res.resource}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {res.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {/* "And more" placeholder */}
          <motion.div variants={itemVariants}>
            <Card className="border border-dashed border-border/60 bg-transparent h-full">
              <CardContent className="pt-5 flex flex-col items-center justify-center h-full text-center gap-2 min-h-[100px]">
                <Database className="w-5 h-5 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">
                  + More FHIR resources coming
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* FHIR vs. proprietary comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-4xl mx-auto"
        >
          <h3 className="text-2xl font-bold text-foreground text-center mb-8">
            Why FHIR EMR vs. Proprietary Record Formats?
          </h3>

          <div className="grid md:grid-cols-2 gap-6">
            {/* FHIR column */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-bold text-foreground">DrGodly — FHIR R4 Native</span>
                </div>
                <ul className="space-y-3">
                  {fhirAdvantages.map((adv, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-foreground/80">{adv.pro}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Proprietary column */}
            <Card className="border-border/50 opacity-80">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                    <XCircle className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="font-bold text-muted-foreground">Legacy Proprietary EMR</span>
                </div>
                <ul className="space-y-3">
                  {fhirAdvantages.map((adv, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{adv.con}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
