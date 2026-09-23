/**
 * AiAgentsPage — dedicated marketing page explaining DrGodly's AI clinical agents.
 *
 * Layer: client / (marketing) / pages
 *
 * Covers: the three clinical AI agents (intake, consultation, voice), how each
 * agent works end-to-end, the data it produces (FHIR resources, SOAP notes),
 * and the human oversight model that ensures clinical safety.
 */

"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { OAuthPkceButton } from "@/modules/client/auth/components/OAuthPkceButton";
import {
  Brain,
  MessageSquare,
  Mic,
  ClipboardList,
  Eye,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Database,
  ShieldCheck,
  Clock,
} from "lucide-react";
import type { AuthResponse } from "@/modules/server/auth/types";

// ── Agent definitions ──────────────────────────────────────────────────────

const agents = [
  {
    id: "intake",
    icon: <MessageSquare className="w-8 h-8 text-blue-500" />,
    color: "border-blue-500/20 bg-blue-500/5",
    accentColor: "text-blue-500",
    badgeColor: "border-blue-500/30 text-blue-600",
    status: "Active",
    title: "AI Intake Agent",
    subtitle: "Pre-appointment patient intake via text or voice",
    description:
      "Before every appointment, the AI Intake Agent guides the patient through a structured clinical interview. It collects symptoms, duration, severity, and relevant history — then converts everything into structured FHIR resources.",
    howItWorks: [
      "Patient accesses the intake form before their appointment",
      "Agent asks targeted clinical questions in natural language",
      "Patient responses are parsed and structured in real time",
      "FHIR Observations and Conditions are written to the EMR",
      "A SOAP-style AI summary is generated for the doctor",
    ],
    outputs: ["FHIR Observation resources", "FHIR Condition (differential hints)", "AI SOAP Note", "Risk assessment score", "Recommended questions for doctor"],
  },
  {
    id: "consultation",
    icon: <Brain className="w-8 h-8 text-violet-500" />,
    color: "border-violet-500/20 bg-violet-500/5",
    accentColor: "text-violet-500",
    badgeColor: "border-violet-500/30 text-violet-600",
    status: "Active",
    title: "AI Consultation Agent",
    subtitle: "Real-time clinical intelligence during telemedicine consultations",
    description:
      "During the telemedicine consultation, the AI Consultation Agent assists the clinician by transcribing the conversation, generating a structured SOAP note, and surfacing clinical flags in real time.",
    howItWorks: [
      "Doctor and patient connect for a telemedicine session",
      "Agent transcribes the conversation in real time",
      "Clinical keywords trigger SOAP note section updates",
      "Agent surfaces differential diagnoses and red flags",
      "On session end, a complete Encounter is submitted for clinician review",
    ],
    outputs: ["FHIR Encounter resource", "Full SOAP Note (S/O/A/P)", "Differential diagnosis", "Assessment & treatment plan", "Follow-up recommendation"],
  },
  {
    id: "voice",
    icon: <Mic className="w-8 h-8 text-emerald-500" />,
    color: "border-emerald-500/20 bg-emerald-500/5",
    accentColor: "text-emerald-500",
    badgeColor: "border-emerald-500/30 text-emerald-600",
    status: "Coming Soon",
    title: "Voice AI Agent",
    subtitle: "Ambient voice intake and consultation for hands-free clinical workflows",
    description:
      "The Voice AI Agent extends the capabilities of the intake and consultation agents into fully ambient, hands-free clinical interactions — capturing clinical conversations in real time without requiring any manual input from the clinician.",
    howItWorks: [
      "Clinician activates ambient listening mode for the session",
      "Agent identifies speakers (clinician vs. patient) automatically",
      "Clinical dialogue is transcribed and structured live",
      "FHIR resources are created as the conversation unfolds",
      "Clinician reviews and approves the generated Encounter before finalizing",
    ],
    outputs: ["Real-time transcript", "Speaker-attributed SOAP note", "FHIR Observation stream", "Ambient clinical summary", "Auto-generated follow-up plan"],
  },
];

// ── Human oversight model ──────────────────────────────────────────────────

const oversightPrinciples = [
  {
    icon: <Eye className="w-5 h-5 text-primary" />,
    title: "Review Before Write",
    description: "No AI-generated content is written to the FHIR EMR until a licensed clinician reviews and explicitly approves it.",
  },
  {
    icon: <ShieldCheck className="w-5 h-5 text-primary" />,
    title: "Advisory by Default",
    description: "Every AI output is marked as a suggestion. Clinicians can accept, edit, or discard any AI-generated content before it enters the patient record.",
  },
  {
    icon: <ClipboardList className="w-5 h-5 text-primary" />,
    title: "Full Audit Trail",
    description: "All AI actions — what it generated, when, and whether the clinician accepted or modified it — are logged in immutable audit records.",
  },
  {
    icon: <Clock className="w-5 h-5 text-primary" />,
    title: "Time-Bounded Sessions",
    description: "Each AI agent session is time-bounded and tied to a specific appointment. No agent has persistent access to the full patient record.",
  },
];

