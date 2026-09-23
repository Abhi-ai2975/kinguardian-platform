/**
 * VoiceConsultation — "Coming Soon" placeholder for voice AI consultation.
 *
 * Layer: client / telemedicine / patient / component / consultation
 *
 * Mirrors drgodly-mvp VoiceConsultation.tsx exactly: a centred ripple-animation
 * card with a pulsing microphone indicator and disabled controls.
 * Voice consultation is not yet implemented — only the UI shell is present.
 */

"use client";

import { Mic } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Placeholder voice consultation page component.
 * Renders a "Coming Soon" card — no functional logic.
 */
export function VoiceConsultation() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100dvh-156px)] w-full">
      <Card className="flex flex-col items-center gap-6 p-10 max-w-sm w-full text-center">
        {/* Ripple animation around mic icon */}
        <div className="relative flex items-center justify-center">
          {/* Outer ripple */}
          <span className="absolute inline-flex h-28 w-28 animate-ping rounded-full bg-primary/10 opacity-75" />
          {/* Inner ring */}
          <span className="absolute inline-flex h-20 w-20 rounded-full bg-primary/15" />
          {/* Mic icon circle */}
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary/20">
            <Mic className="h-7 w-7 text-primary" />
          </div>
        </div>

        {/* Labels */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <p className="text-lg font-semibold">Voice Consultation</p>
            <Badge variant="secondary" className="text-xs">
              Coming Soon
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Voice-based AI consultation is not yet available. Use Text
            Consultation in the meantime — it&apos;s just as fast and generates
            a full clinical report.
          </p>
        </div>

        {/* Disabled controls */}
        <div className="flex flex-col gap-3 w-full">
          <Button disabled className="w-full gap-2">
            <Mic className="h-4 w-4" />
            Start Call
          </Button>
          <Button variant="ghost" disabled className="w-full">
            End Call
          </Button>
        </div>
      </Card>
    </div>
  );
}
