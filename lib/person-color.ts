// Assigns each household member a stable tagging color (--person-1..5 in
// globals.css), keyed by their position in the real members list — the
// caller already has that index (from Supabase, in list order).
export function personColorVarByIndex(index: number): string {
  return `var(--person-${(index % 5) + 1})`;
}
