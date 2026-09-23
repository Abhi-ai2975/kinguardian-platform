/**
 * HowItWorks — animated timeline explaining the AI FHIR clinical workflow.
 *
 * Layer: client / (marketing) / components
 *
 * Shows the five-step journey from patient intake through FHIR record
 * finalization, emphasizing AI automation and interoperability at each stage.
 */

"use client";

import { motion } from "framer-motion";
import { CheckCircle2, UserCheck, Database, ClipboardList, Mic, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ── Animation variants ──────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.25 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

// ── Workflow steps ──────────────────────────────────────────────────────────

const steps = [
  {
    number: "01",
    icon: <UserCheck className="w-6 h-6 text-primary" />,
    title: "Patient Registers & Books",
    badge: "Patient Portal",
    description:
      "Patients register, complete their FHIR Practitioner-linked profile, and book appointments through the patient portal — all in under two minutes.",
  },
  {
    number: "02",
    icon: <Mic className="w-6 h-6 text-primary" />,
    title: "AI Intake Agent",
    badge: "AI Automation",
    description:
      "Before the appointment, an AI agent collects symptoms via text or voice. It extracts structured data and creates FHIR Observations and Conditions automatically.",
  },
  {
    number: "03",
    icon: <ClipboardList className="w-6 h-6 text-primary" />,
    title: "Doctor Reviews AI Insights",
    badge: "Clinical Review",
    description:
      "The doctor sees a pre-populated dashboard with AI-generated SOAP notes, differential diagnosis, risk assessment, and recommended tests — all before the consult begins.",
  },
  {
    number: "04",
    icon: <Mic className="w-6 h-6 text-primary" />,
    title: "Live AI Consultation",
    badge: "Real-Time",
    description:
      "Patient and doctor connect via telemedicine. AI transcribes the conversation, generates clinical notes, and flags any red flags or precautions in real time.",
  },
  {
    number: "05",
    icon: <Database className="w-6 h-6 text-primary" />,
    title: "FHIR Records Finalized",
    badge: "FHIR R4",
    description:
      "On consultation completion, a FHIR Encounter resource is created, SOAP notes are stored, the MCP server is updated, and follow-up appointments can be scheduled instantly.",
  },
];

// ── Component ──────────────────────────────────────────────────────────────

/**
 * Animated alternating-side timeline showing the FHIR clinical AI workflow.
 */
export default function HowItWorks() {
  return (
    <motion.section
      id="how-it-works"
      className="py-20 sm:py-28 bg-background overflow-hidden relative"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={containerVariants}
    >
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-secondary/20 to-transparent pointer-events-none" />

      <div className="max-w-[110rem] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div variants={itemVariants} className="text-center max-w-3xl mx-auto">
          <span className="text-primary font-semibold tracking-wider uppercase text-sm">
            Workflow
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-foreground">
            AI FHIR Clinical Workflow
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From the first patient interaction to a finalized FHIR record, DrGodly
            automates and AI-enhances every step of the clinical journey.
          </p>
        </motion.div>

        <div className="relative mt-20">
          {/* Vertical line */}
          <motion.div
            className="absolute left-8 top-0 bottom-0 w-0.5 bg-border rounded-full lg:left-1/2 lg:-translate-x-1/2"
            style={{ originY: 0 }}
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            <div className="absolute top-0 bottom-0 w-full bg-gradient-to-b from-primary/50 via-primary to-primary/50 opacity-50" />
          </motion.div>

          <motion.div
            className="relative flex flex-col items-start gap-y-12"
            variants={containerVariants}
          >
            {steps.map((step, index) => {
              const isEven = index % 2 === 0;
              return (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  className={`w-full flex items-start gap-6 lg:w-1/2 ${
                    isEven
                      ? "lg:self-start lg:pr-12"
                      : "lg:self-end lg:flex-row-reverse lg:pl-12"
                  }`}
                >
                  {/* Step circle */}
                  <motion.div
                    className="relative z-10 flex-shrink-0"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <div className="w-16 h-16 bg-background border-4 border-primary/20 rounded-full flex items-center justify-center shadow-lg shadow-primary/10 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
                      <span className="text-xl font-bold text-primary relative z-10">
                        {step.number}
                      </span>
                    </div>
                  </motion.div>

                  {/* Step content */}
                  <div className={`pt-2 ${!isEven ? "lg:text-right" : ""}`}>
                    <div
                      className={`flex items-center gap-2 mb-1 ${
                        !isEven ? "lg:flex-row-reverse" : ""
                      }`}
                    >
                      <h3 className="text-xl font-bold text-foreground">
                        {step.title}
                      </h3>
                      <CheckCircle2 className="w-5 h-5 text-primary hidden lg:block shrink-0" />
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-semibold mb-2">
                      {step.badge}
                    </Badge>
                    <p className="mt-1 text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}
