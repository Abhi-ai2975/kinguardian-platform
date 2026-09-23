/**
 * FhirEmrPage — dedicated marketing page explaining FHIR R4 EMR in DrGodly.
 *
 * Layer: client / (marketing) / pages
 *
 * Covers: what FHIR R4 is, the seven core resources used in DrGodly,
 * how clinical workflow maps to FHIR resources, and why FHIR-native
 * records are superior to proprietary EMR formats.
 */

"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { OAuthPkceButton } from "@/modules/client/auth/components/OAuthPkceButton";
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
  ArrowRight,
  Layers,
  Zap,
  Globe,
} from "lucide-react";
import type { AuthResponse } from "@/modules/server/auth/types";

// ── FHIR resources ─────────────────────────────────────────────────────────

const resources = [
  {
    icon: <User className="w-6 h-6 text-blue-500" />,
    name: "Patient",
    color: "border-blue-500/20 bg-blue-500/5",
    accent: "text-blue-500",
    description:
      "Stores patient demographics, contact information, identifiers, and communication preferences. The anchor resource every clinical record links back to.",
    fields: ["name", "birthDate", "gender", "address", "telecom", "identifier"],
  },
  {
    icon: <UserCheck className="w-6 h-6 text-emerald-500" />,
    name: "Practitioner",
    color: "border-emerald-500/20 bg-emerald-500/5",
    accent: "text-emerald-500",
    description:
      "Clinician profiles with qualifications, specialties, and contact details. Used to link practitioners to appointments and encounters.",
    fields: ["name", "qualification", "specialty", "telecom", "address"],
  },
  {
    icon: <Calendar className="w-6 h-6 text-violet-500" />,
    name: "Appointment",
    color: "border-violet-500/20 bg-violet-500/5",
    accent: "text-violet-500",
    description:
      "Represents a scheduled clinical interaction between patient and practitioner. Status codes: booked, arrived, fulfilled, cancelled, no-show.",
    fields: ["status", "start", "end", "participant", "serviceType", "description"],
  },
  {
    icon: <ClipboardList className="w-6 h-6 text-amber-500" />,
    name: "Encounter",
    color: "border-amber-500/20 bg-amber-500/5",
    accent: "text-amber-500",
    description:
      "Created at consultation completion. Captures the full clinical encounter: SOAP notes, AI summary, diagnosis, and treatment plan.",
    fields: ["status", "class", "subject", "participant", "period", "reasonCode"],
  },
  {
    icon: <Activity className="w-6 h-6 text-rose-500" />,
    name: "Observation",
    color: "border-rose-500/20 bg-rose-500/5",
    accent: "text-rose-500",
    description:
      "AI-extracted clinical observations from patient intake — vitals, symptoms, severity scores, and structured clinical findings.",
    fields: ["status", "code", "subject", "value[x]", "effectiveDateTime", "interpretation"],
  },
  {
    icon: <Pill className="w-6 h-6 text-cyan-500" />,
    name: "Condition",
    color: "border-cyan-500/20 bg-cyan-500/5",
    accent: "text-cyan-500",
    description:
      "Diagnoses and health conditions linked to SNOMED CT terminology. Created from AI differential diagnosis and clinician review.",
    fields: ["clinicalStatus", "code", "subject", "onsetDateTime", "evidence", "severity"],
  },
  {
    icon: <FileText className="w-6 h-6 text-indigo-500" />,
    name: "DocumentReference",
    color: "border-indigo-500/20 bg-indigo-500/5",
    accent: "text-indigo-500",
    description:
      "Clinical documents including intake reports, consultation summaries, discharge notes, and AI-generated clinical reports.",
    fields: ["status", "type", "subject", "date", "author", "content"],
  },
];

// ── Why FHIR comparison ────────────────────────────────────────────────────

