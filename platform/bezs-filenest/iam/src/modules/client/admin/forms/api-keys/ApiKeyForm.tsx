"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CreateApiKeyValidationSchema,
  TCreateApiKeyValidationSchema,
} from "@/modules/entities/schemas/admin/api-keys/api-keys.schema";

type TProps = {
  onSubmit: (values: TCreateApiKeyValidationSchema) => Promise<void>;
  onCancel: () => void;
  defaultValues?: Partial<TCreateApiKeyValidationSchema>;
  isLoading?: boolean;
  submitLabel?: string;
};

export function ApiKeyForm({
  onSubmit,
  onCancel,
  defaultValues,
  isLoading,
  submitLabel = "Create",
}: TProps) {
  const form = useForm<TCreateApiKeyValidationSchema>({
    resolver: zodResolver(CreateApiKeyValidationSchema),
    defaultValues: {
      name: "",
      userId: "",
      rateLimitEnabled: true,
      rateLimitMax: 10,
      rateLimitTimeWindow: 86400000,
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Production API Key" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Prefix */}
        <FormField
          control={form.control}
          name="prefix"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prefix (optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. prod_"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormDescription>
                Overrides the default prefix for this key.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Expiry (seconds) */}
        <FormField
          control={form.control}
          name="expiresIn"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expires In (seconds, optional)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="e.g. 2592000 (30 days)"
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === "" ? null : Number(e.target.value),
                    )
                  }
                />
              </FormControl>
              <FormDescription>Leave blank for no expiry.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Remaining */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="remaining"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Remaining Uses</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Unlimited"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="refillAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Refill Amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="None"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Refill Interval */}
        <FormField
          control={form.control}
          name="refillInterval"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Refill Interval (ms, optional)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="e.g. 86400000 (1 day)"
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === "" ? null : Number(e.target.value),
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Rate Limiting */}
        <FormField
          control={form.control}
          name="rateLimitEnabled"
          render={({ field }) => (
            <FormItem className="flex items-center gap-3">
              <FormControl>
                <Switch
                  checked={field.value ?? true}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="!mt-0">Enable Rate Limiting</FormLabel>
            </FormItem>
          )}
        />

        {form.watch("rateLimitEnabled") && (
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="rateLimitMax"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Requests</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rateLimitTimeWindow"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time Window (ms)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Permissions JSON */}
        <FormField
          control={form.control}
          name="permissions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Permissions (JSON, optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='e.g. {"patient":["read","write"]}'
                  rows={3}
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormDescription>
                Resource-to-actions map. Leave blank for no permission
                restrictions.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Metadata JSON */}
        <FormField
          control={form.control}
          name="metadata"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Metadata (JSON, optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='e.g. {"env":"production"}'
                  rows={2}
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving…" : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
