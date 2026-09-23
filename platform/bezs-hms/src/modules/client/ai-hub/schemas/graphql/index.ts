/**
 * GRAPHQL_DOCUMENTS — registry of GraphQL query/mutation documents for the
 * ai-hub workflow engine.
 *
 * Layer: client / ai-hub / schemas / graphql
 *
 * Mirrors the VALIDATION_SCHEMAS registry (../validation/index.ts) exactly:
 * a workflow JSON action/context_resolver never embeds a raw GraphQL string,
 * it only carries a `graphql_document` key (e.g. "create_patient") that gets
 * looked up here. This keeps the workflow JSON transport-agnostic and lets
 * the actual query text change in one place without touching every workflow
 * file that references it.
 *
 * Pilot scope: fhir-gql (D:/code/work/projects/fhir-gql) only exposes a
 * GraphQL schema for the Patient resource so far — every document below
 * corresponds 1:1 to a resolver in that project's app/gql/patient/{queries,
 * mutations}.py. Value-set/terminology lookups have no GraphQL equivalent
 * yet and stay on the REST path (see create_patient.json's context_resolvers
 * for gender/marital-status/etc. — those keep `type: "http"`).
 *
 * Every add_patient_* mutation takes `(patientId: Int!, input: XCreateInput!)`
 * and returns the FULL updated Patient (not just the created sub-resource),
 * per fhir-gql's PatientMutation resolvers — so `{ id }` is a sufficient
 * selection set for every mutation here; none of this workflow's downstream
 * steps consume a sub-resource's own id (only the top-level patient_id from
 * create_patient, and get_patient_by_id's confirmation calls, are actually
 * read after the fact).
 *
 * A bare template literal (no `graphql-tag` parsing) is enough here since
 * graphql-request accepts a plain string document — the `gql` tag below only
 * exists so editors/tooling that recognize the convention still syntax-
 * highlight the query text.
 */

/** No-op tag — see file header for why this isn't graphql-tag's `gql`. */
const gql = (strings: TemplateStringsArray, ...values: unknown[]): string =>
  strings.reduce((acc, s, i) => acc + s + (values[i] ?? ""), "");

export const GRAPHQL_DOCUMENTS: Record<string, string> = {
  // ── Queries ──────────────────────────────────────────────────────────────

  /** Used by every step-2..10 "confirm the Patient still exists" resolver. */
  get_patient_by_id: gql`
    query GetPatientById($patientId: Int!) {
      patient(patientId: $patientId) {
        id
      }
    }
  `,

  // ── Mutations ────────────────────────────────────────────────────────────

  create_patient: gql`
    mutation CreatePatient($input: PatientCreateInput!) {
      createPatient(input: $input) {
        id
      }
    }
  `,

  add_patient_name: gql`
    mutation AddPatientName($patientId: Int!, $input: NameCreateInput!) {
      addPatientName(patientId: $patientId, input: $input) {
        id
      }
    }
  `,

  add_patient_identifier: gql`
    mutation AddPatientIdentifier($patientId: Int!, $input: IdentifierCreateInput!) {
      addPatientIdentifier(patientId: $patientId, input: $input) {
        id
      }
    }
  `,

  add_patient_telecom: gql`
    mutation AddPatientTelecom($patientId: Int!, $input: TelecomCreateInput!) {
      addPatientTelecom(patientId: $patientId, input: $input) {
        id
      }
    }
  `,

  add_patient_address: gql`
    mutation AddPatientAddress($patientId: Int!, $input: AddressCreateInput!) {
      addPatientAddress(patientId: $patientId, input: $input) {
        id
      }
    }
  `,

  add_patient_communication: gql`
    mutation AddPatientCommunication($patientId: Int!, $input: CommunicationCreateInput!) {
      addPatientCommunication(patientId: $patientId, input: $input) {
        id
      }
    }
  `,

  add_patient_contact: gql`
    mutation AddPatientContact($patientId: Int!, $input: ContactCreateInput!) {
      addPatientContact(patientId: $patientId, input: $input) {
        id
      }
    }
  `,

  add_patient_general_practitioner: gql`
    mutation AddPatientGeneralPractitioner($patientId: Int!, $input: GeneralPractitionerCreateInput!) {
      addPatientGeneralPractitioner(patientId: $patientId, input: $input) {
        id
      }
    }
  `,

  add_patient_photo: gql`
    mutation AddPatientPhoto($patientId: Int!, $input: PhotoCreateInput!) {
      addPatientPhoto(patientId: $patientId, input: $input) {
        id
      }
    }
  `,

  add_patient_link: gql`
    mutation AddPatientLink($patientId: Int!, $input: LinkCreateInput!) {
      addPatientLink(patientId: $patientId, input: $input) {
        id
      }
    }
  `,
};
