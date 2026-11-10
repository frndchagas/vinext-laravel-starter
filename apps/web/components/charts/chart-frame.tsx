"use client";

import { ChartColumn, Table2 } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Legend item: the mark in the series color and the label. */
export type LegendItem = {
  color: string;
  label: string;
  shape?: "line" | "dashed" | "square";
};

const NO_LEGEND: LegendItem[] = [];

/**
 * Chart frame: legend (with two or more items) and the toggle to the equivalent table, which is
 * the accessible way to read every value.
 */
export function ChartFrame({
  children,
  className,
  label,
  legend = NO_LEGEND,
  table,
}: {
  children: ReactNode;
  className?: string;
  label: string;
  legend?: LegendItem[];
  table: ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  const regionId = useId();

  return (
    <figure className={cn("flex min-w-0 flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {legend.length > 1 ? (
          <ul
            aria-label="Legend"
            className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"
          >
            {legend.map((item) => (
              <li className="flex items-center gap-1.5" key={item.label}>
                {item.shape === "dashed" ? (
                  <span
                    aria-hidden="true"
                    className="w-3.5 border-t-2 border-dashed"
                    style={{ borderColor: item.color }}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className={
                      item.shape === "line" ? "h-0.5 w-3 rounded-full" : "size-2.5 rounded-[3px]"
                    }
                    style={{ background: item.color }}
                  />
                )}
                {item.label}
              </li>
            ))}
          </ul>
        ) : (
          <span />
        )}
        <button
          aria-controls={regionId}
          aria-pressed={showTable}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:min-h-0"
          onClick={() => setShowTable((current) => !current)}
          type="button"
        >
          {showTable ? (
            <ChartColumn aria-hidden="true" className="size-3.5" />
          ) : (
            <Table2 aria-hidden="true" className="size-3.5" />
          )}
          {showTable ? "Show chart" : "Show table"}
          <span className="sr-only">: {label}</span>
        </button>
      </div>
      <div id={regionId}>{showTable ? table : children}</div>
    </figure>
  );
}
