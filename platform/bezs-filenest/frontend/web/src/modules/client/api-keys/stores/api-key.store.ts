/**
 * api-keys/stores/api-key.store — Zustand store for API key modal state.
 *
 * Access in React components: const { onOpen } = useApiKeyStore();
 * Access in column definitions: apiKeyStore.getState().onOpen(...)
 *
 * @module
 */
import { create } from "zustand";
import type { TApiKey, TCreatedApiKey } from "@/modules/entities/schemas/api-key";

export type ApiKeyModalType = "createApiKey" | "revokeApiKey" | "showCreatedKey" | "viewApiKey";

interface ApiKeyStoreState {
  modalType: ApiKeyModalType | null;
  keyData: TApiKey | null;
  createdKey: TCreatedApiKey | null;
  isOpen: boolean;
  trigger: number;
  onOpen: (type: ApiKeyModalType, data?: TApiKey | TCreatedApiKey) => void;
  onClose: () => void;
  incrementTrigger: () => void;
  setCreatedKey: (key: TCreatedApiKey) => void;
}

export const useApiKeyStore = create<ApiKeyStoreState>((set) => ({
  modalType: null,
  keyData: null,
  createdKey: null,
  isOpen: false,
  trigger: 0,
  onOpen: (type, data) =>
    set({
      modalType: type,
      isOpen: true,
      keyData: data && "start" in data && !("key" in data) ? (data as TApiKey) : null,
      createdKey: data && "key" in data ? (data as TCreatedApiKey) : null,
    }),
  onClose: () => set({ modalType: null, isOpen: false, keyData: null }),
  incrementTrigger: () => set((s) => ({ trigger: s.trigger + 1 })),
  setCreatedKey: (key) => set({ createdKey: key }),
}));

export const apiKeyStore = useApiKeyStore;
