"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { type SegmentOption, SegmentedControl } from "@/components/ds/segmented-control";
import { type Appearance, useAppearance } from "@/lib/appearance";

const options: ReadonlyArray<SegmentOption<Appearance>> = [
  { icon: <Monitor aria-hidden="true" className="size-3.5" />, label: "System", value: "system" },
  { icon: <Sun aria-hidden="true" className="size-3.5" />, label: "Light", value: "light" },
  { icon: <Moon aria-hidden="true" className="size-3.5" />, label: "Dark", value: "dark" },
];

/**
 * This browser's theme as a single choice (`SegmentedControl`, as in the showcase): the selected
 * option sits white on the grey track, with no black button competing with the "Save" of the other
 * cards.
 */
export function AppearanceSelector() {
  const { appearance, updateAppearance } = useAppearance();

  return (
    <SegmentedControl
      ariaLabel="Appearance"
      onValueChange={updateAppearance}
      options={options}
      value={appearance}
    />
  );
}
