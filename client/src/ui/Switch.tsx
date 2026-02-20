import React from "react";

export default function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={[
        "relative inline-flex h-8 w-14 items-center rounded-full border transition",
        "focus:outline-none focus:ring-2 focus:ring-smx-red/30",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        checked
          ? "bg-smx-red/25 border-smx-red/50"
          : "bg-smx-panel2 border-smx-line",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition",
          checked ? "translate-x-7" : "translate-x-1",
        ].join(" ")}
      />
    </button>
  );
}