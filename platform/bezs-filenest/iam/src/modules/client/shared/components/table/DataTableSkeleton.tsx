import { Skeleton } from "@/components/ui/skeleton";

export function DataTableSkeleton() {
  return (
    <div className="space-y-4 w-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-5 w-10 rounded-full" />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Skeleton className="h-8 w-40" /> {/* search */}
          <Skeleton className="h-8 w-24" /> {/* filter */}
          <Skeleton className="h-8 w-32" /> {/* add */}
          <Skeleton className="h-8 w-20" /> {/* view tabs */}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <div className="divide-y">
          {/* Header */}
          <div className="grid grid-cols-4 gap-4 p-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-4 w-24" />
            ))}
          </div>

          {/* Rows */}
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="grid grid-cols-4 gap-4 p-3 items-center">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-8 rounded-md ml-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex justify-end items-center gap-4">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  );
}
