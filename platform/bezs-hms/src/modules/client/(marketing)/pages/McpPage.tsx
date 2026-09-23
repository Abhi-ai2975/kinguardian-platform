/**
 * McpPage — dedicated marketing page explaining the DrGodly MCP Server.
 *
 * Layer: client / (marketing) / pages
 *
 * Covers: what the Model Context Protocol (MCP) is, how DrGodly exposes FHIR
 * resources as AI-callable tools, the available MCP tools, use cases, and
 * HIPAA-scoped security. Intentionally generic — no specific AI products named.
 */

"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { OAuthPkceButton } from "@/modules/client/auth/components/OAuthPkceButton";
import {
  Server,
  Terminal,
  Database,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  Plug,
  Code2,
  Activity,
} from "lucide-react";
import type { AuthResponse } from "@/modules/server/auth/types";

// ── MCP tool definitions ──────────────────────────────────────────────────

const mcpTools = [
  {
    name: "get_patient",
    description: "Retrieve full FHIR Patient resource by ID or identifier",
    returns: "Patient (name, demographics, contact, identifiers)",
    hipaa: "Scoped to authenticated organization",
  },
  {
    name: "list_appointments",
    description: "List FHIR Appointments with optional status, date, and practitioner filters",
    returns: "Appointment[] (status, start, end, participants)",
    hipaa: "Patient-scoped or practitioner-scoped",
  },
  {
    name: "get_intake_summary",
    description: "Retrieve AI-generated intake summary and FHIR Observations for an appointment",
    returns: "Observation[], AI SOAP note, risk assessment",
    hipaa: "Appointment-scoped — no cross-patient access",
  },
  {
    name: "get_encounter",
    description: "Retrieve a completed FHIR Encounter with clinical notes and diagnoses",
    returns: "Encounter (SOAP note, conditions, assessment plan)",
    hipaa: "Encounter-scoped read access",
  },
  {
    name: "create_observation",
    description: "Create a new FHIR Observation resource from AI-extracted clinical data",
    returns: "Created Observation (id, status, effectiveDateTime)",
    hipaa: "Requires clinician-approved session token",
  },
  {
    name: "list_conditions",
    description: "List active FHIR Conditions for a patient, with SNOMED CT codes",
    returns: "Condition[] (code, severity, onsetDateTime, clinicalStatus)",
    hipaa: "Patient-scoped with minimum necessary access",
  },
];

// ── How it works steps ────────────────────────────────────────────────────

const howItWorks = [
  {
    step: "01",
    title: "AI Tool Client Connects",
    description:
      "Any MCP-compatible AI tool client connects to the DrGodly MCP Server using a HIPAA-scoped authentication token issued to your organization.",
  },
  {
    step: "02",
    title: "Tools Are Discovered",
    description:
      "The AI tool client receives the list of available FHIR tools — what they do, what they return, and what permissions they require.",
  },
  {
    step: "03",
    title: "AI Calls FHIR Tools",
    description:
      "The AI tool client calls tools like get_patient or list_appointments. Each call is validated, logged, and executed against the live FHIR EMR.",
  },
  {
    step: "04",
    title: "Structured FHIR Data Returned",
    description:
      "The tool returns structured FHIR R4 resources — not raw text or unstructured exports. The AI can reason over clean, queryable clinical data.",
  },
  {
    step: "05",
    title: "Human Oversight Enforced",
    description:
      "Any tool call that writes or modifies FHIR resources requires a clinician-approved session. Read-only tool calls work within the authenticated scope.",
  },
];

// ── Use cases ──────────────────────────────────────────────────────────────

