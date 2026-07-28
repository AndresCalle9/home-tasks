// Mock data shaped 1:1 with supabase/schema.sql (members, tasks, assignments)
// so a future change can swap these arrays for real Supabase reads without
// reshaping the UI. No algorithm here — assignments below are hand-picked.

export type Member = {
  id: string;
  name: string;
  age: number;
};

export type Task = {
  id: string;
  name: string;
  isDaily: boolean;
  defaultIsFixed: boolean;
  defaultFixedMemberId: string | null;
};

// 0 = Monday ... 6 = Sunday, matching supabase/schema.sql's day_of_week.
// null means "every day of the period" (daily tasks).
export type Assignment = {
  taskId: string;
  memberId: string;
  dayOfWeek: number | null;
  isFixed: boolean;
};

export const DAY_NAMES = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

export const members: Member[] = [
  { id: "m1", name: "Lizeth", age: 34 },
  { id: "m2", name: "Yuliet", age: 50 },
  { id: "m3", name: "Andres", age: 34 },
  { id: "m4", name: "Maria Jose", age: 16 },
  { id: "m5", name: "Antonia", age: 10 },
];

export const tasks: Task[] = [
  { id: "t1", name: "Organizar habitacion Principal", isDaily: false, defaultIsFixed: true, defaultFixedMemberId: "m2" },
  { id: "t2", name: "Organizar habitacion Secundaria", isDaily: false, defaultIsFixed: true, defaultFixedMemberId: "m3" },
  { id: "t3", name: "Organizar habitacion Antonia", isDaily: false, defaultIsFixed: true, defaultFixedMemberId: "m5" },
  { id: "t4", name: "Organizar habitacion MariaJo", isDaily: false, defaultIsFixed: true, defaultFixedMemberId: "m4" },
  { id: "t5", name: "Organizar Oficina", isDaily: false, defaultIsFixed: true, defaultFixedMemberId: "m3" },
  { id: "t6", name: "Cocinar Desayuno", isDaily: true, defaultIsFixed: false, defaultFixedMemberId: null },
  { id: "t7", name: "Cocinar Almuerzo", isDaily: true, defaultIsFixed: false, defaultFixedMemberId: null },
  { id: "t8", name: "Cocinar Cena", isDaily: true, defaultIsFixed: false, defaultFixedMemberId: null },
  { id: "t9", name: "Lavar cocina Desayuno", isDaily: true, defaultIsFixed: false, defaultFixedMemberId: null },
  { id: "t10", name: "Lavar cocina Almuerzo", isDaily: true, defaultIsFixed: false, defaultFixedMemberId: null },
  { id: "t11", name: "Lavar cocina Cena", isDaily: true, defaultIsFixed: false, defaultFixedMemberId: null },
  { id: "t12", name: "Secar cocina Desayuno", isDaily: true, defaultIsFixed: false, defaultFixedMemberId: null },
  { id: "t13", name: "Secar cocina Almuerzo", isDaily: true, defaultIsFixed: false, defaultFixedMemberId: null },
  { id: "t14", name: "Secar cocina Cena", isDaily: true, defaultIsFixed: false, defaultFixedMemberId: null },
  { id: "t15", name: "Alimentacion Cocoa manana", isDaily: true, defaultIsFixed: false, defaultFixedMemberId: null },
  { id: "t16", name: "Alimentacion Cocoa tarde/noche", isDaily: true, defaultIsFixed: false, defaultFixedMemberId: null },
  { id: "t17", name: "Ruta del popo", isDaily: true, defaultIsFixed: false, defaultFixedMemberId: null },
  { id: "t18", name: "Regar jardines", isDaily: true, defaultIsFixed: false, defaultFixedMemberId: null },
  { id: "t19", name: "Lavar ropa", isDaily: false, defaultIsFixed: false, defaultFixedMemberId: null },
  { id: "t20", name: "Extender ropa", isDaily: false, defaultIsFixed: false, defaultFixedMemberId: null },
  { id: "t21", name: "Doblar ropa", isDaily: false, defaultIsFixed: false, defaultFixedMemberId: null },
  { id: "t22", name: "Barrer", isDaily: false, defaultIsFixed: false, defaultFixedMemberId: null },
  { id: "t23", name: "Trapear", isDaily: false, defaultIsFixed: false, defaultFixedMemberId: null },
  { id: "t24", name: "Organizar zonas comunes internas", isDaily: false, defaultIsFixed: false, defaultFixedMemberId: null },
  { id: "t25", name: "Organizar zonas comunes externas", isDaily: false, defaultIsFixed: false, defaultFixedMemberId: null },
  { id: "t26", name: "Organizar taller", isDaily: false, defaultIsFixed: false, defaultFixedMemberId: null },
];

