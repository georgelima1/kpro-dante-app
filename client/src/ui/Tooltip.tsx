import type { PropsWithChildren } from "react";
import React from "react";

export default function Tooltip({
  label,
  children
}: PropsWithChildren<{ label: string }>) {
  return (
    <div className="relative group">
      {children}
      <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 opacity-0 group-hover:opacity-100 transition">
        <div className="rounded-lg border border-smx-line bg-smx-panel px-3 py-2 text-xs text-smx-text shadow-xl whitespace-nowrap">
          {label}
        </div>
      </div>
    </div>
  );
}
