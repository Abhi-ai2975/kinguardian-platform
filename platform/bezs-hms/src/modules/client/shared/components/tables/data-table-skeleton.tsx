/**
 * @file data-table-skeleton.tsx
 * @description Loading skeleton components for the data table and grid view.
 * Used while data is being fetched to prevent layout shifts and provide
 * visual feedback to the user.
 * @layer shared/tables
 */

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Table skeleton
// ---------------------------------------------------------------------------

interface DataTableSkeletonProps {
  /**
   * Number of visible columns to render shimmer cells for.
   * @default 5
   */
  columnCount?: number;
  /**
   * Number of placeholder rows to render.
   * @default 8
   */
  rowCount?: number;
  /** Additional Tailwind classes for the wrapper div */
  className?: string;
}

/**
 * Full-table skeleton including a toolbar row (search + filter shimmers),
 * a header row, and N data rows. Use while the data is loading.
 *
 * @param columnCount - How many column cells to render per row.
 * @param rowCount - How many placeholder rows to render.
 * @param className - Extra classes on the outer wrapper.
 */
export function DataTableSkeleton({
  columnCount = 5,
  rowCount = 8,
  className,
}: DataTableSkeletonProps) {
  return (
    <div className={cn("flex w-full flex-col gap-2.5", className)}>
      {/* Toolbar skeleton: search bar + filter buttons + view button */}
      <div className="flex items-center justify-between gap-2 p-1">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-8 w-16" />
      </div>

      {/* Table skeleton */}
      <div className="overflow-hidden rounded-md border">
        <div className="overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            {/* Header */}
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50">
                {Array.from({ length: columnCount }).map((_, i) => (
                  <th key={i} className="h-10 px-2 align-middle font-medium">
                    <Skeleton className="h-4 w-20" />
                  </th>
                ))}
              </tr>
            </thead>
            {/* Rows */}
            <tbody className="[&_tr:last-child]:border-0">
              {Array.from({ length: rowCount }).map((_, rowIdx) => (
                <tr key={rowIdx} className="border-b transition-colors">
                  {Array.from({ length: columnCount }).map((_, colIdx) => (
                    <td key={colIdx} className="p-2 align-middle">
                      <Skeleton
                        className={cn(
                          "h-4",
                          // Vary widths for a more natural shimmer look
                          colIdx === 0 ? "w-32" : colIdx % 3 === 0 ? "w-16" : "w-24",
                        )}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between p-1">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-20" />
          <div className="flex gap-1">
            <Skeleton className="size-8" />
            <Skeleton className="size-8" />
            <Skeleton className="size-8" />
            <Skeleton className="size-8" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grid skeleton
// ---------------------------------------------------------------------------

interface DataTableGridSkeletonProps {
  /**
   * Number of placeholder cards to render.
   * @default 6
   */
  cardCount?: number;
  /**
   * Tailwind column classes for the grid layout.
   * @default "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
   */
  gridClassName?: string;
  /** Additional Tailwind classes for the wrapper div */
  className?: string;
}

/**
 * Grid skeleton that renders placeholder cards while data is loading.
 *
 * @param cardCount - Number of shimmer cards to show.
 * @param gridClassName - Tailwind grid column classes.
 * @param className - Extra classes on the outer wrapper.
 */
export function DataTableGridSkeleton({
  cardCount = 6,
  gridClassName = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  className,
}: DataTableGridSkeletonProps) {
  return (
    <div className={cn("flex w-full flex-col gap-2.5", className)}>
      {/* Toolbar shimmer (same as table skeleton) */}
      <div className="flex items-center justify-between gap-2 p-1">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      {/* Card grid */}
      <div className={cn("grid gap-4", gridClassName)}>
        {Array.from({ length: cardCount }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="size-8 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
