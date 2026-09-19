import type { QueryClient } from "@tanstack/react-query";

import { disconnectEcho } from "./echo";

export async function clearSession(queryClient: QueryClient): Promise<void> {
  disconnectEcho();
  await queryClient.cancelQueries();
  queryClient.clear();
}
