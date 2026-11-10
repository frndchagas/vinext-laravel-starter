import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Feed, FeedChip, FeedItem, FeedTask } from "./feed";

afterEach(cleanup);

describe("Feed", () => {
  it("lists events in order with their time and nested content", () => {
    render(
      <Feed ariaLabel="Today's to-do">
        <FeedItem
          actor="AI"
          object={<FeedChip>question</FeedChip>}
          time="2026-11-04T09:12:00-03:00"
          timeLabel="9:12"
          variant="ai"
          verb="opened a"
        >
          <p>Transfer of $3,000 to Waldo: fee or loan repayment?</p>
        </FeedItem>
        <FeedItem
          actor="Fernando"
          time="2026-11-04T08:40:00-03:00"
          timeLabel="8:40"
          variant="done"
          verb="completed"
        >
          <FeedTask done>Reconcile the October statement</FeedTask>
        </FeedItem>
      </Feed>,
    );

    const items = within(screen.getByRole("list", { name: "Today's to-do" })).getAllByRole(
      "listitem",
    );
    expect(items).toHaveLength(2);
    const [first] = items;
    if (first === undefined) throw new Error("The first event was not rendered.");
    expect(first).toHaveTextContent("AI opened a question");
    expect(within(first).getByText("9:12")).toHaveAttribute(
      "datetime",
      "2026-11-04T09:12:00-03:00",
    );
    expect(first).toHaveTextContent("Waldo");
  });

  it("limits only the content card with contentClassName, not the event line", () => {
    render(
      <Feed ariaLabel="Gaps">
        <FeedItem
          actor="Reconciliation"
          contentClassName="max-w-[calc(70ch+2rem+2px)]"
          time="2026-11-04T09:30:00Z"
          timeLabel="11/04"
          verb="asked"
        >
          <p>What is the current outstanding balance?</p>
        </FeedItem>
      </Feed>,
    );

    const card = screen.getByText("What is the current outstanding balance?").parentElement;
    expect(card).toHaveAttribute("data-feed-content");
    expect(card).toHaveClass("max-w-[calc(70ch+2rem+2px)]", "rounded-card", "border");
    expect(screen.getByRole("listitem")).not.toHaveClass("max-w-[calc(70ch+2rem+2px)]");
    expect(screen.getByText("Reconciliation").closest("p")).not.toHaveClass(
      "max-w-[calc(70ch+2rem+2px)]",
    );
  });

  it("ends the metadata line with the date, after the chip and a middle dot", () => {
    render(
      <Feed ariaLabel="Gaps">
        <FeedItem
          actor="Reconciliation"
          object={<FeedChip>gap</FeedChip>}
          time="2026-11-04T09:30:00Z"
          timeLabel="11/04"
          verb="asked about a"
        >
          <p>What is the current outstanding balance?</p>
        </FeedItem>
      </Feed>,
    );

    const time = screen.getByText("11/04");
    const line = time.closest("p");
    if (line === null) throw new Error("The metadata line was not rendered.");
    expect(line).toHaveTextContent("Reconciliation asked about a gap · 11/04");
    // The chip and "· 11/04" live in one unbreakable span, the last of the line: when wrapping,
    // they drop together and the date never sits alone on the line below.
    const tail = line.querySelector("[data-feed-tail]");
    expect(line.lastElementChild).toBe(tail);
    expect(tail).toHaveClass("whitespace-nowrap");
    expect(tail).toHaveTextContent("gap · 11/04");
    expect(tail).toContainElement(screen.getByText("gap"));
    expect(tail).toContainElement(time);
    expect(line).not.toHaveClass("flex");
    expect(time.parentElement).toHaveClass("whitespace-nowrap");
    expect(time).not.toHaveClass("ml-auto");
  });

  it("keeps the date glued to the verb with a non-breaking space when there is no chip", () => {
    render(
      <Feed ariaLabel="Notices">
        <FeedItem
          actor="Main account"
          time="2026-11-04T08:15:00-03:00"
          timeLabel="8:15"
          verb="sent the statement"
        />
      </Feed>,
    );

    const time = screen.getByText("8:15");
    const group = time.parentElement;
    const line = time.closest("p");
    expect(line?.lastElementChild).toBe(group);
    expect(group?.previousSibling?.textContent).toBe(" ");
    expect(group).toHaveClass("whitespace-nowrap");
    expect(line?.querySelector("[data-feed-tail]")).toBeNull();
  });

  it("marks AI events with the violet stroke on the content, not with AI labels", () => {
    const { container } = render(
      <Feed ariaLabel="To-do">
        <FeedItem
          actor="AI"
          time="2026-11-04T09:41:00-03:00"
          timeLabel="9:41"
          variant="ai"
          verb="opened a"
        >
          <p>Transfer of $3,000 to Waldo on 10/14: fee or loan repayment?</p>
        </FeedItem>
        <FeedItem
          actor="Main account"
          time="2026-11-04T08:15:00-03:00"
          timeLabel="8:15"
          verb="sent a"
        >
          <p>38 lines from October</p>
        </FeedItem>
      </Feed>,
    );

    expect(container.querySelectorAll("[data-origin-mark]")).toHaveLength(1);
    expect(screen.queryByText(/AI suggestion/i)).toBeNull();
  });

  it("states completion in text, not only with the strikethrough", () => {
    render(<FeedTask done>Reconcile the statement</FeedTask>);

    expect(screen.getByText("Reconcile the statement")).toHaveTextContent(
      "Reconcile the statement (done)",
    );
  });
});
