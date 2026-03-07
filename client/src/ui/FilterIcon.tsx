import React from "react";

type FilterType =
  | "hpf"
  | "lpf"
  | "parametric"
  | "low_shelf"
  | "high_shelf"
  | "tilt_shelf"
  | "all_pass"
  | "band_pass"
  | "notch";

export default function FilterIcon({
  type,
  className = "w-4 h-4",
}: {
  type: FilterType | string;
  className?: string;
}) {
  const common = {
    stroke: "currentColor",
    strokeWidth: 1.8,
    fill: "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (type) {
    case "parametric":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...common} d="M3 12c2.2 0 3.6-1.5 4.8-3 1.4-1.8 2.7-3.5 4.2-3.5s2.8 1.7 4.2 3.5c1.2 1.5 2.6 3 4.8 3" />
          <path {...common} d="M3 12c2.2 0 3.6 1.5 4.8 3 1.4 1.8 2.7 3.5 4.2 3.5s2.8-1.7 4.2-3.5c1.2-1.5 2.6-3 4.8-3" />
        </svg>
      );

    case "tilt_shelf":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...common} d="M3 16.5L21 7.5" />
        </svg>
      );

    case "low_shelf":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...common} d="M3 7.5c4 0 6.5 0 8.5 1.8C13.2 10.8 14 12 15.2 12H21" />
        </svg>
      );

    case "high_shelf":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...common} d="M3 12h5.8c1.2 0 2-1.2 3.7-2.7 2-1.8 4.5-1.8 8.5-1.8" />
        </svg>
      );

    case "hpf":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...common} d="M3 17.5c4.5 0 7.2-1 9.4-3.7C14.6 11.2 16.6 8 21 6.5" />
        </svg>
      );

    case "lpf":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...common} d="M3 6.5c4.5 0 6.4 1.5 8.6 4.1C13.8 13.2 16.5 14.5 21 14.5" />
        </svg>
      );

    case "all_pass":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...common} d="M3 12h7" />
          <path {...common} d="M14 12h7" />
        </svg>
      );

    case "band_pass":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...common} d="M3 16.5c2.2 0 3.3-1.6 4.4-3.3C8.8 10.8 10.1 8 12 8s3.2 2.8 4.6 5.2c1.1 1.7 2.2 3.3 4.4 3.3" />
        </svg>
      );

    case "notch":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...common} d="M3 9.5c3.2 0 4.8.7 6.3 2.3" />
          <path {...common} d="M14.7 11.8c1.5-1.6 3.1-2.3 6.3-2.3" />
          <path {...common} d="M9.3 11.8L12 16.5l2.7-4.7" />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...common} d="M4 12h16" />
        </svg>
      );
  }
}