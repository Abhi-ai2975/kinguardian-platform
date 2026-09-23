/**
 * @filenest/node client — FileNest Node.js SDK main client class.
 *
 * Usage:
 *   import { FileNest } from '@filenest/node';
 *   const fn = new FileNest({ apiKey: process.env.FILENEST_API_KEY!, projectId: 'proj_...' });
 *   const file = await fn.files.upload({ filename: 'report.pdf', data: buffer });
 *
 * @module
 */

import { FileNestHttpClient, type FileNestHttpClientConfig } from "@filenest/core";
import { FilesNamespace } from "./namespaces/files.js";
import { FoldersNamespace } from "./namespaces/folders.js";
import { SearchNamespace } from "./namespaces/search.js";
import { WebhooksNamespace } from "./namespaces/webhooks.js";
import { UploadTokensNamespace } from "./namespaces/upload-tokens.js";
import { UploadsNamespace } from "./namespaces/uploads.js";

export interface FileNestConfig extends FileNestHttpClientConfig {
  projectId: string;
}

export class FileNest {
  readonly files: FilesNamespace;
  readonly folders: FoldersNamespace;
  readonly search: SearchNamespace;
  readonly webhooks: WebhooksNamespace;
  readonly uploadTokens: UploadTokensNamespace;
  readonly uploads: UploadsNamespace;

  private readonly http: FileNestHttpClient;

  constructor(config: FileNestConfig) {
    this.http = new FileNestHttpClient(config);
    const { projectId } = config;

    this.files = new FilesNamespace(this.http, projectId);
    this.folders = new FoldersNamespace(this.http, projectId);
    this.search = new SearchNamespace(this.http, projectId);
    this.webhooks = new WebhooksNamespace(this.http, projectId);
    this.uploadTokens = new UploadTokensNamespace(this.http, projectId);
    this.uploads = new UploadsNamespace(this.http, projectId);
  }
}
