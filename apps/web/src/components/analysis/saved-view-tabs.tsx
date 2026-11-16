"use client";

import { AnalysisView } from "@budgetly/contract";
import { Button } from "@budgetly/ui/components/button";
import { Input } from "@budgetly/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@budgetly/ui/components/popover";
import { cn } from "@budgetly/ui/lib/utils";
import { EllipsisIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type ReactNode, useState, useTransition } from "react";
import { toast } from "sonner";
import { useEntry } from "@/components/transactions/entry-context";
import type { ActionResult } from "@/lib/action-result";
import { knownIds } from "@/lib/analysis/known";
import { pruneView, sameView } from "@/lib/analysis/view";
import { createSavedView, deleteSavedView, updateSavedView } from "@/lib/saved-views/actions";
import type { SavedViewOption } from "@/lib/saved-views/server";
import { useAnalysisNavigation } from "./navigation";
import { useSavedViews } from "./saved-views-context";

// The active tab and whether the state on screen differs from what it saved.
export function useDraft() {
  const { options } = useEntry();
  const views = useSavedViews();
  const { view, savedViewId, hasState } = useAnalysisNavigation();
  const saved = views.find((candidate) => candidate.id === savedViewId);
  const savedView = saved ? pruneView(saved.view, knownIds(options)) : undefined;
  return {
    saved,
    dirty: savedView !== undefined && !sameView(view, savedView),
    // A state from a link that is no tab of the user's.
    unsaved: saved === undefined && hasState,
    // The tab's state with ids that no longer exist left out.
    savedView: (option: SavedViewOption) => pruneView(option.view, knownIds(options)),
  };
}

// An action's error, translated like every server action's (ADR 0030).
function useActionError() {
  const tErrors = useTranslations("errors");
  return (result: ActionResult<unknown>) => {
    if (!result.ok) toast.error(tErrors(result.error));
    return result.ok;
  };
}

