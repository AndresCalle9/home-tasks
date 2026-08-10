// 0 = Monday ... 6 = Sunday, matching assignments.day_of_week.
export const DAY_NAMES = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

export const DAY_ABBR = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

// Monday-first, 0-indexed — the server has no notion of the visitor's
// timezone, so this is only ever computed client-side.
export function getTodayIndex(): number {
  return (new Date().getDay() + 6) % 7;
}
