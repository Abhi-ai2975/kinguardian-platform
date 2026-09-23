/**
 * /features/search — FileNest search architecture feature detail page.
 * @module
 */
import { SearchPage } from "@/modules/client/(marketing)/pages/SearchPage";

export const metadata = {
  title: "Search — FileNest",
  description: "Full-text search, faceted filtering, OCR-powered document search, and vector similarity powered by OpenSearch.",
};

export default function SearchFeaturePage() {
  return <SearchPage />;
}
