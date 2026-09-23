/**
 * useZoom — shared zoom-level state for the image and DICOM renderers.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / preview
 *
 * The scale is applied as a CSS transform by the caller (FilePreviewPane), not
 * by re-rendering the underlying image or DICOM canvas — zoom is a display
 * transform, not a re-decode, so it stays instant even for a DICOM file that
 * took a moment to parse.
 */

"use client";

import { useCallback, useState } from "react";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Smallest zoom level — 25%. Below this the image stops being useful anyway. */
const MIN_SCALE = 0.25;

/** Largest zoom level — 400%. */
const MAX_SCALE = 4;

/** Multiplier per zoom step, so each click feels like a consistent jump. */
const STEP = 1.25;

/** Tolerance for the enabled/disabled button state at the scale bounds. */
const EPSILON = 1e-6;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ZoomState {
  /** Current scale, where 1 is 100%. */
  scale: number;
  zoomIn: () => void;
  zoomOut: () => void;
  /** Returns to 100%. */
  reset: () => void;
  /** Whether zoomIn is a matched to a real change (button disables itself at the ceiling). */
  canZoomIn: boolean;
  canZoomOut: boolean;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Tracks a clamped zoom scale with in/out/reset actions.
 *
 * @returns Zoom state and controls.
 */
export function useZoom(): ZoomState {
  const [scale, setScale] = useState(1);

  const zoomIn = useCallback(
    () => setScale((s) => Math.min(MAX_SCALE, s * STEP)),
    [],
  );
  const zoomOut = useCallback(
    () => setScale((s) => Math.max(MIN_SCALE, s / STEP)),
    [],
  );
  const reset = useCallback(() => setScale(1), []);

  return {
    scale,
    zoomIn,
    zoomOut,
    reset,
    canZoomIn: scale < MAX_SCALE - EPSILON,
    canZoomOut: scale > MIN_SCALE + EPSILON,
  };
}
