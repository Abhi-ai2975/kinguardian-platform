/**
 * Shared prop types for the Create Organization form and its sub-components.
 */

import type { TCreateOrgFormSchema } from "@/modules/entities/schemas/organization";

/**
 * Props accepted by the top-level CreateOrganizationForm shell.
 * Submission and cancellation logic live in the parent modal.
 */
export interface CreateOrganizationFormProps {
  /** Called by form.handleSubmit with validated form values. */
  onSubmit: (values: TCreateOrgFormSchema) => Promise<void>;
  /** Closes the modal. */
  onCancel: () => void;
  /** True while the server action is in flight — disables the submit button. */
  isPending: boolean;
}
