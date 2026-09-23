/**
 * projects/stores/project.store — Zustand store for project modal state.
 *
 * Follows the IAM admin.store pattern: a single store per feature domain that
 * owns which modal is open, the row data it operates on, and a trigger counter
 * that RSC pages can watch to know when to refetch.
 *
 * Access in React components:
 *   const { onOpen } = useProjectStore();
 *
 * Access in column definitions (not React):
 *   const { onOpen } = projectStore.getState();
 *
 * @module
 */
import { create } from "zustand";
import type { TProject } from "@/modules/entities/schemas/project";

export type ProjectModalType = "createProject" | "deleteProject";

interface ProjectStoreState {
  modalType: ProjectModalType | null;
  projectData: TProject | null;
  isOpen: boolean;
  /** Incremented after a successful mutation — tables watch this to refetch. */
  trigger: number;
  onOpen: (type: ProjectModalType, data?: TProject) => void;
  onClose: () => void;
  incrementTrigger: () => void;
}

export const useProjectStore = create<ProjectStoreState>((set) => ({
  modalType: null,
  projectData: null,
  isOpen: false,
  trigger: 0,
  onOpen: (type, data) =>
    set({ modalType: type, isOpen: true, projectData: data ?? null }),
  onClose: () =>
    set({ modalType: null, isOpen: false, projectData: null }),
  incrementTrigger: () =>
    set((s) => ({ trigger: s.trigger + 1 })),
}));

/** Non-hook store access — use in column definitions and other non-React contexts. */
export const projectStore = useProjectStore;
