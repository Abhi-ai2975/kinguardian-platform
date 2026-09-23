/**
 * ZSA + TanStack Query hooks setup.
 *
 * Layer: lib (shared utilities)
 *
 * Wires ZSA server actions into TanStack Query so server actions can be
 * used with useServerActionQuery (read) and useServerActionMutation (write).
 * Import the exported hooks anywhere in client components instead of calling
 * server actions directly inside useEffect.
 */

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { setupServerActionHooks } from "zsa-react-query";

export const {
  useServerActionQuery,
  useServerActionMutation,
  useServerActionInfiniteQuery,
} = setupServerActionHooks({
  hooks: { useQuery, useMutation, useInfiniteQuery },
});
