/**
 * Shared prop types for the Create Schedule form and its sub-components.
 */

import type { TCreateScheduleFormSchema } from "@/modules/entities/schemas/schedule";

/**
 * Props accepted by the top-level CreateScheduleForm shell.
 * Submission and cancellation logic live in the parent modal.
 */
export interface CreateScheduleFormProps {
  /** Called by form.handleSubmit with validated form values. */
  onSubmit: (values: TCreateScheduleFormSchema) => Promise<void>;
  /** Closes the modal. */
  onCancel: () => void;
  /** True while the server action is in flight — disables the submit button. */
  isPending: boolean;
}
