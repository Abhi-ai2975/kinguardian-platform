/**
 * Footer — site-wide footer for the DrGodly marketing landing page.
 *
 * Layer: client / (marketing) / components
 *
 * Four-column layout: brand tagline, Product links, Company links, Legal links.
 * Bottom bar includes copyright and compliance trust badges
 * (HIPAA, HL7 FHIR R4, MCP Server).
 */

"use client";

import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Marketing page footer with compliance trust badges and navigation links.
 */
export default function Footer() {
  return (
    <motion.footer
      className="bg-secondary/30 border-t border-border"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-[110rem] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <a href="#" className="flex items-center space-x-2 text-primary">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-2xl font-bold text-foreground">DrGodly</span>
            </a>
            <p className="mt-4 text-muted-foreground text-sm leading-relaxed">
              The AI-native FHIR R4 EMR built for HIPAA-compliant telemedicine
              and electronic medical records.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                FHIR R4
              </Badge>
              <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600">
                HIPAA
              </Badge>
              <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-600">
                MCP
              </Badge>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold text-foreground">Product</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {[
                { label: "FHIR EMR", href: "/fhir-emr" },
                { label: "AI Clinical Agents", href: "/ai-agents" },
                { label: "MCP Server", href: "/mcp" },
                { label: "How It Works", href: "/how-it-works" },
                { label: "Pricing", href: "#" },
              ].map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-foreground">Company</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {["About Us", "Careers", "Press", "Contact"].map((item) => (
                <li key={item}>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-foreground">Legal</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {["Privacy Policy", "Terms of Service", "HIPAA BAA", "Compliance"].map((item) => (
                <li key={item}>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} DrGodly. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span>HL7® FHIR® R4 Compliant</span>
            <span className="text-border">·</span>
            <span>HIPAA Secured</span>
            <span className="text-border">·</span>
            <span>MCP Server Integration</span>
          </div>
        </div>
      </div>
    </motion.footer>
  );
}
