/**
 * PersonalDetailsSection — given name, family name, date of birth, gender.
 *
 * Layer: client / telemedicine / patient / forms / sections
 *
 * Reads the form via useFormContext — must be rendered inside a <Form> provider.
 */

"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TerminologySelect } from "@/modules/client/shared/components/TerminologySelect";

import { SectionHeading } from "../SectionHeading";
import type { TProfileForm } from "../schema";

/**
 * Renders the personal details section: legal name, DOB calendar popover, gender.
 * Owns its own calendarOpen state for the DOB popover.
 */
export function PersonalDetailsSection() {
  const form = useFormContext<TProfileForm>();
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <div>
      <SectionHeading
        title="Personal details"
        description="Your legal name, date of birth and gender."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <FormField
          control={form.control}
          name="given_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First / given name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. John"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="family_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last / family name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Smith"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date of birth — calendar popover */}
        <FormField
          control={form.control}
          name="birth_date"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-3">
              <FormLabel>Date of birth</FormLabel>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "h-9 text-left font-medium justify-start",
                      !field.value && "text-muted-foreground",
                    )}
                  >
                    {field.value ? format(field.value, "PPP") : "Pick a date"}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={(date) => {
                      setCalendarOpen(false);
                      field.onChange(date);
                    }}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    captionLayout="dropdown"
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gender</FormLabel>
              <FormControl>
                <TerminologySelect
                  resource="Patient"
                  field="gender"
                  placeholder="Select gender"
                  value={field.value ?? null}
                  onChange={(val) => field.onChange(val ?? "")}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
