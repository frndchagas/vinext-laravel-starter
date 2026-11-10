import { LayoutDashboard } from "lucide-react";

import { RouteSkeleton, SkeletonCard, SkeletonKpis } from "@/components/ds/route-skeleton";

/** Dashboard at the instant of the click: greeting, the account strip and the two cards. */
export default function Loading() {
  return (
    <RouteSkeleton icon={LayoutDashboard} label="the dashboard" title="Dashboard">
      <SkeletonKpis count={3} />
      <div className="grid gap-stack lg:grid-cols-2 lg:items-start">
        <SkeletonCard height="h-28" />
        <SkeletonCard height="h-28" />
      </div>
    </RouteSkeleton>
  );
}
