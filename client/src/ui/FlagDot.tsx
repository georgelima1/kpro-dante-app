import React from "react";

export default function FlagDot({
  on,
  color,
  title,
  className
}: {
  on: boolean;
  color: "red" | "white";
  title?: string;
  className?: string;
}) {
  const cls =
    color === "red"
      ? on
        ? "bg-smx-red"
        : "bg-smx-line"
      : on
      ? "bg-white"
      : "bg-smx-line";

  return (
    <span
      title={title}
      className={`inline-block w-2.5 h-2.5 rounded-full ${cls} ${className ?? ""}`}
    />
  );
}