// ── Animation ──────────────────────────────────────────────────────────────

const fade = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.5 } }),
};

// ── Component ──────────────────────────────────────────────────────────────

/**
 * AI Clinical Agents dedicated marketing page.
 *
 * @param session - Active auth session for CTA variant.
 */
export function AiAgentsPage({ session }: { session: AuthResponse | null }) {
  return (
    <div className="pt-20">

      {/* ── Hero ── */}
      <section className="py-20 sm:py-28 bg-background relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl opacity-50 pointer-events-none" />
        <div className="max-w-[110rem] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div className="max-w-3xl" initial="hidden" animate="visible" variants={fade}>
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                AI Clinical Agents
              </Badge>
              <Badge variant="secondary" className="text-xs">Autonomous Clinical Intelligence</Badge>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.08] mb-6">
              Clinical AI Agents That Work Before, During, and After Every Appointment
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-8">
              DrGodly deploys specialized AI agents at each phase of the clinical encounter.
              The Intake Agent collects and structures patient data before the appointment.
              The Consultation Agent assists the clinician in real time. All outputs become
              FHIR records — reviewed and approved by the clinician before they&apos;re finalized.
            </p>
            <div className="flex flex-wrap gap-3">
              {!session && (
                <OAuthPkceButton size="lg" className="rounded-full px-8">
                  Get Started Free <ArrowRight className="ml-2 w-4 h-4" />
                </OAuthPkceButton>
              )}
              <a href="#agents" className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors">
                Explore Agents <ArrowRight className="w-4 h-4" />
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
              { icon: <Sparkles className="w-5 h-5 text-primary" />, value: "3", label: "Specialized clinical agents" },
              { icon: <Database className="w-5 h-5 text-primary" />, value: "FHIR", label: "All outputs are FHIR resources" },
              { icon: <Eye className="w-5 h-5 text-primary" />, value: "100%", label: "Clinician review required" },
              { icon: <ClipboardList className="w-5 h-5 text-primary" />, value: "Full", label: "Audit trail on all AI actions" },
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

      {/* ── Agents ── */}
      <section id="agents" className="py-20 sm:py-24 bg-secondary/30">
        <div className="max-w-[110rem] mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
          {agents.map((agent, ai) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className={`grid lg:grid-cols-2 gap-12 items-start ${ai % 2 === 1 ? "lg:grid-flow-col-dense" : ""}`}
            >
              {/* Text side */}
              <div className={ai % 2 === 1 ? "lg:col-start-2" : ""}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-14 h-14 rounded-2xl ${agent.color} border flex items-center justify-center`}>
                    {agent.icon}
                  </div>
                  <div>
                    <Badge variant="outline" className={`text-[10px] mb-1 ${agent.badgeColor}`}>
                      {agent.status}
                    </Badge>
                    <h2 className={`text-2xl font-bold ${agent.accentColor}`}>{agent.title}</h2>
                  </div>
                </div>
                <p className="text-muted-foreground font-medium mb-3">{agent.subtitle}</p>
                <p className="text-muted-foreground leading-relaxed mb-6">{agent.description}</p>

                <div className="space-y-2 mb-6">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">How It Works</p>
                  {agent.howItWorks.map((step, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className={`font-bold shrink-0 mt-0.5 ${agent.accentColor}`}>{i + 1}.</span>
                      {step}
                    </div>
                  ))}
                </div>
              </div>

              {/* Output card */}
              <div className={ai % 2 === 1 ? "lg:col-start-1 lg:row-start-1" : ""}>
                <Card className={`border ${agent.color}`}>
                  <CardContent className="pt-6">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                      Agent Outputs
                    </p>
                    <div className="space-y-3">
                      {agent.outputs.map((output, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border/50">
                          <CheckCircle2 className={`w-4 h-4 shrink-0 ${agent.accentColor}`} />
                          <span className="text-sm text-foreground font-medium">{output}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Human oversight ── */}
      <section className="py-20 sm:py-24 bg-background">
        <div className="max-w-[110rem] mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fade}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <span className="text-primary font-semibold tracking-wider uppercase text-sm">Human Oversight</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-foreground">
              AI Assists. Clinicians Decide.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Every AI output in DrGodly is advisory. No AI agent can finalize a FHIR
              record, submit a diagnosis, or modify a patient chart without explicit
              clinician review and approval.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {oversightPrinciples.map((p, i) => (
              <motion.div
                key={i}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fade}
              >
                <Card className="h-full border-border/50">
                  <CardContent className="pt-6 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      {p.icon}
                    </div>
                    <h3 className="font-bold text-foreground">{p.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
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
              Put AI to Work on Your Clinical Workflow
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
              Let AI handle intake, transcription, and documentation — so your clinicians
              can focus on what matters: the patient in front of them.
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
