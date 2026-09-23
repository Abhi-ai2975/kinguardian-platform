/**
 * documentNaming — names for the DocumentReference records uploads create.
 *
 * Layer: client / telemedicine / shared / components / clinical
 *
 * Uploading a result against an order writes two resources: one DiagnosticReport
 * carrying the batch, and one DocumentReference per file. The Documents tab
 * lists DocumentReference resources only, so that second entry shows up there on
 * its own with nothing tying it back to the order it came from — a bare filename
 * in that list says nothing about what the file is a result of.
 *
 * The DiagnosticReport's presented_form titles stay bare filenames on purpose:
 * those render in the Orders tab underneath their own order, where the order
 * name is already the heading above them.
 *
 * Shared because a result can be uploaded from either side — the doctor's
 * UploadOrderResultModal or the patient's UploadResultModal — and two files
 * attached to the same order should not be named differently depending on who
 * attached them.
 */

/**
 * Names a result document after its order and file.
 *
 * @param orderName - The order's display name, e.g. "CBC". May be absent for an
 *                    order the doctor has not named yet.
 * @param filename - The uploaded file's name.
 * @returns e.g. "CBC (cbc-report.pdf)". Falls back to the bare filename when
 *          there is no order name — "(cbc-report.pdf)" on its own would read as
 *          though something had gone missing.
 */
export function resultDocumentName(
  orderName: string | null | undefined,
  filename: string,
): string {
  const order = orderName?.trim();
  return order ? `${order} (${filename})` : filename;
}
