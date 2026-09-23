/**
 * ZoomControls — floating zoom in/out/reset toolbar over the preview pane.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / preview
 *
 * Shared between the image and DICOM renderers — the same three buttons and
 * the same percentage readout, since zooming reads identically to a doctor
 * regardless of which renderer produced the pixels underneath.
 */

"use client";

import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ZoomState } from "./useZoom";

interface ZoomControlsProps {
  zoom: ZoomState;
}

/**
 * Floating zoom toolbar, anchored to the pane's bottom-right corner.
 *
 * @param zoom - Zoom state and controls from useZoom.
 */
export function ZoomControls({ zoom }: ZoomControlsProps) {
  return (
    <div className="absolute bottom-3 right-3 z-10 flex items-center gap-0.5 rounded-md border bg-background/95 p-1 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        disabled={!zoom.canZoomOut}
        onClick={zoom.zoomOut}
        aria-label="Zoom out"
        title="Zoom out"
      >
        <ZoomOut className="size-4" />
      </Button>

      <span className="w-11 text-center text-xs tabular-nums text-muted-foreground">
        {Math.round(zoom.scale * 100)}%
      </span>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        disabled={!zoom.canZoomIn}
        onClick={zoom.zoomIn}
        aria-label="Zoom in"
        title="Zoom in"
      >
        <ZoomIn className="size-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        disabled={zoom.scale === 1}
        onClick={zoom.reset}
        aria-label="Reset zoom"
        title="Reset zoom"
      >
        <RotateCcw className="size-3.5" />
      </Button>
    </div>
  );
}
