/**
 * /features/processing — FileNest processing pipeline feature detail page.
 * @module
 */
import { ProcessingPage } from "@/modules/client/(marketing)/pages/ProcessingPage";

export const metadata = {
  title: "Processing — FileNest",
  description: "Virus scanning, MIME validation, OCR, PHI detection, thumbnails, and AI embeddings — per upload, automatically.",
};

export default function ProcessingFeaturePage() {
  return <ProcessingPage />;
}
