"use client";

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";
import { ZSAError } from "zsa";
import { CalendarDays, Clock, DollarSign, Hash } from "lucide-react";
import { SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { FormSelect } from "@/modules/client/shared/custom-form-fields";
import {
  UpdateUserPreferenceFormSchema,
  TUpdateUserPreferenceFormSchema,
  TUserPreferenceSchema,
} from "@/modules/entities/schemas/settings/preference/preference.schema";
import { updateUserPreferenceAction } from "@/modules/server/presentation/actions/settings/preference.action";
import { createPreferencePresenter } from "@/modules/shared/preference-presenter";
import { regionalPresets } from "@/modules/shared/preference-data";
import {
  countryOptions,
  timezoneOptions,
  dateFormatOptions,
  timeFormatOptions,
  currencyOptions,
  numberFormatOptions,
  weekStartOptions,
} from "@/modules/shared/preference-data";

interface UserPreferenceFormProps {
  preference: TUserPreferenceSchema | null;
  error: ZSAError | null;
}

export function UserPreferenceForm({
  preference,
  error,
}: UserPreferenceFormProps) {
  useEffect(() => {
    if (error) {
      toast.error(
        error.message || "Something went wrong while loading preferences.",
      );
    }
  }, [error]);

  const savedDefaults: TUpdateUserPreferenceFormSchema = {
    country: preference?.country ?? "IN",
    timezone: preference?.timezone ?? "Asia/Kolkata",
    dateFormat: preference?.dateFormat ?? "DD/MM/YYYY",
    timeFormat: preference?.timeFormat ?? "hh:mm A",
    currency: preference?.currency ?? "INR",
    numberFormat: preference?.numberFormat ?? "1,23,456.78",
    weekStart: preference?.weekStart ?? "monday",
  };

  const form = useForm<TUpdateUserPreferenceFormSchema>({
    resolver: zodResolver(UpdateUserPreferenceFormSchema),
    defaultValues: savedDefaults,
  });

  const currentValues = form.watch();

  const { formatDate, formatTime, formatCurrency, formatNumber } =
    createPreferencePresenter(currentValues);

  const { execute, isPending } = useServerAction(updateUserPreferenceAction, {
    onSuccess() {
      toast.success("Preferences saved successfully.");
    },
    onError({ err }) {
      toast.error(
        err.message || "Something went wrong while saving preferences.",
      );
    },
  });

  async function onSubmit(values: TUpdateUserPreferenceFormSchema) {
    await execute({
      payload: values,
      transportOptions: {
        shouldRevalidate: true,
        url: "/settings/preference",
      },
    });
  }

  // Auto-fill regional presets when country changes
  const isInitialMount = useRef(true);
  const prevCountry = useRef<string>(savedDefaults.country);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const country = currentValues.country;
    if (country && country !== prevCountry.current) {
      prevCountry.current = country;
      const preset = regionalPresets[country];
      if (preset) {
        form.reset({ ...form.getValues(), ...preset });
      }
    }
  }, [currentValues.country, form]);

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Preferences
            </h1>
            <p className="text-muted-foreground">
              Customize your locale, date, time, currency, and number formats.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ---- Form ---- */}
          <div className="lg:col-span-2 space-y-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* Country */}
                <Card>
                  <CardHeader>
                    <CardTitle>Region</CardTitle>
                    <CardDescription>
                      Selecting a country auto-fills sensible defaults for all
                      other fields.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormSelect
                        control={form.control}
                        name="country"
                        label="Country"
                      >
                        {countryOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </FormSelect>
                    </div>
                  </CardContent>
                </Card>

                {/* Date & Time */}
                <Card>
                  <CardHeader>
                    <CardTitle>Date & Time</CardTitle>
                    <CardDescription>
                      Control how dates, times, and the start of the week are
                      displayed.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormSelect
                        control={form.control}
                        name="timezone"
                        label="Timezone"
                      >
                        {timezoneOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </FormSelect>

                      <FormSelect
                        control={form.control}
                        name="dateFormat"
                        label="Date Format"
                      >
                        {dateFormatOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </FormSelect>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormSelect
                        control={form.control}
                        name="timeFormat"
                        label="Time Format"
                      >
                        {timeFormatOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </FormSelect>

                      <FormSelect
                        control={form.control}
                        name="weekStart"
                        label="Week Start"
                      >
                        {weekStartOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </FormSelect>
                    </div>
                  </CardContent>
                </Card>

                {/* Numbers & Currency */}
                <Card>
                  <CardHeader>
                    <CardTitle>Numbers & Currency</CardTitle>
                    <CardDescription>
                      Choose your currency and number grouping style.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormSelect
                        control={form.control}
                        name="currency"
                        label="Currency"
                      >
                        {currencyOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </FormSelect>

                      <FormSelect
                        control={form.control}
                        name="numberFormat"
                        label="Number Format"
                      >
                        {numberFormatOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </FormSelect>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex gap-3 flex-wrap">
                  <Button type="submit" disabled={isPending} className="flex-1">
                    {isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Preferences
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => form.reset(savedDefaults)}
                  >
                    Reset
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          {/* ---- Live Preview ---- */}
          <div>
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
                <CardDescription>
                  How your data will be displayed with these settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <PreviewTile
                    icon={<CalendarDays className="w-4 h-4" />}
                    label="Date"
                    value={formatDate(new Date())}
                  />
                  <PreviewTile
                    icon={<Clock className="w-4 h-4" />}
                    label="Time"
                    value={formatTime(new Date())}
                  />
                  <PreviewTile
                    icon={<DollarSign className="w-4 h-4" />}
                    label="Currency"
                    value={formatCurrency(1234.56)}
                  />
                  <PreviewTile
                    icon={<Hash className="w-4 h-4" />}
                    label="Number"
                    value={formatNumber(1234.56)}
                  />
                </div>

                <div className="pt-3 border-t space-y-1.5 text-sm">
                  <PreviewRow label="Timezone" value={currentValues.timezone} />
                  <PreviewRow
                    label="Date format"
                    value={currentValues.dateFormat}
                  />
                  <PreviewRow
                    label="Time format"
                    value={currentValues.timeFormat}
                  />
                  <PreviewRow
                    label="Week starts"
                    value={
                      currentValues.weekStart.charAt(0).toUpperCase() +
                      currentValues.weekStart.slice(1)
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

function PreviewTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-muted rounded-lg p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-base font-semibold truncate">{value}</div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  );
}
