import "server-only";

// Gates the actions that change a period's outcome (running/rerolling the
// sorteo, reassigning a task's member or day). Fails closed when unset —
// never treat a missing SECURITY_PASSWORD as "no gate".
export function verifySecurityPassword(submitted: string): boolean {
  const expected = process.env.SECURITY_PASSWORD;
  if (!expected) return false;
  return submitted === expected;
}
