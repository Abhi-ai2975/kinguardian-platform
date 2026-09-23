/**
 * files/stores/folder.store — Zustand store for folder modal state.
 *
 * Access in React components:  const { onOpen } = useFolderStore();
 * Access in non-React contexts: folderStore.getState().onOpen(...)
 *
 * @module
 */
import { create } from "zustand";
import type { TFolder } from "@/modules/entities/schemas/folder";

export type FolderModalType = "createFolder" | "deleteFolder";

interface FolderStoreState {
  modalType: FolderModalType | null;
  /** For deleteFolder: the folder being deleted. For createFolder: the parent folder (null = root). */
  folderData: TFolder | null;
  isOpen: boolean;
  /** Incremented after a successful mutation — page watches this to revalidate. */
  trigger: number;
  onOpen: (type: FolderModalType, data?: TFolder | null) => void;
  onClose: () => void;
  incrementTrigger: () => void;
}

export const useFolderStore = create<FolderStoreState>((set) => ({
  modalType: null,
  folderData: null,
  isOpen: false,
  trigger: 0,
  onOpen: (type, data) =>
    set({ modalType: type, isOpen: true, folderData: data ?? null }),
  onClose: () => set({ modalType: null, isOpen: false, folderData: null }),
  incrementTrigger: () => set((s) => ({ trigger: s.trigger + 1 })),
}));

export const folderStore = useFolderStore;
