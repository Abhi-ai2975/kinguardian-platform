/**
 * Features — six-card grid showcasing DrGodly's core FHIR EMR capabilities.
 *
 * Layer: client / (marketing) / components
 *
 * Highlights: FHIR R4 native records, AI intake agents, HIPAA compliance,
 * MCP server integration, voice AI consultation, and full telemedicine workflow.
 */

"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  Brain,
  ShieldCheck,
  Server,
  Mic,
  Stethoscope,
} from "lucide-react";

// ── Animation variants ──────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" as const } },
};

// ── Feature definitions ─────────────────────────────────────────────────────

const features = [
  {
    icon: <Database className="h-8 w-8 text-primary" />,
    title: "FHIR R4 Native EMR",
    badge: "HL7 Standard",
    description:
      "Every patient record, appointment, observation, and encounter is stored as an HL7 FHIR R4 resource — giving you industry-standard interoperability from day one.",
  },
  {
    icon: <Brain className="h-8 w-8 text-primary" />,
    title: "AI Clinical Agents",
    badge: "Autonomous",
    description:
      "Intelligent intake agents collect patient symptoms via voice or text before appointments. AI extracts SOAP notes, differential diagnoses, and FHIR Observations automatically.",
  },
  {
    icon: <ShieldCheck className="h-8 w-8 text-primary" />,
    title: "HIPAA Compliant by Design",
    badge: "Compliance",
    description:
      "End-to-end encryption, BAA-ready infrastructure, complete audit trails on every clinical action, and zero PHI leakage. HIPAA compliance is baked in — not bolted on.",
  },
  {
    icon: <Server className="h-8 w-8 text-primary" />,
    title: "MCP Server for EMR",
    badge: "New",
    description:
      "Expose your FHIR EMR as a Model Context Protocol (MCP) server. Connect AI assistants like Claude directly to patient records for structured, queryable clinical intelligence.",
  },
  {
    icon: <Mic className="h-8 w-8 text-primary" />,
    title: "Voice AI Consultation",
    badge: "Real-Time",
    description:
      "Real-time voice consultations with automatic transcription, AI-generated SOAP notes, and instant FHIR Encounter creation. Clinicians focus on patients — AI handles the documentation.",
  },
  {
    icon: <Stethoscope className="h-8 w-8 text-primary" />,
    title: "End-to-End Telemedicine",
    badge: "Full Stack",
    description:
      "Book → AI Intake → Doctor Review → Live Consult → FHIR Record. A complete telemedicine workflow for patients and practitioners, with AI at every step.",
  },
];

// ── Component ──────────────────────────────────────────────────────────────

/**
 * Animated six-card feature grid.
 */
export default function Features() {
  return (
    <motion.section
      id="features"
      className="py-20 sm:py-28 bg-secondary/30"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={containerVariants}
    >
      <div className="max-w-[110rem] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div variants={itemVariants} className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-primary font-semibold tracking-wider uppercase text-sm">
            Platform Capabilities
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-foreground">
            Everything a Modern FHIR EMR Should Do
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From AI-powered intake to HIPAA-compliant FHIR records, DrGodly handles the
            full clinical workflow — so clinicians can focus on patients, not paperwork.
          </p>
        </motion.div>

        <motion.div
          className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card hover:border-border transition-all duration-300 group">
                <CardHeader>
                  <div className="flex items-start justify-between mb-4">
                    <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                      {feature.icon}
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-semibold">
                      {feature.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-bold text-foreground">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}
