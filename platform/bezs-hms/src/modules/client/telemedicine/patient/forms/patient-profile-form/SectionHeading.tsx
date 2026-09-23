/**
 * SectionHeading — visual divider used between field groups in the patient profile form.
 *
 * Layer: client / telemedicine / patient / forms
 */

/**
 * Renders a labelled horizontal rule to separate form sections.
 *
 * @param title       - Section label.
 * @param description - Optional subtitle shown below the title.
 */
export function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      )}
      <div className="mt-3 border-t" />
    </div>
  );
}