// Hand-picked mock result for "the current period" — stands in for what the
// assignment algorithm will produce once it exists.
export const assignments: Assignment[] = [
  // Daily tasks: one member for the whole period, every day.
  { taskId: "t6", memberId: "m1", dayOfWeek: null, isFixed: false },
  { taskId: "t7", memberId: "m2", dayOfWeek: null, isFixed: false },
  { taskId: "t8", memberId: "m3", dayOfWeek: null, isFixed: false },
  { taskId: "t9", memberId: "m3", dayOfWeek: null, isFixed: false },
  { taskId: "t10", memberId: "m1", dayOfWeek: null, isFixed: false },
  { taskId: "t11", memberId: "m2", dayOfWeek: null, isFixed: false },
  { taskId: "t12", memberId: "m2", dayOfWeek: null, isFixed: false },
  { taskId: "t13", memberId: "m3", dayOfWeek: null, isFixed: false },
  { taskId: "t14", memberId: "m1", dayOfWeek: null, isFixed: false },
  { taskId: "t15", memberId: "m4", dayOfWeek: null, isFixed: false },
  { taskId: "t16", memberId: "m4", dayOfWeek: null, isFixed: false },
  { taskId: "t17", memberId: "m3", dayOfWeek: null, isFixed: false },
  { taskId: "t18", memberId: "m1", dayOfWeek: null, isFixed: false },

  // Once-per-period tasks: one member + one specific day.
  { taskId: "t19", memberId: "m2", dayOfWeek: 0, isFixed: false },
  { taskId: "t20", memberId: "m2", dayOfWeek: 0, isFixed: false },
  { taskId: "t21", memberId: "m4", dayOfWeek: 1, isFixed: false },
  { taskId: "t22", memberId: "m1", dayOfWeek: 2, isFixed: false },
  { taskId: "t23", memberId: "m3", dayOfWeek: 2, isFixed: false },
  { taskId: "t24", memberId: "m2", dayOfWeek: 3, isFixed: false },
  { taskId: "t25", memberId: "m3", dayOfWeek: 4, isFixed: false },
  { taskId: "t26", memberId: "m3", dayOfWeek: 5, isFixed: false },

  // Fixed tasks: same member as the task default, still placed on a day.
  { taskId: "t1", memberId: "m2", dayOfWeek: 5, isFixed: true },
  { taskId: "t2", memberId: "m3", dayOfWeek: 5, isFixed: true },
  { taskId: "t3", memberId: "m5", dayOfWeek: 6, isFixed: true },
  { taskId: "t4", memberId: "m4", dayOfWeek: 6, isFixed: true },
  { taskId: "t5", memberId: "m3", dayOfWeek: 6, isFixed: true },
];

export type DaySchedule = {
  dayOfWeek: number;
  dayName: string;
  items: Array<{ task: Task; member: Member; isFixed: boolean }>;
};

export function getWeekSchedule(): DaySchedule[] {
  const memberById = new Map(members.map((m) => [m.id, m]));
  const taskById = new Map(tasks.map((t) => [t.id, t]));

  return DAY_NAMES.map((dayName, dayOfWeek) => {
    const items = assignments
      .filter((a) => a.dayOfWeek === null || a.dayOfWeek === dayOfWeek)
      .map((a) => ({
        task: taskById.get(a.taskId)!,
        member: memberById.get(a.memberId)!,
        isFixed: a.isFixed,
      }));

    return { dayOfWeek, dayName, items };
  });
}
