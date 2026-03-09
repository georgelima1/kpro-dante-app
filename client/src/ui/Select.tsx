import React from "react";
import { useEffect, useRef, useState } from "react";

export type SelectOption<T = string> = {
  value: T;
  label: string;
  icon?: React.ReactNode;
};

type Props<T = string> = {
  label?: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
};

export default function Select<T extends string | number>({
  label,
  value,
  options,
  onChange
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="min-w-fit" ref={rootRef}>
      {label && (
        <div className="text-sm md:text-xs text-smx-muted mb-1">{label}</div>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full rounded-xl border border-smx-line bg-smx-panel2 px-3 py-2 text-sm text-smx-text
                     flex items-center justify-between gap-3 hover:border-smx-red/30 transition"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className="flex items-center gap-2 min-w-0">
            {selected.icon}
            <span className="truncate">{selected.label}</span>
          </span>

          <svg
            viewBox="0 0 24 24"
            className={`w-4 h-4 text-smx-muted shrink-0 transition-transform ${
              open ? "rotate-180" : ""
            }`}
            fill="none"
          >
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {open && (
          <div
            className="absolute z-50 mt-2 w-full rounded-xl border border-smx-line bg-smx-panel shadow-2xl overflow-hidden"
            role="listbox"
          >
            <div className="max-h-80 overflow-y-auto py-1">
              {options.map((opt) => {
                const active = opt.value === value;

                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center gap-2 transition
                      ${
                        active
                          ? "bg-smx-red/15 text-smx-text"
                          : "text-smx-text hover:bg-smx-panel2"
                      }`}
                    role="option"
                    aria-selected={active}
                  >
                    {opt.icon}
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}