/**
 * Shared prop types for the Create Location form and its sub-components.
 */

import type { TCreateLocationFormSchema } from "@/modules/entities/schemas/location";

/**
 * Props accepted by the top-level CreateLocationForm shell.
 * Submission and cancellation logic live in the parent modal.
 */
export interface CreateLocationFormProps {
  /** Called by form.handleSubmit with validated form values. */
  onSubmit: (values: TCreateLocationFormSchema) => Promise<void>;
  /** Closes the modal. */
  onCancel: () => void;
  /** True while the server action is in flight — disables the submit button. */
  isPending: boolean;
}
