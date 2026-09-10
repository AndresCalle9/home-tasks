import { BottomNav } from "@/components/bottom-nav";
import { CurrentMemberProvider } from "@/components/current-member-provider";
import { getCurrentHousehold } from "@/lib/auth/session";
import { listMembers } from "@/lib/data/members";

// The household member list is used across every tab (profile switcher,
// eligibility pickers) — fetch it once here rather than per page.
// `middleware.ts` already redirects unauthenticated requests before they
// reach this layout; `getCurrentHousehold()` is a defensive second check.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { id: householdId } = await getCurrentHousehold();
  const members = await listMembers(householdId);

  return (
    <CurrentMemberProvider memberIds={members.map((m) => m.id)}>
      <main className="mx-auto w-full max-w-lg flex-1 pb-24">{children}</main>
      <BottomNav />
    </CurrentMemberProvider>
  );
}
