export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
}

function clampHex(hex: string): string {
  let value = hex.replace("#", "");
  if (value.length === 3) value = value.split("").map((c) => c + c).join("");
  return value;
}

export function withAlpha(hex: string | undefined, alpha: number): string {
  if (!hex) return `rgba(26,26,26,${alpha})`;
  const value = clampHex(hex);
  if (value.length !== 6) return `rgba(26,26,26,${alpha})`;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function luminance(hex: string): number {
  const value = clampHex(hex);
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Pick a readable text color for a background. */
export function pickTextColor(background: string | undefined): string {
  if (!background) return "#1A1A1A";
  return luminance(background) > 0.55 ? "#1A1A1A" : "#FFFFFF";
}

/** Pick a readable color for the OK button. */
export function pickButtonText(background: string | undefined): string {
  if (!background) return "#FFFFFF";
  return luminance(background) > 0.55 ? "#FFFFFF" : "#1A1A1A";
}

export const LETTER_KEYS = "abcdefghijklmnopqrstuvwxyz".split("");

export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function truncate(value: string, length: number): string {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}