const useCases = [
  {
    icon: <Activity className="w-5 h-5 text-primary" />,
    title: "Clinical Decision Support",
    description:
      "An AI tool queries patient history, active conditions, and recent observations to surface risk factors and suggest evidence-based next steps — before the doctor enters the room.",
  },
  {
    icon: <Database className="w-5 h-5 text-primary" />,
    title: "Automated Record Summarization",
    description:
      "An AI tool retrieves all encounters and observations for a patient over the last 12 months and generates a concise clinical summary — in seconds, not minutes.",
  },
  {
    icon: <Code2 className="w-5 h-5 text-primary" />,
    title: "Custom Clinical Workflows",
    description:
      "Healthcare developers can build custom AI workflows that read from and write to FHIR resources using standard MCP tool calls — no custom API contracts needed.",
  },
  {
    icon: <Plug className="w-5 h-5 text-primary" />,
    title: "Third-Party AI Integration",
    description:
      "Connect any MCP-compatible AI system to your FHIR EMR. Your existing AI tooling can query DrGodly clinical data without proprietary integrations or data exports.",
  },
];

// ── Terminal log lines ─────────────────────────────────────────────────────

const terminalLines = [
  { label: "[MCP]  ", text: "Server started. Exposing 6 FHIR tools.", color: "text-muted-foreground" },
  { label: "[AUTH] ", text: "Token validated → org-0028, scope: read:patient read:appointment", color: "text-emerald-400" },
  { label: "[TOOL] ", text: "list_appointments called (practitioner_id: PRC-041, date: today)", color: "text-violet-400" },
  { label: "[FHIR] ", text: "→ Returned 4 Appointment resources", color: "text-blue-400" },
  { label: "[TOOL] ", text: "get_intake_summary called (appointment_id: APT-00872)", color: "text-violet-400" },
  { label: "[FHIR] ", text: "→ Returned 3 Observations + AI SOAP note", color: "text-blue-400" },
  { label: "[AI]   ", text: "Reasoning: Patient reports 3-day headache, severity 7/10. Risk: moderate.", color: "text-primary" },
  { label: "[TOOL] ", text: "create_observation called → requires clinician approval", color: "text-amber-400" },
  { label: "[AUTH] ", text: "Clinician session confirmed → Observation written to FHIR", color: "text-emerald-400" },
];

// ── Animation ──────────────────────────────────────────────────────────────

const fade = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.5 } }),
};

// ── Component ──────────────────────────────────────────────────────────────

/**
 * MCP Server dedicated marketing page — all AI tool references are generic.
 *
 * @param session - Active auth session for CTA variant.
 */
