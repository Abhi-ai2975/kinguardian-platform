/**
 * Shared prop types for the Create Slot form and its sub-components.
 */

import type { TCreateSlotFormSchema } from "@/modules/entities/schemas/slot";

/**
 * Props accepted by the top-level CreateSlotForm shell.
 * Submission and cancellation logic live in the parent modal.
 */
export interface CreateSlotFormProps {
  /** Called by form.handleSubmit with validated form values. */
  onSubmit: (values: TCreateSlotFormSchema) => Promise<void>;
  /** Closes the modal. */
  onCancel: () => void;
  /** True while the server action is in flight — disables the submit button. */
  isPending: boolean;
}