const comparison = [
  {
    aspect: "Data Format",
    fhir: "Structured JSON/XML resources with standardized fields",
    legacy: "Proprietary database schemas — different per vendor",
  },
  {
    aspect: "Interoperability",
    fhir: "Any FHIR-compatible system can read and write your records",
    legacy: "Requires expensive middleware or manual data exports",
  },
  {
    aspect: "AI Integration",
    fhir: "AI tools query FHIR resources directly via structured APIs",
    legacy: "AI must parse unstructured text or fragile CSV exports",
  },
  {
    aspect: "Compliance",
    fhir: "HIPAA-aligned resource types with built-in PHI boundaries",
    legacy: "Compliance mapping requires costly integration projects",
  },
  {
    aspect: "Extensibility",
    fhir: "Open ecosystem of FHIR profiles, IGs, and implementations",
    legacy: "Closed vendor roadmaps, locked behind contract terms",
  },
];

// ── How clinical workflow maps to FHIR ─────────────────────────────────────

const workflowMap = [
  { step: "Patient books appointment", resource: "Appointment", color: "text-violet-500" },
  { step: "AI intake collects symptoms", resource: "Observation", color: "text-rose-500" },
  { step: "AI extracts diagnosis hints", resource: "Condition", color: "text-cyan-500" },
  { step: "Doctor consults patient", resource: "Encounter", color: "text-amber-500" },
  { step: "Clinical report generated", resource: "DocumentReference", color: "text-indigo-500" },
];

// ── Animation variants ──────────────────────────────────────────────────────

const fade = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.5 },
  }),
};

// ── Component ──────────────────────────────────────────────────────────────

/**
 * Full dedicated FHIR EMR explanation page.
 *
 * @param session - Active auth session for CTA button variant.
 */
