/**
 * server-action-hooks — ZSA + TanStack Query hook setup.
 *
 * Call setupServerActionHooks once and re-export the typed hooks so every
 * feature imports from this single file rather than calling setupServerActionHooks
 * repeatedly across the codebase.
 *
 * Usage:
 *   import { useServerActionQuery, useServerActionMutation } from "@/lib/hooks/server-action-hooks";
 *
 * @module
 */
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { setupServerActionHooks } from "zsa-react-query";

const {
  useServerActionQuery,
  useServerActionMutation,
  useServerActionInfiniteQuery,
} = setupServerActionHooks({
  hooks: {
    useQuery,
    useMutation,
    useInfiniteQuery,
  },
});

export { useServerActionQuery, useServerActionMutation, useServerActionInfiniteQuery };
