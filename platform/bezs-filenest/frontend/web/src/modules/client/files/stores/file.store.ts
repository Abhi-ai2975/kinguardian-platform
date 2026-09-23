/**
 * files/stores/file.store — Zustand store for file modal state.
 *
 * Access in React components:  const { onOpen } = useFileStore();
 * Access in column definitions: fileStore.getState().onOpen(...)
 *
 * @module
 */
import { create } from "zustand";
import type { TFile } from "@/modules/entities/schemas/file";

export type FileModalType = "deleteFile" | "fileDetails" | "uploadFile" | "renameFile" | "moveFile";

interface FileStoreState {
  modalType: FileModalType | null;
  fileData: TFile | null;
  isOpen: boolean;
  /** Incremented after a successful mutation — tables watch this to refetch. */
  trigger: number;
  onOpen: (type: FileModalType, data?: TFile) => void;
  onClose: () => void;
  incrementTrigger: () => void;
}

export const useFileStore = create<FileStoreState>((set) => ({
  modalType: null,
  fileData: null,
  isOpen: false,
  trigger: 0,
  onOpen: (type, data) =>
    set({ modalType: type, isOpen: true, fileData: data ?? null }),
  onClose: () => set({ modalType: null, isOpen: false, fileData: null }),
  incrementTrigger: () => set((s) => ({ trigger: s.trigger + 1 })),
}));

/** Non-hook store access — use in column definitions and other non-React contexts. */
export const fileStore = useFileStore;