export function McpPage({ session }: { session: AuthResponse | null }) {
  return (
    <div className="pt-20">

      {/* ── Hero ── */}
      <section className="py-20 sm:py-28 bg-background relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl opacity-50 pointer-events-none" />
        <div className="max-w-[110rem] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div className="max-w-3xl" initial="hidden" animate="visible" variants={fade}>
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                Model Context Protocol
              </Badge>
              <Badge variant="secondary" className="text-xs">FHIR AI Integration</Badge>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.08] mb-6">
              Connect Any AI Tool to Your FHIR EMR with MCP
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-8">
              The Model Context Protocol (MCP) is an open standard that lets AI tools
              call external systems in a structured, secure way. DrGodly ships with a
              built-in MCP server that exposes your entire FHIR EMR as a queryable,
              AI-accessible tool layer — with HIPAA compliance enforced at every call.
            </p>
            <div className="flex flex-wrap gap-3">
              {!session && (
                <OAuthPkceButton size="lg" className="rounded-full px-8">
                  Get Started Free <ArrowRight className="ml-2 w-4 h-4" />
                </OAuthPkceButton>
              )}
              <a href="#tools" className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors">
                Browse MCP Tools <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 p-8 rounded-2xl bg-secondary/40 border border-border/50"
          >
            {[
              { icon: <Server className="w-5 h-5 text-primary" />, value: "MCP", label: "Open interoperability standard" },
              { icon: <Database className="w-5 h-5 text-primary" />, value: "6+", label: "FHIR tools available" },
              { icon: <ShieldCheck className="w-5 h-5 text-primary" />, value: "HIPAA", label: "Scoped at every tool call" },
              { icon: <Zap className="w-5 h-5 text-primary" />, value: "Real-time", label: "Live FHIR data, no exports" },
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

      {/* ── What is MCP ── */}
      <section className="py-20 sm:py-24 bg-secondary/30">
        <div className="max-w-[110rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <span className="text-primary font-semibold tracking-wider uppercase text-sm">What Is MCP?</span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-foreground mb-6">
                The Standard for Connecting AI Tools to External Systems
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                The Model Context Protocol (MCP) is an open standard that defines how AI
                systems can discover and call tools exposed by external servers. Instead
                of building custom integrations for every AI system, you expose one MCP
                server — and any compatible AI tool can connect to it.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-8">
                DrGodly&apos;s MCP server turns your FHIR EMR into a set of callable tools.
                An AI system can call <span className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">get_patient</span>,{" "}
                <span className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">list_appointments</span>, or{" "}
                <span className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">get_intake_summary</span>{" "}
                and receive structured FHIR data — no custom API contracts, no data exports, no PHI leakage.
              </p>
              <div className="space-y-3">
                {[
                  "One MCP server, compatible with any MCP-capable AI tool",
                  "Structured FHIR R4 data returned — not raw text",
                  "Every tool call is authenticated, scoped, and audited",
                  "Read and write tools available (writes require clinician approval)",
                ].map((point, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    {point}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Terminal */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl"
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/40">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <Terminal className="w-3.5 h-3.5" />
                  drgodly-mcp-server
                </div>
                <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-500">Running</Badge>
              </div>
              <div className="p-5 font-mono text-[11px] space-y-2 bg-background/50 min-h-[320px]">
                {terminalLines.map((line, i) => (
                  <motion.div
                    key={i}
                    custom={i}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fade}
                    className="flex gap-2 leading-relaxed"
                  >
                    <span className="text-muted-foreground/50 shrink-0">{line.label}</span>
                    <span className={line.color}>{line.text}</span>
                  </motion.div>
                ))}
                <div className="flex gap-2 pt-1">
                  <span className="text-muted-foreground/50">{"[WAIT] "}</span>
                  <span className="text-muted-foreground">
                    Listening for next tool call
                    <span className="inline-block w-1.5 h-3.5 bg-primary ml-1 animate-pulse" />
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── How it works timeline ── */}
      <section className="py-20 sm:py-24 bg-background">
        <div className="max-w-[110rem] mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fade}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <span className="text-primary font-semibold tracking-wider uppercase text-sm">How It Works</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-foreground">
              From AI Tool Call to FHIR Response in Milliseconds
            </h2>
          </motion.div>

          <div className="max-w-3xl mx-auto space-y-6">
            {howItWorks.map((step, i) => (
              <motion.div
                key={i}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fade}
                className="flex items-start gap-6 p-6 rounded-2xl bg-secondary/40 border border-border/50"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold text-sm">{step.step}</span>
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Available tools ── */}
      <section id="tools" className="py-20 sm:py-24 bg-secondary/30">
        <div className="max-w-[110rem] mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fade}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <span className="text-primary font-semibold tracking-wider uppercase text-sm">Available Tools</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-foreground">
              MCP Tools Available on DrGodly
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Each tool returns structured FHIR R4 data and is scoped to the
              authenticated organization to prevent cross-organization PHI access.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {mcpTools.map((tool, i) => (
              <motion.div
                key={tool.name}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fade}
              >
                <Card className="h-full border-border/50 hover:border-border transition-colors">
                  <CardContent className="pt-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-sm font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                        {tool.name}
                      </span>
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-1" />
                    </div>
                    <p className="text-sm text-foreground font-medium">{tool.description}</p>
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground">
                        <span className="font-semibold text-foreground/70">Returns: </span>
                        {tool.returns}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        <span className="font-semibold text-emerald-600">HIPAA: </span>
                        {tool.hipaa}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use cases ── */}
      <section className="py-20 sm:py-24 bg-background">
        <div className="max-w-[110rem] mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fade}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              What You Can Build with DrGodly MCP
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-6">
            {useCases.map((uc, i) => (
              <motion.div
                key={i}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fade}
              >
                <Card className="h-full border-border/50">
                  <CardContent className="pt-6 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      {uc.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground mb-2">{uc.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{uc.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
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
              Ready to Connect Your AI Tooling to FHIR?
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
              Start using the DrGodly MCP server to query live FHIR records from any
              MCP-compatible AI tool — securely and without custom integrations.
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
