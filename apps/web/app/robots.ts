import type { MetadataRoute } from "next";

import { createRobots } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return createRobots();
}
