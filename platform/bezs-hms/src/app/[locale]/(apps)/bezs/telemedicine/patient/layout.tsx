/**
 * Patient telemedicine layout.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/patient
 *
 * Mounts PatientModalProvider once so all patient-section modals
 * (book, cancel, reschedule, upload result, etc.) are available on every
 * patient sub-page without each page needing to render the provider itself.
 */

import { PatientModalProvider } from "@/modules/client/telemedicine/patient/provider/PatientModalProvider";

export const dynamic = "force-dynamic";

function PatientLayout(
  props: LayoutProps<"/[locale]/bezs/telemedicine/patient">,
) {
  return (
    <>
      {props.children}
      <PatientModalProvider />
    </>
  );
}

export default PatientLayout;
