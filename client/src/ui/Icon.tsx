import React from "react";

export default function Icon({
  name,
  className,
  filled = false
}: {
  name: string;
  className?: string;
  filled?: boolean;
}) {
  const isInput = name === "input";

  return (
    <span
      className={`material-symbols-outlined leading-none ${className ?? ""}`}
      style={{
        fontSize: 22,
        transform: isInput ? "scale(1.12)" : undefined,
        display: "inline-block",
        fontVariationSettings: `"FILL" ${filled ? 1 : 0}, "wght" 400, "GRAD" 0, "opsz" 24`
      }}
    >
      {name}
    </span>
  );
}