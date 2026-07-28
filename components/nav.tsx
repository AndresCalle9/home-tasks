"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/calendario", label: "Calendario" },
  { href: "/configuracion", label: "Configuración" },
] as const;

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-4xl items-center gap-8 px-6 py-4">
        <span className="font-display text-lg font-semibold tracking-tight">
          Home Tasks
        </span>
        <nav className="flex gap-6">
          {TABS.map((tab) => {
            const active = pathname?.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "relative py-1 text-sm font-medium transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                {active && (
                  <span className="absolute -bottom-[13px] left-0 right-0 h-[3px] rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
