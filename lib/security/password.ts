import "server-only";

// Gates the actions that change the week's outcome (generating/resetting
// the week, manually reassigning a task's responsible member). Fails
// closed when unset — never treat a missing SECURITY_PASSWORD as "no gate".
export function verifySecurityPassword(submitted: string): boolean {
  const expected = process.env.SECURITY_PASSWORD;
  if (!expected) return false;
  return submitted === expected;
}
