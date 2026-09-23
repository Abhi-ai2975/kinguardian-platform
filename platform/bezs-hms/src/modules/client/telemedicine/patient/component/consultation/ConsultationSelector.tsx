/**
 * ConsultationSelector — entry-point card picker for the patient AI consultation flow.
 *
 * Layer: client / telemedicine / patient / component / consultation
 *
 * Mirrors drgodly-mvp ConsultationSelector exactly:
 *   - Text Consultation card (enabled) → /consultation/chat
 *   - Voice Consultation card (disabled, "Coming Soon") → non-navigable
 *
 * Each card shows an icon, title, description, feature bullets, and a CTA row.
 * The disabled card uses reduced opacity and aria-disabled semantics.
 */

"use client";

import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Mic, ArrowRight, Zap, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Card config ───────────────────────────────────────────────────────────────

const cards = [
  {
    href: "/bezs/telemedicine/patient/consultation/chat",
    icon: MessageSquare,
    title: "Text Consultation",
    description:
      "Chat with our AI consultation agent by typing your symptoms and questions. Get a detailed clinical assessment and report at the end of your session.",
    features: [
      "Instant responses",
      "Full report generated",
      "24 / 7 available",
    ],
    disabled: false,
    badge: null,
  },
  {
    href: "/bezs/telemedicine/patient/consultation/voice",
    icon: Mic,
    title: "Voice Consultation",
    description:
      "Speak naturally with our AI agent using your microphone. A hands-free, conversational experience designed to feel like a real clinical visit.",
    features: [
      "Hands-free interaction",
      "Real-time transcription",
      "Natural conversation",
    ],
    disabled: true,
    badge: "Coming Soon",
  },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders two consultation-mode cards centred on the page.
 * The Text card is a navigable Link; the Voice card is an inert div.
 */
export function ConsultationSelector() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto py-6 px-2">
      {/* Heading */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">
          Start a Consultation
        </h2>
        <p className="text-sm text-muted-foreground">
          Choose how you&apos;d like to consult with our AI today.
        </p>
      </div>

      {/* Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon;

          const inner = (
            <div
              className={cn(
                "group relative flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm transition-all duration-200 h-full",
                card.disabled
                  ? "opacity-60 cursor-not-allowed select-none"
                  : "hover:border-primary/50 hover:shadow-md cursor-pointer",
              )}
            >
              {/* Coming Soon badge */}
              {card.badge && (
                <Badge
                  variant="secondary"
                  className="absolute top-4 right-4 gap-1 text-xs"
                >
                  <Clock className="size-3" />
                  {card.badge}
                </Badge>
              )}

              {/* Icon */}
              <div
                className={cn(
                  "w-fit rounded-xl p-3",
                  card.disabled
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary/10 text-primary group-hover:bg-primary/15",
                )}
              >
                <Icon className="size-6" />
              </div>

              {/* Text */}
              <div className="space-y-1.5 flex-1">
                <p className="font-semibold text-base">{card.title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {card.description}
                </p>
              </div>

              {/* Feature bullets */}
              <ul className="space-y-1.5">
                {card.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <Zap className="size-3 shrink-0 text-primary/60" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {!card.disabled && (
                <div className="flex items-center gap-1 text-sm font-medium text-primary mt-1">
                  Begin session
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              )}
            </div>
          );

          return card.disabled ? (
            <div key={card.title} aria-disabled className="h-full">
              {inner}
            </div>
          ) : (
            <Link key={card.title} href={card.href} className="h-full">
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
