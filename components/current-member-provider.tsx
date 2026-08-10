"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const STORAGE_KEY = "home-tasks:current-member";

type CurrentMemberContextValue = {
  currentMemberId: string | null;
  setCurrentMemberId: (id: string) => void;
};

const CurrentMemberContext = createContext<CurrentMemberContextValue | null>(null);

function readStoredMemberId(memberIds: string[]): string | null {
  if (typeof window === "undefined") return memberIds[0] ?? null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && memberIds.includes(stored)) return stored;
  return memberIds[0] ?? null;
}

// Mounted once in the root layout, so "who am I today" survives navigating
// between tabs (no login/accounts — see CLAUDE.md) and across visits.
export function CurrentMemberProvider({
  memberIds,
  children,
}: {
  memberIds: string[];
  children: ReactNode;
}) {
  const [currentMemberId, setCurrentMemberId] = useState(() =>
    readStoredMemberId(memberIds)
  );

  function updateCurrentMemberId(id: string) {
    setCurrentMemberId(id);
    window.localStorage.setItem(STORAGE_KEY, id);
  }

  return (
    <CurrentMemberContext.Provider
      value={{ currentMemberId, setCurrentMemberId: updateCurrentMemberId }}
    >
      {children}
    </CurrentMemberContext.Provider>
  );
}

export function useCurrentMember(): CurrentMemberContextValue {
  const ctx = useContext(CurrentMemberContext);
  if (!ctx) {
    throw new Error("useCurrentMember must be used within CurrentMemberProvider");
  }
  return ctx;
}
