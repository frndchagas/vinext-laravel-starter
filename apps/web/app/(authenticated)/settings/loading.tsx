import { Settings } from "lucide-react";

import { RouteSkeleton, SkeletonCard } from "@/components/ds/route-skeleton";

/** Settings at the click: the profile, password and two-factor cards. */
export default function Loading() {
  return (
    <RouteSkeleton icon={Settings} label="settings" title="Settings">
      <SkeletonCard height="h-40" />
      <SkeletonCard height="h-32" />
      <SkeletonCard height="h-24" />
    </RouteSkeleton>
  );
}
