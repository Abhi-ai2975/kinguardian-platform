/**
 * HowItWorksPage — dedicated deep-dive page on the DrGodly clinical workflow.
 *
 * Layer: client / (marketing) / pages
 *
 * Covers: the full AI FHIR clinical workflow from the patient's perspective,
 * the doctor's perspective, and the underlying technical data flow showing
 * how each action maps to FHIR resources in real time.
 */

"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { OAuthPkceButton } from "@/modules/client/auth/components/OAuthPkceButton";
import {
  UserCheck,
  Calendar,
  MessageSquare,
  Stethoscope,
  FileText,
  Database,
  ArrowRight,
  ArrowDown,
  CheckCircle2,
  ClipboardList,
  Brain,
  Mic,
} from "lucide-react";
import type { AuthResponse } from "@/modules/server/auth/types";

// ── Patient journey ────────────────────────────────────────────────────────

const patientSteps = [
  {
    icon: <UserCheck className="w-6 h-6 text-blue-500" />,
    step: "01",
    title: "Register & Set Up Profile",
    description:
      "Patient registers with their basic information. A FHIR Patient resource is created. They select their preferred language, timezone, and notification preferences.",
    fhirResource: "Patient",
    fhirColor: "text-blue-500",
  },
  {
    icon: <Calendar className="w-6 h-6 text-violet-500" />,
    step: "02",
    title: "Browse Practitioners & Book",
    description:
      "Patient searches available practitioners by specialty, browses available appointment slots, and books a consultation. A FHIR Appointment resource is created with status 'booked'.",
    fhirResource: "Appointment",
    fhirColor: "text-violet-500",
  },
  {
    icon: <MessageSquare className="w-6 h-6 text-emerald-500" />,
    step: "03",
    title: "Complete AI Intake",
    description:
      "Before the appointment, the patient completes an AI-guided intake via text or voice. The AI asks clinical questions, extracts symptoms, and creates FHIR Observations automatically.",
    fhirResource: "Observation",
    fhirColor: "text-emerald-500",
  },
  {
    icon: <Stethoscope className="w-6 h-6 text-amber-500" />,
    step: "04",
    title: "Attend Telemedicine Consultation",
    description:
      "Patient connects with the doctor for a live telemedicine session. The AI Consultation Agent transcribes the conversation and surfaces clinical insights in real time.",
    fhirResource: "Encounter",
    fhirColor: "text-amber-500",
  },
  {
    icon: <FileText className="w-6 h-6 text-rose-500" />,
    step: "05",
    title: "Receive Clinical Report & Follow-Up",
    description:
      "After the consultation, the patient receives a summary of their visit, next steps, and any follow-up appointment recommendations. All records are accessible in the patient portal.",
    fhirResource: "DocumentReference",
    fhirColor: "text-rose-500",
  },
];

// ── Doctor journey ─────────────────────────────────────────────────────────

const doctorSteps = [
  {
    icon: <ClipboardList className="w-6 h-6 text-violet-500" />,
    step: "01",
    title: "View Today's Schedule",
    description:
      "Doctor logs in to the dashboard and sees all appointments for the day, sorted chronologically. Each appointment shows patient name, time, and appointment type.",
  },
  {
    icon: <Brain className="w-6 h-6 text-blue-500" />,
    step: "02",
    title: "Review AI Intake Insights",
    description:
      "Before the consultation, the doctor reviews the AI Intake Insights card: chief complaint, SOAP summary, differential diagnosis hints, risk score, and FHIR Observations.",
  },
  {
    icon: <Stethoscope className="w-6 h-6 text-emerald-500" />,
    step: "03",
    title: "Conduct Telemedicine Consultation",
    description:
      "Doctor connects with the patient via the telemedicine interface. The AI Consultation Agent assists with real-time transcription, SOAP note generation, and clinical flag alerts.",
  },
  {
    icon: <FileText className="w-6 h-6 text-amber-500" />,
    step: "04",
    title: "Review & Approve AI-Generated Notes",
    description:
      "After the consultation, the doctor reviews the AI-generated SOAP note, assessment plan, and treatment recommendations. They can edit any section before approving.",
  },
  {
    icon: <Database className="w-6 h-6 text-rose-500" />,
    step: "05",
    title: "FHIR Record Finalized",
    description:
      "On clinician approval, a FHIR Encounter resource is created and linked to the patient, appointment, observations, and conditions. The patient record is permanently updated.",
  },
];

// ── Technical data flow ────────────────────────────────────────────────────

const dataFlow = [
  { from: "Patient books slot", to: "FHIR Appointment (status: booked)", arrow: true },
  { from: "AI intake runs", to: "FHIR Observation[] + Condition hints", arrow: true },
  { from: "Consultation starts", to: "FHIR Encounter (status: in-progress)", arrow: true },
  { from: "AI generates SOAP note", to: "Encounter.text + assessment plan", arrow: true },
  { from: "Clinician approves", to: "FHIR Encounter (status: finished)", arrow: true },
  { from: "Follow-up scheduled", to: "FHIR Appointment (status: booked)", arrow: false },
];

// ── Animation ──────────────────────────────────────────────────────────────

const fade = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

// ── Component ──────────────────────────────────────────────────────────────

/**
 * How It Works dedicated marketing page — full workflow deep dive.
 *
 * @param session - Active auth session for CTA variant.
 */
