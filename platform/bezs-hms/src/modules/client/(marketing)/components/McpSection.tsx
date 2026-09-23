/**
 * McpSection — dedicated section highlighting the DrGodly MCP Server integration.
 *
 * Layer: client / (marketing) / components
 *
 * Explains how the Model Context Protocol (MCP) server exposes the FHIR EMR
 * as a structured AI tool, enabling AI assistants (e.g., Claude) to query
 * patient records, appointments, and clinical data natively.
 *
 * Visually mirrors the AetherEHR terminal demo concept: left panel describes
 * the MCP server capabilities, right panel shows a live mock terminal log.
 */

"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  Server,
  Terminal,
  CheckCircle2,
  Database,
  Brain,
  Shield,
  Zap,
} from "lucide-react";

// ── MCP capability list ─────────────────────────────────────────────────────

const capabilities = [
  {
    icon: <Database className="w-4 h-4 text-primary shrink-0" />,
    text: "Query FHIR Patient, Appointment, Observation, and Encounter resources",
  },
  {
    icon: <Brain className="w-4 h-4 text-primary shrink-0" />,
    text: "Connect Claude, GPT-4, or any MCP-compatible AI to your live clinical data",
  },
  {
    icon: <Shield className="w-4 h-4 text-primary shrink-0" />,
    text: "All tool calls are HIPAA-scoped — PHI never leaves your secure environment",
  },
  {
    icon: <Zap className="w-4 h-4 text-primary shrink-0" />,
    text: "Real-time FHIR resource creation via AI tool calls — no manual data entry",
  },
];

// ── Mock terminal log lines ─────────────────────────────────────────────────

const terminalLogs = [
  { prefix: "[INIT]", text: "DrGodly MCP Server v1.0 started on port 3100", color: "text-muted-foreground" },
  { prefix: "[FHIR]", text: "FHIR R4 base URL registered as MCP tool context", color: "text-blue-400" },
  { prefix: "[AUTH]", text: "HIPAA-scoped JWT session validated for org-0028", color: "text-emerald-400" },
  { prefix: "[TOOL]", text: "get_patient_by_id called → PAT-00241 returned", color: "text-violet-400" },
  { prefix: "[TOOL]", text: "list_appointments called → 3 upcoming records", color: "text-violet-400" },
  { prefix: "[TOOL]", text: "get_intake_summary called → AI SOAP note attached", color: "text-amber-400" },
  { prefix: "[AI]  ", text: "Claude: Based on intake, patient shows moderate migraine risk.", color: "text-primary" },
  { prefix: "[FHIR]", text: "RiskAssessment resource created → fhir_id: RSK-0041", color: "text-emerald-400" },
];

// ── Component ──────────────────────────────────────────────────────────────

/**
 * Dedicated MCP Server section with terminal simulation.
 */
export default function McpSection() {
  return (
    <section
      id="mcp"
      className="py-20 sm:py-28 bg-secondary/30 overflow-hidden"
    >
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
            MCP Integration
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-foreground">
            Your FHIR EMR as an AI Tool
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            DrGodly ships with a built-in{" "}
            <span className="text-foreground font-semibold">Model Context Protocol (MCP) server</span>{" "}
            — turning your entire clinical record system into a structured, queryable tool
            for any AI assistant.
          </p>
        </motion.div>

        {/* Two-column layout */}
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left: capabilities */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="space-y-8"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Server className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">MCP Server for FHIR EMR</h3>
                <Badge variant="outline" className="text-[10px] mt-1 border-primary/30 text-primary">
                  Model Context Protocol
                </Badge>
              </div>
            </div>

            <p className="text-muted-foreground leading-relaxed">
              The MCP server exposes your FHIR resources as AI-callable tools. An AI
              assistant can query patient history, retrieve lab results, create
              RiskAssessments, and update clinical records — all through structured,
              HIPAA-compliant tool calls with no raw database access.
            </p>

            <ul className="space-y-4">
              {capabilities.map((cap, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="flex items-start gap-3"
                >
                  {cap.icon}
                  <span className="text-sm text-muted-foreground leading-relaxed">
                    {cap.text}
                  </span>
                </motion.li>
              ))}
            </ul>

            {/* Compatible clients */}
            <div className="pt-4 border-t border-border/50">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Works With Any MCP-Compatible AI Client
              </p>
              <div className="flex flex-wrap gap-2">
                {["AI Chat Assistants", "AI Coding Tools", "AI Agents", "Open Source MCP Clients"].map((ai) => (
                  <Badge key={ai} variant="secondary" className="text-xs">
                    {ai}
                  </Badge>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right: terminal */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl"
          >
            {/* Terminal top bar */}
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
              <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-500">
                Running
              </Badge>
            </div>

            {/* Terminal body */}
            <div className="p-5 font-mono text-xs space-y-2 bg-background/50 min-h-[300px]">
              {terminalLogs.map((log, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                  className="flex gap-3 leading-relaxed"
                >
                  <span className="text-muted-foreground/50 shrink-0 select-none">
                    {log.prefix}
                  </span>
                  <span className={log.color}>{log.text}</span>
                </motion.div>
              ))}

              {/* Blinking cursor */}
              <div className="flex gap-3">
                <span className="text-muted-foreground/50 shrink-0 select-none">[WAIT] </span>
                <span className="text-muted-foreground">
                  Listening for next tool call
                  <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse" />
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
