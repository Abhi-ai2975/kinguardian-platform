/**
 * LanguagesSection — spoken language preferences (Practitioner.communication).
 *
 * Layer: client / telemedicine / doctor / forms / sections
 *
 * Manages language_codes as a controlled string array via useFormContext.
 * Existing languages are shown as removable badges. A TerminologySelect
 * lets the user add new languages. The submit handler in the shell diffs
 * this array against the server state to add new and delete removed entries.
 *
 * Uses TerminologySelect in server-search mode scoped to the BCP-47 system
 * so the user can search by language name.
 */

"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { TerminologySelect } from "@/modules/client/shared/components/TerminologySelect";

import { SectionHeading } from "../SectionHeading";
import type { TDoctorProfileForm } from "../schema";

/**
 * Renders the languages spoken section with add/remove language chip UX.
 */
export function LanguagesSection() {
  const form = useFormContext<TDoctorProfileForm>();

  const codes: string[] = useWatch({ control: form.control, name: "language_codes" }) ?? [];

  /**
   * Adds a language code to the array if not already present.
   *
   * @param code - BCP-47 language code, e.g. "en", "ta", "fr".
   */
  function addLanguage(code: string) {
    if (!code || codes.includes(code)) return;
    form.setValue("language_codes", [...codes, code], { shouldDirty: true });
  }

  /**
   * Removes a language code from the array.
   *
   * @param code - The code to remove.
   */
  function removeLanguage(code: string) {
    form.setValue(
      "language_codes",
      codes.filter((c) => c !== code),
      { shouldDirty: true },
    );
  }

  return (
    <div>
      <SectionHeading
        title="Languages spoken"
        description="Languages you can use to communicate with patients."
      />

      {/* Existing language chips */}
      {codes.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {codes.map((code) => (
            <Badge key={code} variant="secondary" className="gap-1.5 pr-1">
              {code}
              <button
                type="button"
                aria-label={`Remove ${code}`}
                onClick={() => removeLanguage(code)}
                className="rounded-sm opacity-60 hover:opacity-100 hover:bg-accent"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Add language — server search via IETF BCP-47 system */}
      <div className="max-w-xs">
        <TerminologySelect
          resource="Practitioner"
          field="communication"
          placeholder="Add a language…"
          serverSearch
          minChars={1}
          value={null}
          onChange={(val) => {
            const code = typeof val === "string" ? val : val?.code;
            if (code) addLanguage(code);
          }}
        />
      </div>
    </div>
  );
}
