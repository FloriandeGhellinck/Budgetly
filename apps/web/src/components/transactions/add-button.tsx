"use client";

import { Button } from "@budgetly/ui/components/button";
import { PlusIcon } from "lucide-react";
import type { ReactNode } from "react";
import { type EntryKind, useEntry } from "./entry-context";

export function AddTransactionButton({
  kind = "expense",
  children,
}: {
  kind?: EntryKind;
  children: ReactNode;
}) {
  const { openNew } = useEntry();
  return (
    <Button onClick={() => openNew(kind)}>
      <PlusIcon />
      {children}
    </Button>
  );
}
