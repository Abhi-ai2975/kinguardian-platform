"use client";

import { useFormContext } from "react-hook-form";
import { SelectItem } from "@/components/ui/select";
import { FormSelect } from "@/modules/client/shared/custom-form-fields";
import {
  scopeOptions,
  countryOptions,
  timezoneOptions,
  dateFormatOptions,
  timeFormatOptions,
  currencyOptions,
  numberFormatOptions,
  weekStartOptions,
} from "@/modules/shared/preference-data";

export function PreferenceTemplateFields() {
  const { control, watch } = useFormContext();
  const scope = watch("scope");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormSelect control={control} name="scope" label="Scope">
          {scopeOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </FormSelect>

        {scope === "COUNTRY" && (
          <FormSelect control={control} name="country" label="Country">
            {countryOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </FormSelect>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormSelect control={control} name="timezone" label="Timezone">
          {timezoneOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </FormSelect>

        <FormSelect control={control} name="dateFormat" label="Date Format">
          {dateFormatOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </FormSelect>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormSelect control={control} name="timeFormat" label="Time Format">
          {timeFormatOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </FormSelect>

        <FormSelect control={control} name="weekStart" label="Week Start">
          {weekStartOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </FormSelect>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormSelect control={control} name="currency" label="Currency">
          {currencyOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </FormSelect>

        <FormSelect control={control} name="numberFormat" label="Number Format">
          {numberFormatOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </FormSelect>
      </div>
    </div>
  );
}