export function FhirEmrPage({ session }: { session: AuthResponse | null }) {
  return (
    <div className="pt-20">

      {/* ── Hero ── */}
      <section className="py-20 sm:py-28 bg-background relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl opacity-50 pointer-events-none" />
        <div className="max-w-[110rem] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            className="max-w-3xl"
            initial="hidden"
            animate="visible"
            variants={fade}
          >
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                HL7 FHIR R4
              </Badge>
              <Badge variant="secondary" className="text-xs">Electronic Medical Records</Badge>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.08] mb-6">
              What Is FHIR? The Standard Behind Modern Electronic Medical Records
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-8">
              HL7 FHIR (Fast Healthcare Interoperability Resources) R4 is the global
              standard for representing and exchanging electronic health records. DrGodly
              uses FHIR natively — every patient record, appointment, observation, and
              clinical encounter is a structured, interoperable FHIR resource.
            </p>
            <div className="flex flex-wrap gap-3">
              {!session ? (
                <OAuthPkceButton size="lg" className="rounded-full px-8">
                  Get Started Free <ArrowRight className="ml-2 w-4 h-4" />
                </OAuthPkceButton>
              ) : null}
              <a href="#resources" className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors">
                Explore FHIR Resources <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </motion.div>

          {/* Quick facts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 p-8 rounded-2xl bg-secondary/40 border border-border/50"
          >
            {[
              { icon: <Globe className="w-5 h-5 text-primary" />, label: "Global Standard", value: "HL7 FHIR R4" },
              { icon: <Layers className="w-5 h-5 text-primary" />, label: "Resources Used", value: "7+" },
              { icon: <Zap className="w-5 h-5 text-primary" />, label: "API Format", value: "REST + GraphQL" },
              { icon: <CheckCircle2 className="w-5 h-5 text-primary" />, label: "Compliance", value: "HIPAA Aligned" },
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

      {/* ── FHIR Resources ── */}
      <section id="resources" className="py-20 sm:py-24 bg-secondary/30">
        <div className="max-w-[110rem] mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fade}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <span className="text-primary font-semibold tracking-wider uppercase text-sm">FHIR Resources</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-foreground">
              The Seven Core FHIR Resources in DrGodly
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Each clinical concept — from a patient registration to a completed consultation —
              maps to a dedicated, standardized FHIR R4 resource.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map((res, i) => (
              <motion.div
                key={res.name}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fade}
              >
                <Card className={`h-full border ${res.color} hover:shadow-md transition-shadow`}>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center border border-border">
                        {res.icon}
                      </div>
                      <div>
                        <p className={`font-bold text-lg ${res.accent}`}>{res.name}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">FHIR R4 Resource</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{res.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {res.fields.map((f) => (
                        <span key={f} className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                          {f}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Clinical workflow → FHIR mapping ── */}
      <section className="py-20 sm:py-24 bg-background">
        <div className="max-w-[110rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <span className="text-primary font-semibold tracking-wider uppercase text-sm">Clinical Mapping</span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-foreground mb-6">
                Every Clinical Action Creates a FHIR Record
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                DrGodly does not store clinical data in proprietary tables and convert it
                later. Every user action — booking, intake, consultation, diagnosis — writes
                directly to the corresponding FHIR resource in real time.
              </p>
              {workflowMap.map((item, i) => (
                <motion.div
                  key={i}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fade}
                  className="flex items-center gap-4 py-3 border-b border-border/50 last:border-0"
                >
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-foreground flex-1">{item.step}</span>
                  <Badge variant="outline" className={`text-[10px] font-mono shrink-0 ${item.color}`}>
                    {item.resource}
                  </Badge>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="bg-card border border-border rounded-2xl p-6 font-mono text-xs space-y-3"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <span className="font-semibold text-foreground text-sm">Sample FHIR Observation</span>
                <Badge variant="outline" className="text-[10px]">R4</Badge>
              </div>
              {[
                { key: "resourceType", value: '"Observation"', color: "text-violet-400" },
                { key: "status", value: '"final"', color: "text-emerald-400" },
                { key: "code.text", value: '"Chief Complaint"', color: "text-amber-400" },
                { key: "valueString", value: '"Persistent headache, 3 days"', color: "text-blue-400" },
                { key: "subject.ref", value: '"Patient/PAT-00241"', color: "text-rose-400" },
                { key: "effectiveDateTime", value: '"2026-06-16T10:30:00Z"', color: "text-cyan-400" },
                { key: "interpretation", value: '"moderate severity"', color: "text-indigo-400" },
              ].map((row, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-muted-foreground/60 shrink-0 min-w-[130px]">{row.key}:</span>
                  <span className={row.color}>{row.value}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FHIR vs Legacy comparison ── */}
      <section className="py-20 sm:py-24 bg-secondary/30">
        <div className="max-w-[110rem] mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fade}
            className="text-center max-w-3xl mx-auto mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              FHIR R4 vs. Legacy Proprietary EMR
            </h2>
          </motion.div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-muted-foreground font-semibold w-1/4">Aspect</th>
                  <th className="text-left py-3 px-4 font-semibold w-[37.5%]">
                    <span className="flex items-center gap-2 text-primary">
                      <CheckCircle2 className="w-4 h-4" /> DrGodly — FHIR R4 Native
                    </span>
                  </th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-semibold w-[37.5%]">
                    <span className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-rose-400" /> Legacy Proprietary EMR
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row, i) => (
                  <motion.tr
                    key={i}
                    custom={i}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fade}
                    className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                  >
                    <td className="py-4 px-4 font-medium text-foreground">{row.aspect}</td>
                    <td className="py-4 px-4 text-muted-foreground">
                      <span className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        {row.fhir}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-muted-foreground">
                      <span className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        {row.legacy}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-[110rem] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Ready to Run on a FHIR-Native EMR?
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
              Start building on a platform where every patient record is a proper FHIR R4
              resource — interoperable, secure, and AI-ready from day one.
            </p>
            {!session ? (
              <OAuthPkceButton size="lg" className="rounded-full px-10 h-12">
                Get Started Free <ArrowRight className="ml-2 w-4 h-4" />
              </OAuthPkceButton>
            ) : null}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
