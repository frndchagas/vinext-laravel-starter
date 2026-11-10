import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Upload } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/button";

import { PageHeader } from "./page-header";

afterEach(cleanup);

describe("PageHeader", () => {
  it("gives the title the height of a control, with or without an action on the right", () => {
    render(
      <>
        <PageHeader icon={Upload} title="Export" />
        <PageHeader actions={<Button>New user</Button>} icon={Upload} title="Users" />
      </>,
    );

    for (const title of ["Export", "Users"]) {
      // The title line is never shorter than the button (32 px): the divider does not jump between pages.
      expect(screen.getByRole("heading", { name: title }).parentElement).toHaveClass(
        "min-h-control",
        "items-center",
      );
    }
  });

  it("opens the search with ⌘K and names the unread notifications", () => {
    const onSearch = vi.fn<() => void>();
    render(
      <PageHeader
        notifications={3}
        onNotifications={() => undefined}
        onSearch={onSearch}
        title="Users"
      />,
    );

    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Notifications: 3 unread" })).toBeInTheDocument();
  });
});