export function HowItWorksPage({ session }: { session: AuthResponse | null }) {
  return (
    <div className="pt-20">

      {/* ── Hero ── */}
      <section className="py-20 sm:py-28 bg-background relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-3xl opacity-50 pointer-events-none" />
        <div className="max-w-[110rem] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div className="max-w-3xl mx-auto" initial="hidden" animate="visible" variants={fade}>
            <div className="flex items-center justify-center gap-2 mb-4">
              <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                Full Workflow
              </Badge>
              <Badge variant="secondary" className="text-xs">AI + FHIR + Telemedicine</Badge>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.08] mb-6">
              The Complete AI FHIR Clinical Workflow, Step by Step
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-8">
              DrGodly combines AI agents, FHIR R4 records, and telemedicine into a single
              coherent clinical workflow. Here is exactly how every interaction — from first
              booking to finalized FHIR record — works for both patients and doctors.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Patient journey ── */}
      <section className="py-20 sm:py-24 bg-secondary/30">
        <div className="max-w-[110rem] mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fade}
            className="mb-14"
          >
            <div className="flex items-center gap-3 mb-3">
              <UserCheck className="w-5 h-5 text-primary" />
              <span className="text-primary font-semibold tracking-wider uppercase text-sm">For Patients</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              The Patient Experience
            </h2>
            <p className="mt-3 text-lg text-muted-foreground max-w-2xl">
              From registration to receiving their clinical report, the patient journey in
              DrGodly is guided, AI-assisted, and fully documented in FHIR.
            </p>
          </motion.div>

          <div className="relative space-y-0">
            {patientSteps.map((step, i) => (
              <div key={i} className="flex items-stretch gap-8">
                {/* Timeline */}
                <div className="flex flex-col items-center shrink-0 pt-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", stiffness: 300, delay: i * 0.1 }}
                    className="w-12 h-12 rounded-full bg-background border-2 border-primary/20 flex items-center justify-center z-10 relative"
                  >
                    <span className="text-primary font-bold text-sm">{step.step}</span>
                  </motion.div>
                  {i < patientSteps.length - 1 && (
                    <div className="w-0.5 flex-1 bg-border/60 my-2" />
                  )}
                </div>

                {/* Content */}
                <motion.div
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fade}
                  className="flex-1 pb-10"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-background border border-border flex items-center justify-center">
                      {step.icon}
                    </div>
                    <h3 className="text-xl font-bold text-foreground">{step.title}</h3>
                    <Badge variant="outline" className={`text-[10px] font-mono ml-auto ${step.fhirColor}`}>
                      {step.fhirResource}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground leading-relaxed ml-12">{step.description}</p>
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Doctor journey ── */}
      <section className="py-20 sm:py-24 bg-background">
        <div className="max-w-[110rem] mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fade}
            className="mb-14"
          >
            <div className="flex items-center gap-3 mb-3">
              <Stethoscope className="w-5 h-5 text-primary" />
              <span className="text-primary font-semibold tracking-wider uppercase text-sm">For Doctors</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              The Doctor Experience
            </h2>
            <p className="mt-3 text-lg text-muted-foreground max-w-2xl">
              Clinicians start their day with AI-prepared patient insights and end it with
              FHIR records finalized — without spending extra time on documentation.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {doctorSteps.map((step, i) => (
              <motion.div
                key={i}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fade}
                className="relative"
              >
                <Card className="h-full border-border/50">
                  <CardContent className="pt-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary">{step.step}</span>
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                        {step.icon}
                      </div>
                    </div>
                    <h3 className="font-bold text-foreground text-sm">{step.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                  </CardContent>
                </Card>
                {i < doctorSteps.length - 1 && (
                  <div className="hidden xl:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10">
                    <ArrowRight className="w-4 h-4 text-muted-foreground/40" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Technical data flow ── */}
      <section className="py-20 sm:py-24 bg-secondary/30">
        <div className="max-w-[110rem] mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fade}
            className="text-center max-w-3xl mx-auto mb-14"
          >
            <span className="text-primary font-semibold tracking-wider uppercase text-sm">Technical Flow</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-foreground">
              How Clinical Actions Map to FHIR Resources
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Every action in DrGodly writes to the FHIR EMR in real time.
              Here is the exact resource mapping, end to end.
            </p>
          </motion.div>

          <div className="max-w-2xl mx-auto space-y-3">
            {dataFlow.map((flow, i) => (
              <motion.div
                key={i}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fade}
                className="flex flex-col items-center"
              >
                <div className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
                  <div className="flex-1 text-sm font-medium text-foreground">{flow.from}</div>
                  <ArrowRight className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 text-sm font-mono text-primary text-right">{flow.to}</div>
                </div>
                {flow.arrow && (
                  <ArrowDown className="w-4 h-4 text-border my-1" />
                )}
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-12 flex items-center justify-center gap-3 text-sm text-muted-foreground max-w-xl mx-auto text-center"
          >
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            Every FHIR write is gated by clinician approval — no AI agent can modify
            patient records without explicit human authorization.
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 sm:py-28 bg-background">
        <div className="max-w-[110rem] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Experience the Workflow for Yourself
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
              Create a free account and walk through the entire FHIR clinical workflow —
              from patient intake to finalized Encounter record.
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
