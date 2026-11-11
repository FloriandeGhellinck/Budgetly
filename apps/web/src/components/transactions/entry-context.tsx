"use client";

import type { Transaction } from "@budgetly/contract";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { EntryOptions } from "@/lib/entry-options";
import { ADD_PARAM } from "@/lib/quick-entry";
import type { EntryDraft } from "./duplicate";
import { EntryDialog } from "./entry-dialog";

export type EntryKind = "expense" | "income" | "transfer";

export type EntryTarget =
  | { mode: "new"; kind: EntryKind }
  | { mode: "edit"; transaction: Transaction }
  | { mode: "duplicate"; draft: EntryDraft };

type EntryContextValue = {
  options: EntryOptions;
  openNew: (kind?: EntryKind) => void;
  openEdit: (transaction: Transaction) => void;
  openDuplicate: (draft: EntryDraft) => void;
};

const EntryContext = createContext<EntryContextValue | null>(null);

function kindFromParam(value: string | null): EntryKind | null {
  if (value === null) return null;
  return value === "income" || value === "transfer" ? value : "expense";
}

// Mounted once by the app layout: one quick-entry dialog for every page,
// with the user's accounts, categories, beneficiaries and tags.
export function EntryProvider({
  options,
  children,
}: {
  options: EntryOptions;
  children: ReactNode;
}) {
  const [target, setTarget] = useState<EntryTarget | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Open once per appearance of the param (state adjusted during render),
  // then strip it from the URL so a refresh does not reopen the form.
  const requested = kindFromParam(searchParams.get(ADD_PARAM));
  const [handled, setHandled] = useState<EntryKind | null>(null);
  if (requested !== handled) {
    setHandled(requested);
    if (requested) setTarget({ mode: "new", kind: requested });
  }
  useEffect(() => {
    if (!requested) return;
    const rest = new URLSearchParams(searchParams);
    rest.delete(ADD_PARAM);
    const query = rest.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [requested, searchParams, router, pathname]);

  const openNew = useCallback(
    (kind: EntryKind = "expense") => setTarget({ mode: "new", kind }),
    [],
  );
  const openEdit = useCallback(
    (transaction: Transaction) => setTarget({ mode: "edit", transaction }),
    [],
  );
  const openDuplicate = useCallback(
    (draft: EntryDraft) => setTarget({ mode: "duplicate", draft }),
    [],
  );
  const value = useMemo(
    () => ({ options, openNew, openEdit, openDuplicate }),
    [options, openNew, openEdit, openDuplicate],
  );

  return (
    <EntryContext value={value}>
      {children}
      <EntryDialog target={target} options={options} onClose={() => setTarget(null)} />
    </EntryContext>
  );
}

export function useEntry(): EntryContextValue {
  const context = use(EntryContext);
  if (!context) throw new Error("useEntry must be used inside EntryProvider");
  return context;
}
