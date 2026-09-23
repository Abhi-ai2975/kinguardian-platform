/**
 * /features/storage — FileNest storage abstraction feature detail page.
 * @module
 */
import { StoragePage } from "@/modules/client/(marketing)/pages/StoragePage";

export const metadata = {
  title: "Storage — FileNest",
  description: "S3, R2, Azure Blob, GCS, MinIO — one API, any cloud, per-project configuration.",
};

export default function StorageFeaturePage() {
  return <StoragePage />;
}
