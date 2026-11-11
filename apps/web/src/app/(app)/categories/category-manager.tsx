"use client";

import { Badge } from "@budgetly/ui/components/badge";
import { Button } from "@budgetly/ui/components/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@budgetly/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@budgetly/ui/components/dropdown-menu";
import { MoreHorizontalIcon, PaletteIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { AppearanceDialog, type AppearanceValue } from "@/components/categories/appearance-dialog";
import { CategoryChip } from "@/components/categories/category-chip";
import { NameDialog } from "@/components/forms/name-dialog";
import type { ActionResult } from "@/lib/action-result";
import { createBeneficiary, renameBeneficiary } from "@/lib/beneficiaries/actions";
import {
  createCategory,
  deleteCategory,
  renameCategory,
  restyleCategory,
  restyleGroup,
} from "@/lib/categories/actions";
import type { Appearance, CategoryOption, Option } from "@/lib/entry-options";

// A category with its resolved look and its own (null = the group's).
export type CategoryView = CategoryOption & { own: AppearanceValue };
export type GroupView = Option &
  Appearance & {
    kind: "spending" | "saving" | null;
    categories: CategoryView[];
  };

// The look being edited: a group (no inheritance) or a category.
type Styling = {
  key: string;
  name: string;
  initial: AppearanceValue;
  inherited?: Appearance;
  save: (value: AppearanceValue) => Promise<ActionResult<unknown>>;
};

// One name dialog for every create and rename on this screen.
type Editing = {
  key: string;
  title: string;
  saved: string;
  initial?: string;
  save: (name: string) => Promise<ActionResult<unknown>>;
};

// Category groups with their categories, and beneficiaries (ADR 0010).
// Groups are fixed in v1; categories are created, renamed and deleted.
export function CategoryManager({
  groups,
  beneficiaries,
}: {
  groups: GroupView[];
  beneficiaries: Option[];
}) {
  const t = useTranslations("categories");
  const tError = useTranslations("errors");
  const [editing, setEditing] = useState<Editing | null>(null);
  const [styling, setStyling] = useState<Styling | null>(null);

  async function remove(category: Option) {
    const result = await deleteCategory(category.id);
    if (!result.ok) {
      toast.error(tError(result.error));
      return;
    }
    toast.success(t("deleted", { name: category.label }));
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <Card key={group.id} size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CategoryChip color={group.color} icon={group.icon} size="sm" />
              {group.label}
              {group.kind === "saving" && <Badge variant="outline">{t("saving")}</Badge>}
            </CardTitle>
            <CardAction className="flex gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("styleOf", { name: group.label })}
                onClick={() =>
                  setStyling({
                    key: `group-${group.id}`,
                    name: group.label,
                    initial: { color: group.color, icon: group.icon },
                    // A group always has its own look: the dialog offers no null.
                    save: ({ color, icon }) =>
                      restyleGroup(group.id, {
                        color: color ?? group.color,
                        icon: icon ?? group.icon,
                      }),
                  })
                }
              >
                <PaletteIcon />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label={t("addTo", { group: group.label })}
                onClick={() =>
                  setEditing({
                    key: `new-${group.id}`,
                    title: t("newTitle", { group: group.label }),
                    saved: t("saved"),
                    save: (name) => createCategory(group.id, name),
                  })
                }
              >
                <PlusIcon />
                {t("add")}
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {group.categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("emptyGroup")}</p>
            ) : (
              <NameList
                label={group.label}
                items={group.categories}
                onStyle={(category) =>
                  setStyling({
                    key: category.id,
                    name: category.label,
                    initial: category.own,
                    inherited: { color: group.color, icon: group.icon },
                    save: (look) => restyleCategory(category.id, look),
                  })
                }
                onRename={(category) =>
                  setEditing({
                    key: category.id,
                    title: t("renameTitle"),
                    saved: t("saved"),
                    initial: category.label,
                    save: (name) => renameCategory(category.id, name),
                  })
                }
                onDelete={(category) => void remove(category)}
              />
            )}
          </CardContent>
        </Card>
      ))}

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("beneficiaries")}</CardTitle>
          <CardAction>
            <Button
              variant="ghost"
              size="sm"
              aria-label={t("addBeneficiary")}
              onClick={() =>
                setEditing({
                  key: "new-beneficiary",
                  title: t("newBeneficiaryTitle"),
                  saved: t("beneficiarySaved"),
                  save: createBeneficiary,
                })
              }
            >
              <PlusIcon />
              {t("add")}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">{t("beneficiariesHelp")}</p>
          <NameList
            label={t("beneficiaries")}
            items={beneficiaries}
            onRename={(beneficiary) =>
              setEditing({
                key: beneficiary.id,
                title: t("renameBeneficiaryTitle"),
                saved: t("beneficiarySaved"),
                initial: beneficiary.label,
                save: (name) => renameBeneficiary(beneficiary.id, name),
              })
            }
          />
        </CardContent>
      </Card>

      {styling && (
        <AppearanceDialog
          key={styling.key}
          open
          onOpenChange={(open) => !open && setStyling(null)}
          title={t("styleTitle")}
          name={styling.name}
          initial={styling.initial}
          inherited={styling.inherited}
          onSave={styling.save}
        />
      )}

      {editing && (
        <NameDialog
          key={editing.key}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          title={editing.title}
          saved={editing.saved}
          initial={editing.initial}
          // An unchanged name is not sent: renaming clears a default's seed key.
          onSave={(name) =>
            name === editing.initial
              ? Promise.resolve({ ok: true, data: null })
              : editing.save(name)
          }
        />
      )}
    </div>
  );
}

function NameList<T extends Option & Partial<Appearance>>({
  label,
  items,
  onRename,
  onStyle,
  onDelete,
}: {
  label: string;
  items: T[];
  onRename: (item: T) => void;
  onStyle?: (item: T) => void;
  onDelete?: (item: T) => void;
}) {
  const t = useTranslations("categories");
  return (
    <ul aria-label={label} className="flex flex-col divide-y">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-2 py-1">
          {item.color && item.icon && (
            <CategoryChip color={item.color} icon={item.icon} size="sm" />
          )}
          <span className="flex-1 truncate text-sm">{item.label}</span>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("actions", { name: item.label })}
                />
              }
            >
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onRename(item)}>
                <PencilIcon />
                {t("rename")}
              </DropdownMenuItem>
              {onStyle && (
                <DropdownMenuItem onClick={() => onStyle(item)}>
                  <PaletteIcon />
                  {t("style")}
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem variant="destructive" onClick={() => onDelete(item)}>
                  <Trash2Icon />
                  {t("delete")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </li>
      ))}
    </ul>
  );
}
