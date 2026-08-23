import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import TwoFactorChallengePage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn<(href: string) => void>() }),
}));

describe("two-factor challenge", () => {
  it("prevents native submission of a code before hydration", () => {
    const queryClient = new QueryClient();
    const html = renderToString(
      <QueryClientProvider client={queryClient}>
        <TwoFactorChallengePage />
      </QueryClientProvider>,
    );
    const document = new DOMParser().parseFromString(html, "text/html");

    expect(document.querySelector('button[type="submit"]')?.hasAttribute("disabled")).toBe(true);
  });
});
