/**
 * CharacteristicsReferralTab — service characteristics (e.g. wheelchair
 * accessible) and accepted referral methods — both sourced live from the
 * FHIR terminology server via TerminologySelect (resource="HealthcareService").
 */

"use client";

import { FieldGroup } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { CodeableConceptRepeatableField } from "../CodeableConceptRepeatableField";

/** @see CreateHealthcareServiceForm */
export function CharacteristicsReferralTab() {
  return (
    <FieldGroup className="flex flex-col gap-4 p-1 pr-3">
      <CodeableConceptRepeatableField
        name="characteristic"
        terminologyField="characteristic"
        description="Characteristics of the service, e.g. wheelchair accessible, bulk billing."
        addLabel="Add characteristic"
        placeholder="Search characteristics…"
        emptyMessage="No characteristics added."
      />

      <Separator />

      <CodeableConceptRepeatableField
        name="referral_method"
        terminologyField="referralMethod"
        description="Ways the service accepts referrals, e.g. phone, fax, online portal."
        addLabel="Add referral method"
        placeholder="Search referral methods…"
        emptyMessage="No referral methods added."
      />
    </FieldGroup>
  );
}
