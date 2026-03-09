const ORIGIN = window.location.origin;

export const API_BASE =
  (import.meta as any)?.env?.VITE_API_URL ??
  `${ORIGIN}`;

export const WS_BASE =
  (import.meta as any)?.env?.VITE_WS_URL ??
  `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`;