// Saved views as tabs (ADR 0037): switching drops the draft and opens the tab
// as saved; the active tab shows a dot while it has unsaved changes and a ⋯
// menu to rename or delete it. Scrolls sideways on phones.
export function SavedViewTabs() {
  const t = useTranslations("analysis.views");
  const views = useSavedViews();
  const { open } = useAnalysisNavigation();
  const { saved, dirty, savedView } = useDraft();
  const ok = useActionError();
  const [creating, startCreating] = useTransition();

  const create = () =>
    startCreating(async () => {
      const name = t("newViewName");
      const result = await createSavedView(name, AnalysisView.parse({}));
      if (ok(result) && result.ok) {
        open(result.data.view, result.data.id);
        toast.success(t("created", { name }));
      }
    });

  return (
    <div className="-mx-1 overflow-x-auto border-b px-1">
      <nav aria-label={t("tabs")} className="flex min-w-max items-end gap-0.5">
        {views.map((option) => {
          const active = option.id === saved?.id;
          return (
            <div
              key={option.id}
              className={cn(
                "-mb-px flex items-center gap-1 border-b-2 px-1",
                active ? "border-foreground text-foreground" : "border-transparent",
              )}
            >
              <button
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => open(savedView(option), option.id)}
                className={cn(
                  "rounded-md px-2 py-2 text-sm font-medium whitespace-nowrap focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
              {active && dirty && (
                <span title={t("unsaved")} className="flex items-center">
                  <span
                    aria-hidden
                    className="size-1.5 shrink-0 rounded-full bg-[var(--cat-amber)]"
                  />
                  <span className="sr-only">{t("unsaved")}</span>
                </span>
              )}
              {active && <TabMenu option={option} />}
            </div>
          );
        })}
        <Button
          variant="ghost"
          size="sm"
          className="mb-1 text-muted-foreground"
          onClick={create}
          disabled={creating}
        >
          <PlusIcon aria-hidden />
          {t("newView")}
        </Button>
      </nav>
    </div>
  );
}

// ⋯ on the active tab: rename in place, delete after a confirmation.
function TabMenu({ option }: { option: SavedViewOption }) {
  const t = useTranslations("analysis.views");
  const router = useRouter();
  const views = useSavedViews();
  const { open } = useAnalysisNavigation();
  const { savedView } = useDraft();
  const ok = useActionError();
  const [menuOpen, setMenuOpen] = useState(false);
  const [name, setName] = useState(option.label);
  const [confirming, setConfirming] = useState(false);
  const [busy, startBusy] = useTransition();

  const onOpenChange = (next: boolean) => {
    if (next) {
      setName(option.label);
      setConfirming(false);
    }
    setMenuOpen(next);
  };
  const rename = () =>
    startBusy(async () => {
      const trimmed = name.trim();
      if (!trimmed || trimmed === option.label) return setMenuOpen(false);
      if (ok(await updateSavedView(option.id, { name: trimmed }))) {
        setMenuOpen(false);
        toast.success(t("renamed"));
      }
    });
  const remove = () =>
    startBusy(async () => {
      if (!ok(await deleteSavedView(option.id))) return;
      setMenuOpen(false);
      toast.success(t("deleted"));
      const next = views.find((candidate) => candidate.id !== option.id);
      if (next) open(savedView(next), next.id);
      else router.push("/analysis");
    });

  return (
    <Popover open={menuOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={t("viewOptions", { name: option.label })}
            className="text-muted-foreground"
          />
        }
      >
        <EllipsisIcon aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            rename();
          }}
        >
          <Input
            aria-label={t("name")}
            value={name}
            maxLength={100}
            onChange={(event) => setName(event.target.value)}
          />
          <Button type="submit" size="sm" className="self-end" disabled={busy}>
            {t("rename")}
          </Button>
        </form>
        <div className="h-px bg-border" />
        {confirming ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">{t("deleteHint")}</p>
            <div className="flex justify-end gap-1.5">
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                {t("cancel")}
              </Button>
              <Button variant="destructive" size="sm" onClick={remove} disabled={busy}>
                {t("confirmDelete")}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="justify-start text-destructive hover:text-destructive"
            onClick={() => setConfirming(true)}
          >
            {t("deleteView")}
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Under the filters while the state differs from the active tab: discard,
// save into the tab, or save as a new tab (named inline). A state from a
// shared link can only be saved as new.
export function DraftBar() {
  const t = useTranslations("analysis.views");
  const { view, open } = useAnalysisNavigation();
  const { saved, dirty, unsaved, savedView } = useDraft();
  const ok = useActionError();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [busy, startBusy] = useTransition();

  if (!dirty && !unsaved) return null;

  const save = () =>
    startBusy(async () => {
      if (saved && ok(await updateSavedView(saved.id, { view }))) {
        toast.success(t("saved", { name: saved.label }));
      }
    });
  const saveAsNew = () =>
    startBusy(async () => {
      const trimmed = name.trim() || t("newViewName");
      const result = await createSavedView(trimmed, view);
      if (ok(result) && result.ok) {
        setNaming(false);
        open(result.data.view, result.data.id);
        toast.success(t("created", { name: trimmed }));
      }
    });
  const bold = (chunks: ReactNode) => <b className="font-semibold">{chunks}</b>;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--cat-amber)] bg-[var(--cat-amber-tint)] py-2 pr-2.5 pl-3.5 text-sm">
      {naming ? (
        <form
          className="flex w-full flex-wrap items-center justify-between gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            saveAsNew();
          }}
        >
          <label htmlFor="saved-view-name">{t("newName")}</label>
          <div className="flex flex-wrap items-center gap-1.5">
            <Input
              id="saved-view-name"
              value={name}
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
              className="h-8 w-48 bg-background"
            />
            <Button type="button" variant="ghost" size="sm" onClick={() => setNaming(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {t("create")}
            </Button>
          </div>
        </form>
      ) : (
        <>
          <p>
            {saved
              ? t.rich("draft", { name: saved.label, b: bold })
              : t.rich("unsavedView", { b: bold })}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {saved && (
              <Button variant="ghost" size="sm" onClick={() => open(savedView(saved), saved.id)}>
                {t("discard")}
              </Button>
            )}
            <Button
              variant={saved ? "outline" : "default"}
              size="sm"
              className={saved ? "bg-background" : undefined}
              onClick={() => {
                setName(saved ? t("copyName", { name: saved.label }) : "");
                setNaming(true);
              }}
            >
              {t("saveAsNew")}
            </Button>
            {saved && (
              <Button size="sm" onClick={save} disabled={busy}>
                {t("save")}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
