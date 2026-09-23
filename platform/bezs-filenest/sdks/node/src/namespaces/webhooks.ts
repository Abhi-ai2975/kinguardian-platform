/**
 * @filenest/node namespaces/webhooks — WebhooksNamespace implementation.
 * @module
 */

import { createHmac, timingSafeEqual } from "crypto";
import type { FileNestHttpClient, ListResponse, Webhook, WebhookEvent } from "@filenest/core";

export interface WebhookCreateOptions {
  name: string;
  url: string;
  events: WebhookEvent[];
}

export interface WebhookUpdateOptions {
  name?: string;
  url?: string;
  events?: WebhookEvent[];
  status?: "active" | "disabled";
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  status: "success" | "failed" | "pending";
  responseStatus?: number;
  attemptedAt: string;
  nextRetryAt?: string;
}

export interface WebhookDeliveryListOptions {
  limit?: number;
  offset?: number;
}

export class WebhooksNamespace {
  constructor(
    private readonly http: FileNestHttpClient,
    private readonly projectId: string
  ) {}

  async create(options: WebhookCreateOptions): Promise<Webhook> {
    return this.http.post(`/v1/projects/${this.projectId}/webhooks`, options);
  }

  async list(): Promise<ListResponse<Webhook>> {
    return this.http.get(`/v1/projects/${this.projectId}/webhooks`);
  }

  async get(webhookId: string): Promise<Webhook> {
    return this.http.get(`/v1/projects/${this.projectId}/webhooks/${webhookId}`);
  }

  async update(webhookId: string, options: WebhookUpdateOptions): Promise<Webhook> {
    return this.http.patch(`/v1/projects/${this.projectId}/webhooks/${webhookId}`, options);
  }

  async delete(webhookId: string): Promise<void> {
    return this.http.delete(`/v1/projects/${this.projectId}/webhooks/${webhookId}`);
  }

  async listDeliveries(
    webhookId: string,
    options: WebhookDeliveryListOptions = {}
  ): Promise<ListResponse<WebhookDelivery>> {
    return this.http.get(`/v1/projects/${this.projectId}/webhooks/${webhookId}/deliveries`, {
      limit: options.limit,
      offset: options.offset,
    });
  }

  /**
   * Verify an incoming webhook payload using HMAC-SHA256.
   *
   * Uses `timingSafeEqual` to prevent timing attacks. The `rawBody` must be
   * the raw request body bytes before any JSON parsing.
   */
  verify(rawBody: Buffer | string, signature: string, secret: string): boolean {
    const body = typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : rawBody;
    const sig = signature.startsWith("sha256=") ? signature.slice(7) : signature;
    const expected = createHmac("sha256", secret).update(body).digest("hex");
    try {
      return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(sig, "hex"));
    } catch {
      return false;
    }
  }
}
