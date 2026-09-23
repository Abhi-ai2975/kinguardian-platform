/**
 * Shared prop types for the Create Practitioner form and its sub-components.
 */

import type { TCreatePractitionerFormSchema } from "@/modules/entities/schemas/practitioner";

/**
 * Props accepted by the top-level CreatePractitionerForm shell.
 * Submission and cancellation logic live in the parent modal.
 */
export interface CreatePractitionerFormProps {
  /** Called by form.handleSubmit with validated form values. */
  onSubmit: (values: TCreatePractitionerFormSchema) => Promise<void>;
  /** Closes the modal. */
  onCancel: () => void;
  /** True while the server action is in flight — disables the submit button. */
  isPending: boolean;
}
