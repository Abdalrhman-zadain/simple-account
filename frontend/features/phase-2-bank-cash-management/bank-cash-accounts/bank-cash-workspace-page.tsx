"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ComponentType } from "react";
import {
  LuArrowLeftRight as ArrowLeftRight,
  LuInbox as Inbox,
  LuSend as Send,
  LuWalletMinimal as WalletMinimal,
} from "react-icons/lu";

import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import type { BankCashTransactionKind } from "@/types/api";
import { PageShell } from "@/components/ui";
import { BankCashTransactionsPage } from "../bank-cash-transactions";
import { BankCashAccountsPage } from "./bank-cash-accounts-page";

type BankCashWorkspace = "accounts" | "receipts" | "payments" | "transfers";

const WORKSPACE_TABS: Array<{
  id: BankCashWorkspace;
  href: string;
  labelKey: string;
  kind?: BankCashTransactionKind;
  icon: ComponentType<{ className?: string }>;
}> = [
  { id: "accounts", href: "/bank-cash-accounts?tab=accounts", labelKey: "nav.item.bankCashAccounts", icon: WalletMinimal },
  { id: "receipts", href: "/bank-cash-accounts?tab=receipts", labelKey: "bankCashTransactions.tab.RECEIPT", kind: "RECEIPT", icon: Inbox },
  { id: "payments", href: "/bank-cash-accounts?tab=payments", labelKey: "bankCashTransactions.tab.PAYMENT", kind: "PAYMENT", icon: Send },
  { id: "transfers", href: "/bank-cash-accounts?tab=transfers", labelKey: "bankCashTransactions.tab.TRANSFER", kind: "TRANSFER", icon: ArrowLeftRight },
];

export function BankCashWorkspacePage() {
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const activeWorkspace = normalizeWorkspace(searchParams.get("tab"));
  const transactionTab = WORKSPACE_TABS.find((tab) => tab.id === activeWorkspace && tab.kind);
  const tabs = (
    <>
      {WORKSPACE_TABS.map((tab) => {
        const Icon = tab.icon;
        const active = tab.id === activeWorkspace;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold transition-colors",
              active ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
            )}
          >
            <Icon className="h-4 w-4" />
            {t(tab.labelKey)}
          </Link>
        );
      })}
    </>
  );

  return (
    <PageShell>
      {activeWorkspace === "accounts" ? <BankCashAccountsPage headerTabs={tabs} /> : null}
      {transactionTab?.kind ? <BankCashTransactionsPage kind={transactionTab.kind} showKindTabs={false} headerTabs={tabs} /> : null}
    </PageShell>
  );
}

function normalizeWorkspace(value: string | null): BankCashWorkspace {
  switch (value) {
    case "receipts":
    case "payments":
    case "transfers":
      return value;
    default:
      return "accounts";
  }
}
