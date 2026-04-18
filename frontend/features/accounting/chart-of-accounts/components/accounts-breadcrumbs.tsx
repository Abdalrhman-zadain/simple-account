"use client";

import React from "react";
import { LuChevronRight as ChevronRight, LuHouse as Home } from "react-icons/lu";

import { useTranslation } from "@/lib/i18n";
import { Account } from "@/types/api";

export function AccountsBreadcrumbs({
  parentAccount,
  onNavigate,
}: {
  parentAccount: Account | null | undefined;
  onNavigate: (accountId: string | null) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="mb-4 flex flex-wrap items-center gap-y-2 text-sm text-gray-500">
      <button
        onClick={() => onNavigate(null)}
        className="flex items-center gap-1.5 transition-colors hover:text-teal-500"
      >
        <Home className="h-4 w-4" />
        <span className="font-semibold">{t("accounts.breadcrumb.root")}</span>
      </button>

      {parentAccount?.ancestors?.map((ancestor) => (
        <React.Fragment key={ancestor.id}>
          <ChevronRight className="mx-2 h-4 w-4 opacity-30" />
          <button
            onClick={() => onNavigate(ancestor.id)}
            className="transition-colors hover:text-teal-500"
          >
            {ancestor.name}
          </button>
        </React.Fragment>
      ))}

      {parentAccount && (
        <>
          <ChevronRight className="mx-2 h-4 w-4 opacity-30" />
          <span className="font-bold text-gray-900">{parentAccount.name}</span>
        </>
      )}
    </div>
  );
}
