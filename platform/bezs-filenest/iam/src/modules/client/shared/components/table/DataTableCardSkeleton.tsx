import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export function DataTableCardSkeleton({
  cols = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
}: {
  cols?: string;
}) {
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

      <div className={`grid gap-4 ${cols}`}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardHeader className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
