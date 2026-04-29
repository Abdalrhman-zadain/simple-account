"use client";

import Link from "next/link";
import { LuChevronRight as ChevronRight, LuCirclePlus as PlusCircle, LuPen as Edit, LuPower as Power, LuPowerOff as PowerOff, LuTrash2 as Trash } from "react-icons/lu";

import { StatusPill } from "@/components/ui";
import { useTranslation } from "@/lib/i18n";
import { cn, formatCurrency } from "@/lib/utils";
import { AccountTableRow } from "@/types/api";

import { getLocalizedAccountName } from "../chart-of-accounts.naming";
import { TYPE_STYLES } from "../chart-of-accounts.utils";

export function AccountRow({
  account,
  isSearching,
  showType,
  isMutating,
  onEnter,
  onActivate,
  onDeactivate,
  onDelete,
}: {
  account: AccountTableRow;
  isSearching: boolean;
  showType?: boolean;
  isMutating: boolean;
  onEnter: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
}) {
  const { t, language } = useTranslation();
  const balanceNum = parseFloat(account.currentBalance);
  const style = TYPE_STYLES[account.type];
  const displayName = getLocalizedAccountName(account, language);
  const displayParentName = account.parentAccount ? getLocalizedAccountName(account.parentAccount, language) : null;

  return (
    <tr className={cn("group transition-all hover:bg-gray-50", !account.isPosting && "cursor-pointer")} onClick={onEnter}>
      <td className="px-10 py-4">
        <div className="flex items-center gap-6">
          <div
            className={cn(
              "h-1.5 w-1.5 rounded-full shadow-[0_0_8px] ring-4",
              style.dot.replace("bg-", "ring-").replace("bg-", "text-"),
              style.dot,
            )}
          />
          <div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-sm font-bold transition-colors",
                  account.isActive ? "text-gray-900 group-hover:text-teal-400" : "text-gray-500 line-through",
                )}
              >
                {displayName}
              </span>
              {!account.isPosting && (
                <ChevronRight className="h-3 w-3 text-gray-600 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-500" />
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <div className="text-[11px] font-mono font-medium text-gray-500">
                {account.code}
                {showType && (
                  <span className={cn(
                    "ml-2 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tighter",
                    style.badge
                  )}>
                    {t(`accountType.${account.type}`)}
                  </span>
                )}
              </div>
              {isSearching && account.parentAccount && (
                <>
                  <div className="h-1 w-1 rounded-full bg-zinc-700" />
                  <div className="max-w-[200px] truncate text-[10px] font-medium uppercase tracking-wider text-teal-500/70">
                    {t("accounts.row.inParent", { name: displayParentName ?? account.parentAccount.name })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <StatusPill
            label={account.isPosting ? t("accounts.role.posting") : t("accounts.role.header")}
            tone={account.isPosting ? "positive" : "neutral"}
          />
          {!account.isActive && <StatusPill label={t("accounts.status.inactive")} tone="warning" />}
          {!account.isPosting && (
            <span className="text-[9px] font-bold uppercase tracking-tighter text-teal-500/50 transition-all group-hover:translate-x-1 group-hover:text-teal-400">
              {t("accounts.row.goToLevel")}
            </span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 text-right tabular-nums">
        <span
          className={cn(
            "font-mono text-sm font-bold",
            balanceNum > 0 ? "text-teal-400" : balanceNum < 0 ? "text-rose-400" : "text-gray-600",
          )}
        >
          {formatCurrency(account.currentBalance)}
        </span>
      </td>
      <td className="px-10 py-4 text-right">
        <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {!account.isPosting && (
            <Link
              href={`/accounts/new?parentAccountId=${account.id}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-teal-500/10 hover:text-teal-400"
              onClick={(event) => event.stopPropagation()}
              title={t("accounts.action.addChild")}
            >
              <PlusCircle className="h-4 w-4" />
            </Link>
          )}
          <Link
            href={`/accounts/edit/${account.id}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
            onClick={(event) => event.stopPropagation()}
            title={t("accounts.action.edit")}
          >
            <Edit className="h-4 w-4" />
          </Link>
          {account.isActive ? (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onDeactivate();
              }}
              disabled={isMutating}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-50"
              title={t("accounts.action.deactivate")}
            >
              <PowerOff className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onActivate();
              }}
              disabled={isMutating}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-teal-500/10 hover:text-teal-400 disabled:opacity-50"
              title={t("accounts.action.activate")}
            >
              <Power className="h-4 w-4" />
            </button>
          )}
          {account.canDelete && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                if (confirm(t("accounts.confirm.delete"))) {
                  onDelete();
                }
              }}
              disabled={isMutating}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-rose-500/10 hover:text-rose-500 disabled:opacity-50"
              title={t("accounts.action.delete")}
            >
              <Trash className="h-4 w-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
