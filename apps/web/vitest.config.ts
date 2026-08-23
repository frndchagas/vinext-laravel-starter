import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      "next/link": fileURLToPath(new URL("./test/next-link.tsx", import.meta.url)),
      "next/navigation": fileURLToPath(new URL("./test/next-navigation.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    include: ["**/*.test.{ts,tsx}"],
    restoreMocks: true,
    setupFiles: ["./test/setup.ts"],
  },
});
