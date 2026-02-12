import React from "react";

export default function SpeakerIcon({ inverted }: { inverted: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* Corpo do falante (pode inverter) */}
      <g transform={inverted ? "translate(24 0) scale(-1 1)" : undefined}>
        <path
          d="M4 10v4h3l4 4V6L7 10H4Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </g>

      {/* Ondas sonoras (sempre iguais) */}
      <path
        d="M16 9c1 .9 1.5 1.9 1.5 3S17 14.1 16 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M18.5 6.5c2 1.7 3 3.7 3 5.5s-1 3.8-3 5.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
