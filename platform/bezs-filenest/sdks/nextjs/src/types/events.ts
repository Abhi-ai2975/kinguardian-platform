/**
 * @filenest/nextjs types/events — typed webhook event union.
 * @module
 */

import type { FileRecord } from "@filenest/core";

export interface FileUploadedEvent {
  type: "file.uploaded";
  data: {
    fileId: string;
    filename: string;
    projectId: string;
    organizationId: string;
    metadata?: Record<string, unknown>;
    file: FileRecord;
  };
}

export interface FileProcessedEvent {
  type: "file.processed";
  data: {
    fileId: string;
    filename: string;
    projectId: string;
    organizationId: string;
    status: "ready" | "failed";
    stages: { name: string; passed: boolean; error?: string }[];
    file: FileRecord;
  };
}

export interface FileDeletedEvent {
  type: "file.deleted";
  data: {
    fileId: string;
    filename: string;
    projectId: string;
    organizationId: string;
  };
}

export interface FileVirusDetectedEvent {
  type: "file.virus_detected";
  data: {
    fileId: string;
    filename: string;
    projectId: string;
    organizationId: string;
    virusName: string;
  };
}

export interface FileReadyEvent {
  type: "file.ready";
  data: {
    fileId: string;
    filename: string;
    projectId: string;
    organizationId: string;
    file: FileRecord;
  };
}

/** Discriminated union of all webhook event shapes. */
export type WebhookEvent =
  | FileUploadedEvent
  | FileProcessedEvent
  | FileDeletedEvent
  | FileVirusDetectedEvent
  | FileReadyEvent;
