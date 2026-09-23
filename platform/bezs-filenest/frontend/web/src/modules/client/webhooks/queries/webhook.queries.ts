/**
 * webhook.queries — TanStack Query key factory for the webhooks list.
 *
 * Centralises cache keys so mutations (create, delete) can invalidate
 * the right entries via webhookKeys.lists(projectId).
 *
 * @module
 */

export const webhookKeys = {
  all: (projectId: string) => ["webhooks", projectId] as const,
  lists: (projectId: string) => [...webhookKeys.all(projectId), "list"] as const,
  list: (projectId: string) => [...webhookKeys.lists(projectId)] as const,
};
