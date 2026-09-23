/**
 * Hero — primary above-the-fold section for the DrGodly marketing page.
 *
 * Layer: client / (marketing) / components
 *
 * Positions DrGodly as an AI-native, HIPAA-compliant FHIR R4 EMR platform
 * with MCP server integration. Includes animated badge row, headline, CTA
 * buttons, a mock EMR card visual, and a key-metric stat row.
 */

"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { OAuthPkceButton } from "@/modules/client/auth/components/OAuthPkceButton";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  Database,
  Server,
  Mic,
  FileText,
  Brain,
  CheckCircle2,
} from "lucide-react";
import type { AuthResponse } from "@/modules/server/auth/types";

// ── Animation variants ──────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: "easeOut" as const },
  },
};

const floatingVariants = {
  initial: { y: 0 },
  animate: {
    y: [-8, 8, -8],
    transition: { duration: 4, repeat: Infinity, ease: "easeInOut" as const },
  },
};

// ── FHIR resource rows shown in the mock EMR card ─────────────────────────

const fhirRows = [
  { resource: "Patient", id: "PAT-00241", status: "Active", color: "text-blue-500" },
  { resource: "Appointment", id: "APT-00872", status: "Booked", color: "text-emerald-500" },
  { resource: "Observation", id: "OBS-03301", status: "Final", color: "text-violet-500" },
  { resource: "Encounter", id: "ENC-00118", status: "Finished", color: "text-amber-500" },
];

// ── Component ──────────────────────────────────────────────────────────────

/**
 * Full-width hero section positioning DrGodly as the AI-native FHIR EMR.
 *
 * @param session - Active auth session; controls CTA button variant.
 */
export default function Hero({ session }: { session: AuthResponse | null }) {
  return (
    <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-32 overflow-hidden bg-background">
      {/* Background blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
        <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl opacity-60 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl opacity-40" />
      </div>

      <div className="max-w-[110rem] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          className="grid lg:grid-cols-2 gap-16 items-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* ── Left column: copy + CTAs ── */}
          <div className="text-center lg:text-left max-w-2xl mx-auto lg:mx-0">
            {/* Live-status pill */}
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 mb-6">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-sm text-muted-foreground font-medium">
                FHIR R4 Native &middot; HIPAA Compliant &middot; MCP Server Ready
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.08]"
            >
              The AI-Native{" "}
              <span className="text-primary">FHIR EMR</span>{" "}
              Built for Modern Healthcare
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={itemVariants}
              className="mt-6 text-lg sm:text-xl text-muted-foreground leading-relaxed"
            >
              DrGodly unifies electronic medical records, FHIR R4 interoperability,
              AI-driven clinical agents, and an MCP server — all inside a single
              HIPAA-compliant telemedicine platform.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              variants={itemVariants}
              className="mt-10 flex flex-col sm:flex-row justify-center lg:justify-start items-center gap-4"
            >
              {!session ? (
                <>
                  <OAuthPkceButton
                    size="lg"
                    className="rounded-full px-8 h-12 text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                  >
                    Start Free — No Credit Card
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </OAuthPkceButton>
                  <OAuthPkceButton
                    variant="outline"
                    size="lg"
                    className="rounded-full px-8 h-12 text-base border-primary/20 hover:bg-primary/5"
                  >
                    View Live Demo
                  </OAuthPkceButton>
                </>
              ) : (
                <Link href={session.session.activeRoleRedirectUrl ?? "/dashboard"}>
                  <Button
                    size="lg"
                    className="rounded-full px-8 h-12 text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                  >
                    Open Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
            </motion.div>

            {/* Trust badges */}
            <motion.div
              variants={itemVariants}
              className="mt-12 pt-8 border-t border-border/50 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">HIPAA Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">HL7 FHIR R4</span>
              </div>
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">MCP Server</span>
              </div>
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">AI Agents</span>
              </div>
            </motion.div>
          </div>

          {/* ── Right column: mock FHIR EMR card ── */}
          <motion.div variants={itemVariants} className="relative hidden lg:block">
            <div className="relative w-full max-w-[560px] mx-auto">
              {/* Main card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.4 }}
                className="relative bg-card border border-border rounded-3xl shadow-2xl overflow-hidden z-20"
              >
                {/* Card header */}
                <div className="px-6 py-4 border-b border-border bg-muted/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    DrGodly FHIR EMR — v1.0
                  </span>
                  <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-500">
                    Live
                  </Badge>
                </div>

                {/* FHIR resource table */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      FHIR R4 Resources
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">4 records</span>
                  </div>

                  {fhirRows.map((row, i) => (
                    <motion.div
                      key={row.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.1 }}
                      className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/40 border border-border/50"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className={`w-4 h-4 ${row.color}`} />
                        <div>
                          <p className="text-sm font-semibold text-foreground">{row.resource}</p>
                          <p className="text-[11px] font-mono text-muted-foreground">{row.id}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-[10px] border-border/60 ${row.color}`}>
                        {row.status}
                      </Badge>
                    </motion.div>
                  ))}

                  {/* AI Intake summary */}
                  <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/15">
                    <div className="flex items-start gap-3">
                      <Brain className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-1">AI Intake Summary</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Chief complaint: persistent headache. Differential: tension headache,
                          migraine. Risk: Low. SOAP note generated.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Floating badge: HIPAA */}
              <motion.div
                variants={floatingVariants}
                initial="initial"
                animate="animate"
                className="absolute -top-4 -right-6 px-4 py-3 bg-card rounded-2xl shadow-xl border border-border z-30 flex items-center gap-2"
              >
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">HIPAA</p>
                  <p className="text-muted-foreground">Compliant</p>
                </div>
              </motion.div>

              {/* Floating badge: MCP Server */}
              <motion.div
                variants={floatingVariants}
                initial="initial"
                animate="animate"
                transition={{ delay: 1.5 }}
                className="absolute -bottom-6 -left-6 px-4 py-3 bg-card rounded-2xl shadow-xl border border-border z-30 flex items-center gap-2"
              >
                <Server className="w-5 h-5 text-primary" />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">MCP Server</p>
                  <p className="text-muted-foreground">Connected</p>
                </div>
              </motion.div>

              {/* Floating badge: Voice AI */}
              <motion.div
                variants={floatingVariants}
                initial="initial"
                animate="animate"
                transition={{ delay: 0.8 }}
                className="absolute top-1/2 -left-10 -translate-y-1/2 px-4 py-3 bg-card rounded-2xl shadow-xl border border-border z-30 flex items-center gap-2"
              >
                <Mic className="w-5 h-5 text-violet-500" />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">Voice AI</p>
                  <p className="text-muted-foreground">Active</p>
                </div>
              </motion.div>

              <div className="absolute inset-0 bg-gradient-to-tr from-primary/15 to-emerald-500/10 rounded-full blur-3xl -z-10 transform rotate-12" />
            </div>
          </motion.div>
        </motion.div>

        {/* ── Key metric row ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.7 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-border/50 pt-12"
        >
          {[
            { value: "80%", label: "Less Documentation Time", icon: <FileText className="w-5 h-5 text-primary" /> },
            { value: "FHIR R4", label: "HL7 Interoperability Standard", icon: <Database className="w-5 h-5 text-primary" /> },
            { value: "HIPAA", label: "Compliance Built-In", icon: <ShieldCheck className="w-5 h-5 text-primary" /> },
            { value: "MCP", label: "AI Tool Integration Ready", icon: <Server className="w-5 h-5 text-primary" /> },
          ].map((stat, i) => (
            <div key={i} className="text-center flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                {stat.icon}
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
