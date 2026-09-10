import { vi } from "vitest";

// A minimal fake of supabase-js's chainable query builder for testing that
// lib/data/*.ts scopes every query by household_id at the application
// level — the defense-in-depth layer alongside the real RLS policies in
// supabase/schema.sql (RLS itself can only be exercised against a live
// Postgres/Supabase project, which this test suite has no access to).
export type RecordedCall = { method: string; args: unknown[] };

const CHAIN_METHODS = [
  "select",
  "insert",
  "update",
  "delete",
  "eq",
  "order",
  "is",
  "not",
] as const;

export type MockQueryBuilder = {
  calls: RecordedCall[];
  [method: string]: unknown;
};

export function createMockQueryBuilder(result: {
  data?: unknown;
  error?: unknown;
}): MockQueryBuilder {
  const calls: RecordedCall[] = [];
  const builder: MockQueryBuilder = { calls };

  for (const method of CHAIN_METHODS) {
    builder[method] = vi.fn((...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    });
  }

  builder.single = vi.fn((...args: unknown[]) => {
    calls.push({ method: "single", args });
    return Promise.resolve(result);
  });

  // Makes the chain itself awaitable when a call ends without `.single()`.
  builder.then = (
    onFulfilled: (value: typeof result) => unknown,
    onRejected?: (reason: unknown) => unknown
  ) => Promise.resolve(result).then(onFulfilled, onRejected);

  return builder;
}

export function createMockSupabaseClient(result: { data?: unknown; error?: unknown }) {
  const builder = createMockQueryBuilder(result);
  const from = vi.fn(() => builder);
  return { client: { from }, from, builder };
}
