/**
 * ContactSection — phone, alternative phone, email, alternative email.
 *
 * Layer: client / telemedicine / doctor / forms / sections
 *
 * Reads the form via useFormContext — must be rendered inside a <Form> provider.
 */

"use client";

import { useFormContext } from "react-hook-form";

import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { SectionHeading } from "../SectionHeading";
import type { TDoctorProfileForm } from "../schema";

/**
 * Renders the contact information section: primary and alternative phone / email.
 */
export function ContactSection() {
  const form = useFormContext<TDoctorProfileForm>();

  return (
    <div>
      <SectionHeading
        title="Contact information"
        description="How patients and your care team can reach you."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mobile number</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="+1 555 000 0000"
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
          name="alt_phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Alternative mobile</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="+1 555 000 0000"
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email address</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="doctor@clinic.com"
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
          name="alt_email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Alternative email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="doctor@clinic.com"
                  {...field}
                  value={field.value ?? ""}
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
