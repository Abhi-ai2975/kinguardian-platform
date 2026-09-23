/**
 * RecordStatBar — four-tile stats summary for the Medical Records page.
 *
 * Layer: client / telemedicine / patient / component / medical-records
 *
 * Shows: Total Orders, Awaiting Upload, Uploaded, Files Uploaded.
 * Each tile uses a muted card with a coloured accent icon so patients can
 * instantly see how many of their orders still need a result uploaded.
 *
 * Pure presentational — receives pre-computed counts as props.
 */

import { ClipboardList, Clock, CheckCircle2, Files } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Pre-computed stat values passed from MedicalRecordsClient. */
export interface RecordStatBarProps {
  /** Total number of service requests (orders) for this patient. */
  total: number;
  /** Orders that have no uploaded diagnostic reports yet. */
  awaiting: number;
  /** Orders that have at least one uploaded file. */
  uploaded: number;
  /** Total individual files across all diagnostic reports. */
  totalFiles: number;
}

// ── Sub-component ─────────────────────────────────────────────────────────────

interface StatTileProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  /** Tailwind classes for the icon container background + text colour. */
  iconClass: string;
}

/**
 * Individual stat tile — icon, number, label.
 *
 * @param label     - Short human-readable label below the number.
 * @param value     - Numeric count to display prominently.
 * @param icon      - Lucide icon element.
 * @param iconClass - Tailwind colour classes applied to the icon wrapper.
 */
function StatTile({ label, value, icon, iconClass }: StatTileProps) {
  return (
    <Card className="flex-1 min-w-0">
      <CardContent className="pt-4 pb-4 flex items-center gap-3">
        {/* Coloured icon badge */}
        <div
          className={`shrink-0 flex items-center justify-center rounded-lg p-2 ${iconClass}`}
        >
          {icon}
        </div>
        {/* Numeric value + label */}
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-none tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
            {label}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Horizontal row of four stat tiles summarising the patient's record status.
 *
 * @param total      - Total orders.
 * @param awaiting   - Orders with no uploaded files.
 * @param uploaded   - Orders with at least one uploaded file.
 * @param totalFiles - Total individual file count.
 */
export function RecordStatBar({
  total,
  awaiting,
  uploaded,
  totalFiles,
}: RecordStatBarProps) {
  return (
    <div className="flex gap-3 flex-wrap sm:flex-nowrap">
      <StatTile
        label="Total Orders"
        value={total}
        icon={<ClipboardList className="size-4" />}
        iconClass="bg-primary/10 text-primary"
      />
      <StatTile
        label="Awaiting Upload"
        value={awaiting}
        icon={<Clock className="size-4" />}
        iconClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
      />
      <StatTile
        label="Uploaded"
        value={uploaded}
        icon={<CheckCircle2 className="size-4" />}
        iconClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      />
      <StatTile
        label="Files Total"
        value={totalFiles}
        icon={<Files className="size-4" />}
        iconClass="bg-violet-500/10 text-violet-600 dark:text-violet-400"
      />
    </div>
  );
}
