/**
 * webhooks/stores/webhook.store — Zustand store for webhook modal state.
 *
 * Access in React components:  const { onOpen } = useWebhookStore();
 * Access in column definitions: webhookStore.getState().onOpen(...)
 *
 * @module
 */
import { create } from "zustand";
import type { TWebhook } from "@/modules/entities/schemas/webhook";

export type WebhookModalType = "createWebhook" | "deleteWebhook";

interface WebhookStoreState {
  modalType: WebhookModalType | null;
  webhookData: TWebhook | null;
  isOpen: boolean;
  /** Incremented after a successful mutation — tables watch this to invalidate. */
  trigger: number;
  onOpen: (type: WebhookModalType, data?: TWebhook) => void;
  onClose: () => void;
  incrementTrigger: () => void;
}

export const useWebhookStore = create<WebhookStoreState>((set) => ({
  modalType: null,
  webhookData: null,
  isOpen: false,
  trigger: 0,
  onOpen: (type, data) =>
    set({ modalType: type, isOpen: true, webhookData: data ?? null }),
  onClose: () => set({ modalType: null, isOpen: false, webhookData: null }),
  incrementTrigger: () => set((s) => ({ trigger: s.trigger + 1 })),
}));

/** Non-hook store access — use in column definitions and other non-React contexts. */
export const webhookStore = useWebhookStore;
