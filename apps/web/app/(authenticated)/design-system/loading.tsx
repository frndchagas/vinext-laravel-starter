import { Palette } from "lucide-react";

import { RouteSkeleton, SkeletonCard, SkeletonKpis } from "@/components/ds/route-skeleton";

/** Route skeleton shown from the click until the showcase renders. */
export default function DesignSystemLoading() {
  return (
    <RouteSkeleton icon={Palette} label="Loading the design system" title="Design system">
      <SkeletonCard height="h-24" />
      <SkeletonKpis count={4} />
      <SkeletonCard />
    </RouteSkeleton>
  );
}
