import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function MetricCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-7 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-48 sm:h-64 w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-4 w-40" />
        <div className="space-y-2">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function HeatmapSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="w-full rounded-lg" style={{ aspectRatio: "20/30" }} />
      </CardContent>
    </Card>
  );
}

export function PageSelectorSkeleton() {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-32 rounded-lg flex-shrink-0" />
      ))}
    </div>
  );
}

export function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <MetricCardsSkeleton />
      <ChartSkeleton />
    </div>
  );
}
