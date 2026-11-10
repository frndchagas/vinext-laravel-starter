import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Label } from "@/components/ui/label";

import { addMonths, DateField, isoToTyped, maskTypedDate, typedToIso } from "./date-field";

afterEach(cleanup);

function mount(props: Partial<React.ComponentProps<typeof DateField>> = {}) {
  const onValueChange = vi.fn<(iso: string) => void>();
  render(
    <form data-testid="form">
      <Label htmlFor="date">Date</Label>
      <DateField id="date" name="occurred_on" onValueChange={onValueChange} {...props} />
    </form>,
  );
  const form = screen.getByTestId("form");
  if (!(form instanceof HTMLFormElement)) throw new Error("form expected");

  return {
    field: screen.getByLabelText("Date"),
    form,
    onValueChange,
    submitted: () => new FormData(form).get("occurred_on"),
  };
}

async function openCalendar() {
  fireEvent.click(screen.getByRole("button", { name: "Pick from the calendar" }));
  await screen.findByRole("grid");
}

function press(key: string, init: { shiftKey?: boolean } = {}) {
  const active = document.activeElement;
  if (active === null) throw new Error("nothing focused");
  fireEvent.keyDown(active, { key, ...init });
}

async function expectFocusedDay(name: string) {
  await waitFor(() => expect(document.activeElement).toHaveAccessibleName(name));
}

function Controlled({ value }: { value: string }) {
  return (
    <>
      <Label htmlFor="start">Start</Label>
      <DateField
        aria-describedby="start-error"
        aria-invalid
        id="start"
        onValueChange={() => undefined}
        value={value}
      />
      <p id="start-error">Enter the start date.</p>
    </>
  );
}

describe("DateField helpers", () => {
  it("adds the slashes while typing and reads only dates that exist", () => {
    expect(maskTypedDate("10")).toBe("10");
    expect(maskTypedDate("101")).toBe("10/1");
    expect(maskTypedDate("10152026")).toBe("10/15/2026");
    expect(maskTypedDate("10/15/20269")).toBe("10/15/2026");
    expect(maskTypedDate("ab10-15")).toBe("10/15");

    expect(typedToIso("10/15/2026")).toBe("2026-10-15");
    expect(typedToIso("02/29/2028")).toBe("2028-02-29");
    expect(typedToIso("02/31/2026")).toBeNull();
    expect(typedToIso("10/15/26")).toBeNull();
    expect(isoToTyped("2026-10-15")).toBe("10/15/2026");
    expect(isoToTyped("")).toBe("");
  });

  it("walks months without passing the last day of a shorter month", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-03-15", -12)).toBe("2025-03-15");
  });
});

