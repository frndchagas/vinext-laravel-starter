import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Greeting, salutationFor } from "./greeting";

afterEach(cleanup);

describe("Greeting", () => {
  it("picks the salutation from the hour", () => {
    expect(salutationFor(5)).toBe("Good morning");
    expect(salutationFor(11)).toBe("Good morning");
    expect(salutationFor(12)).toBe("Good afternoon");
    expect(salutationFor(18)).toBe("Good evening");
    expect(salutationFor(2)).toBe("Good evening");
  });

  it("renders the pinned hour as the heading with the summary below", () => {
    render(<Greeting hour={9} name="Ada" summary="3 sessions active" />);

    expect(screen.getByRole("heading", { level: 2, name: "Good morning, Ada!" })).toHaveClass(
      "text-display",
    );
    expect(screen.getByText("3 sessions active")).toBeInTheDocument();
  });
});
