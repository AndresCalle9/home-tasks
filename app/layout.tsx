import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { BottomNav } from "@/components/bottom-nav";
import { ToastProvider } from "@/components/toast-provider";
import { CurrentMemberProvider } from "@/components/current-member-provider";
import { listMembers } from "@/lib/data/members";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Home Tasks",
  description: "Reparte las tareas del hogar entre todos, semana a semana.",
};

// The household member list is used across every tab (profile switcher,
// eligibility pickers) — fetch it once here rather than per page.
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const members = await listMembers();

  return (
    <html lang="es" className={`${plusJakartaSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background">
        <ToastProvider>
          <CurrentMemberProvider memberIds={members.map((m) => m.id)}>
            <main className="mx-auto w-full max-w-lg flex-1 pb-24">
              {children}
            </main>
            <BottomNav />
          </CurrentMemberProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
