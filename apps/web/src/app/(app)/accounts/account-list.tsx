"use client";

import { Badge } from "@budgetly/ui/components/badge";
import { Button } from "@budgetly/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@budgetly/ui/components/dropdown-menu";
import { Money } from "@budgetly/ui/components/money";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  ScaleIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { archiveAccount, unarchiveAccount } from "@/lib/accounts/actions";
import { formatShare } from "@/lib/accounts/share";
import { signedMoney } from "@/lib/reports/figures";
import { AccountDialog, type EditableAccount } from "./account-dialog";
import { BalanceDialog } from "./balance-dialog";

export type AccountRow = EditableAccount & {
  balanceMinor: number;
  archived: boolean;
  // No opening balance yet: the balance is the net of recorded transactions (ADR 0029).
  relative: boolean;
};

type DialogTarget = { account: EditableAccount | null } | null;

// Accounts with their balance; create, edit, adjust the balance, archive and unarchive.
export function AccountList({ accounts }: { accounts: AccountRow[] }) {
  const t = useTranslations("accounts");
  const [target, setTarget] = useState<DialogTarget>(null);
  const [adjusting, setAdjusting] = useState<AccountRow | null>(null);
  const active = accounts.filter((a) => !a.archived);
  const archived = accounts.filter((a) => a.archived);

  return (
    <>
      <div className="flex justify-end pb-2">
        <Button onClick={() => setTarget({ account: null })}>
          <PlusIcon />
          {t("new")}
        </Button>
      </div>
      <Rows
        accounts={active}
        label={t("active")}
        onEdit={(account) => setTarget({ account })}
        onAdjust={setAdjusting}
      />
      {archived.length > 0 && (
        <section className="flex flex-col gap-1 pt-4">
          <h2 className="text-xs font-medium text-muted-foreground uppercase">{t("archived")}</h2>
          <Rows
            accounts={archived}
            label={t("archived")}
            onEdit={(account) => setTarget({ account })}
            onAdjust={setAdjusting}
          />
        </section>
      )}
      {target && (
        <AccountDialog
          key={target.account?.id ?? "new"}
          account={target.account}
          open
          onOpenChange={(open) => !open && setTarget(null)}
        />
      )}
      {adjusting && (
        <BalanceDialog
          key={adjusting.id}
          account={adjusting}
          open
          onOpenChange={(open) => !open && setAdjusting(null)}
        />
      )}
    </>
  );
}

function Rows({
  accounts,
  label,
  onEdit,
  onAdjust,
}: {
  accounts: AccountRow[];
  label: string;
  onEdit: (account: AccountRow) => void;
  onAdjust: (account: AccountRow) => void;
}) {
  const t = useTranslations("accounts");
  const tError = useTranslations("errors");
  const locale = useLocale();

  async function toggleArchive(account: AccountRow) {
    const result = account.archived
      ? await unarchiveAccount(account.id)
      : await archiveAccount(account.id);
    if (!result.ok) toast.error(tError(result.error));
    else toast.success(account.archived ? t("unarchivedToast") : t("archivedToast"));
  }

  return (
    <ul aria-label={label} className="divide-y rounded-xl ring-1 ring-foreground/10">
      {accounts.map((account) => (
        <li key={account.id} className="flex items-center gap-3 px-3 py-2.5">
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium">{account.label}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {account.shareBps < 10_000 ? (
                <Badge variant="secondary">
                  {t("sharedBadge", { share: formatShare(account.shareBps, locale) })}
                </Badge>
              ) : (
                t("personal")
              )}
              {account.relative && <span>· {t("relativeBadge")}</span>}
            </span>
          </span>
          <Money
            {...signedMoney(account.balanceMinor)}
            locale={locale}
            aria-label={t("balanceOf", { name: account.label })}
            className="font-medium"
          />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("actions", { name: account.label })}
                />
              }
            >
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onEdit(account)}>
                <PencilIcon />
                {t("edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAdjust(account)}>
                <ScaleIcon />
                {t("adjustBalance")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void toggleArchive(account)}>
                {account.archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
                {account.archived ? t("unarchive") : t("archive")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </li>
      ))}
    </ul>
  );
}
