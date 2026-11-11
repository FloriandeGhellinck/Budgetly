"use client";

import { Button } from "@budgetly/ui/components/button";
import { FieldError } from "@budgetly/ui/components/field";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@budgetly/ui/components/responsive-dialog";
import { useTranslations } from "next-intl";
import { type ReactNode, useState, useTransition } from "react";
import { toast } from "sonner";
import type { ActionErrorCode, ActionResult } from "@/lib/action-result";

// A small settings form over the page (accounts, categories, beneficiaries):
// title, fields, the API error if any, Cancel and Save. `onSubmit` returns
// null when the fields are invalid (they show their own error), else the
// server action's result; success toasts `saved` and closes.
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  saved,
  onSubmit,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  saved: string;
  onSubmit: () => Promise<ActionResult<unknown>> | null;
  children: ReactNode;
}) {
  const t = useTranslations("forms");
  const tError = useTranslations("errors");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<ActionErrorCode | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const call = onSubmit();
      if (!call) return;
      const result = await call;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(saved);
      onOpenChange(false);
    });
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription className={description ? undefined : "sr-only"}>
            {description ?? title}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          {children}
          {error && <FieldError>{tError(error)}</FieldError>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? t("saving") : t("save")}
            </Button>
          </div>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