describe("DateField", () => {
  it("shows mm/dd/yyyy, accepts the typed date and submits YYYY-MM-DD in the form", () => {
    const { field, onValueChange, submitted } = mount({ defaultValue: "2026-10-15" });

    expect(field).toHaveValue("10/15/2026");
    expect(field).toHaveAttribute("placeholder", "mm/dd/yyyy");
    expect(submitted()).toBe("2026-10-15");

    fireEvent.change(field, { target: { value: "1103202" } });
    expect(field).toHaveValue("11/03/202");
    expect(onValueChange).not.toHaveBeenCalled();

    fireEvent.change(field, { target: { value: "11032025" } });
    expect(field).toHaveValue("11/03/2025");
    expect(onValueChange).toHaveBeenCalledWith("2025-11-03");
    expect(submitted()).toBe("2025-11-03");

    fireEvent.change(field, { target: { value: "" } });
    expect(onValueChange).toHaveBeenLastCalledWith("");
    expect(submitted()).toBe("");
    // The calendar icon does not submit the form.
    expect(screen.getByRole("button", { name: "Pick from the calendar" })).toHaveAttribute(
      "type",
      "button",
    );
  });

  it("flags a date that does not exist on blur and submits it as typed", () => {
    const { field, onValueChange, submitted } = mount();

    fireEvent.change(field, { target: { value: "02312026" } });
    expect(field).not.toHaveAttribute("aria-invalid");
    fireEvent.blur(field);

    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(onValueChange).not.toHaveBeenCalled();
    expect(submitted()).toBe("02/31/2026");
  });

  it("restores the initial value on form reset", () => {
    const { field, form, submitted } = mount({ defaultValue: "2026-10-15" });

    fireEvent.change(field, { target: { value: "01012020" } });
    fireEvent.reset(form);

    expect(field).toHaveValue("10/15/2026");
    expect(submitted()).toBe("2026-10-15");
  });

  it("walks the calendar with arrows, Home, End and PageUp/PageDown and picks with Enter", async () => {
    const { field, onValueChange, submitted } = mount({ defaultValue: "2026-10-15" });

    await openCalendar();
    expect(screen.getByRole("grid", { name: "October 2026" })).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "S",
      "M",
      "T",
      "W",
      "T",
      "F",
      "S",
    ]);
    await expectFocusedDay("Thursday, October 15, 2026");
    expect(document.activeElement?.closest("td")).toHaveAttribute("aria-selected", "true");

    press("ArrowRight");
    await expectFocusedDay("Friday, October 16, 2026");
    press("ArrowDown");
    await expectFocusedDay("Friday, October 23, 2026");
    press("ArrowLeft");
    await expectFocusedDay("Thursday, October 22, 2026");
    press("ArrowUp");
    await expectFocusedDay("Thursday, October 15, 2026");
    press("Home");
    await expectFocusedDay("Sunday, October 11, 2026");
    press("End");
    await expectFocusedDay("Saturday, October 17, 2026");

    press("PageDown");
    await expectFocusedDay("Tuesday, November 17, 2026");
    expect(screen.getByRole("grid", { name: "November 2026" })).toBeInTheDocument();
    press("PageUp", { shiftKey: true });
    await expectFocusedDay("Monday, November 17, 2025");
    press("PageUp");
    await expectFocusedDay("Friday, October 17, 2025");

    press("Enter");

    await waitFor(() => expect(screen.queryByRole("grid")).not.toBeInTheDocument());
    expect(field).toHaveValue("10/17/2025");
    expect(onValueChange).toHaveBeenCalledWith("2025-10-17");
    expect(submitted()).toBe("2025-10-17");
  });

  it("closes with Esc without changing the date and switches months with the buttons", async () => {
    const { field, onValueChange } = mount({ defaultValue: "2026-10-15" });

    await openCalendar();
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("grid", { name: "November 2026" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByRole("grid", { name: "September 2026" })).toBeInTheDocument();

    screen.getByRole("button", { name: "Previous month" }).focus();
    press("Escape");

    await waitFor(() => expect(screen.queryByRole("grid")).not.toBeInTheDocument());
    expect(field).toHaveValue("10/15/2026");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("picks the day by click and respects min and max", async () => {
    const { field, onValueChange } = mount({
      defaultValue: "2026-10-15",
      max: "2026-10-20",
      min: "2026-10-10",
    });

    await openCalendar();
    expect(screen.getByRole("button", { name: "Friday, October 9, 2026" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous month" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();

    await expectFocusedDay("Thursday, October 15, 2026");
    press("ArrowDown");
    await expectFocusedDay("Tuesday, October 20, 2026");

    fireEvent.click(screen.getByRole("button", { name: "Monday, October 12, 2026" }));
    await waitFor(() => expect(screen.queryByRole("grid")).not.toBeInTheDocument());
    expect(field).toHaveValue("10/12/2026");
    expect(onValueChange).toHaveBeenCalledWith("2026-10-12");

    fireEvent.change(field, { target: { value: "11012026" } });
    fireEvent.blur(field);
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it("follows the controlled value and links description and error to the field", () => {
    const { rerender } = render(<Controlled value="2026-11-01" />);
    const field = screen.getByLabelText("Start");

    expect(field).toHaveValue("11/01/2026");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription("Enter the start date.");

    rerender(<Controlled value="2026-12-24" />);
    expect(field).toHaveValue("12/24/2026");
  });
});
