// Offered when adding a new member — matches the app's accent palette
// (see app/globals.css's --chart-* tokens plus --primary).
export const MEMBER_COLOR_PALETTE = [
  "#7766E8",
  "#8BC9A5",
  "#F5CA67",
  "#EEA5B5",
  "#84B8DF",
  "#EFA66E",
];

// Alpha-blends a member's stored hex color for soft backgrounds/borders
// (avatar fill, active-pill ring) — members pick an arbitrary hex, so this
// can't be a Tailwind utility class.
export function tint(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
