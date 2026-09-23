/**
 * Shared prop types for the Create Healthcare Service form and its sub-components.
 */

import type { TCreateHealthcareServiceFormSchema } from "@/modules/entities/schemas/healthcare-service";

/**
 * Props accepted by the top-level CreateHealthcareServiceForm shell.
 * Submission and cancellation logic live in the parent modal.
 */
export interface CreateHealthcareServiceFormProps {
  /** Called by form.handleSubmit with validated form values. */
  onSubmit: (values: TCreateHealthcareServiceFormSchema) => Promise<void>;
  /** Closes the modal. */
  onCancel: () => void;
  /** True while the server action is in flight — disables the submit button. */
  isPending: boolean;
}
