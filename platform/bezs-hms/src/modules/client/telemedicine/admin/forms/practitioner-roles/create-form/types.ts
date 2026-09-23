/**
 * Shared prop types for the Create PractitionerRole form and its sub-components.
 */

import type { TCreatePractitionerRoleFormSchema } from "@/modules/entities/schemas/practitioner-role";

/**
 * Props accepted by the top-level CreatePractitionerRoleForm shell.
 * Submission and cancellation logic live in the parent modal.
 */
export interface CreatePractitionerRoleFormProps {
  /** Called by form.handleSubmit with validated form values. */
  onSubmit: (values: TCreatePractitionerRoleFormSchema) => Promise<void>;
  /** Closes the modal. */
  onCancel: () => void;
  /** True while the server action is in flight — disables the submit button. */
  isPending: boolean;
}
