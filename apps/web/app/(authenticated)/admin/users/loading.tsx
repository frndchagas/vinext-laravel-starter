import { UserCog } from "lucide-react";

import { RouteSkeleton, SkeletonRows } from "@/components/ds/route-skeleton";

/** Users at the instant of the click: the list of accounts and their roles. */
export default function Loading() {
  return (
    <RouteSkeleton icon={UserCog} label="users" title="Users">
      <SkeletonRows rows={5} />
    </RouteSkeleton>
  );
}
