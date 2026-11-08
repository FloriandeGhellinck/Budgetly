import type { ReactNode } from "react";

// The title row every page starts with; actions sit on the right.
export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-2 pb-4">
      <h1 className="text-xl font-semibold">{title}</h1>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
