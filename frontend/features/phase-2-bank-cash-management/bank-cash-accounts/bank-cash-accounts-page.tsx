"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LuCirclePlus as CirclePlus } from "react-icons/lu";

import type { BankCashAccount, BankCashAccountTransaction, BankCashAccountType } from "@/types/api";
import {
  createLinkedBankCashAccount,
  createBankCashAccount,
  getAccountsTree,
  deactivateBankCashAccount,
  getAccountOptions,
  getBankCashAccounts,
  getBankCashAccountTransactions,
  getPaymentMethodTypes,
  updateBankCashAccount,
} from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/providers/auth-provider";
import { Button, SectionHeading } from "@/components/ui";
import { useTranslation } from "@/lib/i18n";

import { EMPTY_EDITOR, type EditorState } from "./bank-cash-accounts.types";
import { BankCashAccountDetails } from "./components/bank-cash-account-details";
import { BankCashAccountEditor } from "./components/bank-cash-account-editor";
import { BankCashAccountsFilters } from "./components/bank-cash-accounts-filters";
import { BankCashAccountsSummary } from "./components/bank-cash-accounts-summary";
import { BankCashAccountsTable } from "./components/bank-cash-accounts-table";
import type { LinkedAccountParentOption } from "./components/linked-account-creator";

type AccountTreeLike = {
  id: string;
  code: string;
  name: string;
  isPosting: boolean;
  children?: AccountTreeLike[];
};

export function BankCashAccountsPage() {
  const { token } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<BankCashAccountType | "">("");
  const [statusFilter, setStatusFilter] = useState<"true" | "false" | "">("true");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLinkedAccountCreatorOpen, setIsLinkedAccountCreatorOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>(EMPTY_EDITOR);

  const accountsQuery = useQuery({
    queryKey: queryKeys.bankCashAccounts(token, { search, type: typeFilter, isActive: statusFilter }),
    queryFn: () => getBankCashAccounts({ search, type: typeFilter, isActive: statusFilter }, token),
  });

  const postingAccountsQuery = useQuery({
    queryKey: queryKeys.accounts(token, { isPosting: "true", isActive: "true", type: "ASSET", view: "selector" }),
    queryFn: () => getAccountOptions({ isPosting: "true", isActive: "true", type: "ASSET" }, token),
    enabled: isEditorOpen,
    staleTime: 5 * 60 * 1000,
  });

  const offsetAccountsQuery = useQuery({
    queryKey: queryKeys.accounts(token, {
      isPosting: "true",
      isActive: "true",
      type: "EQUITY",
      view: "selector",
    }),
    queryFn: () => getAccountOptions({ isPosting: "true", isActive: "true", type: "EQUITY" }, token),
    enabled: isEditorOpen,
    staleTime: 5 * 60 * 1000,
  });

  const accountHierarchyQuery = useQuery({
    queryKey: ["accounts-tree", token, "bank-cash-linked-account", isEditorOpen],
    queryFn: () => getAccountsTree({ type: "ASSET", isActive: "true" }, token),
    enabled: isEditorOpen,
    staleTime: 5 * 60 * 1000,
  });

  const paymentMethodTypesQuery = useQuery({
    queryKey: queryKeys.paymentMethodTypes(token),
    queryFn: () => getPaymentMethodTypes(token),
    staleTime: 5 * 60 * 1000,
  });

  const selectedAccount = useMemo(
    () => (accountsQuery.data ?? []).find((item) => item.id === selectedId) ?? null,
    [accountsQuery.data, selectedId],
  );

  const transactionsQuery = useQuery({
    queryKey: queryKeys.bankCashAccountTransactions(token, selectedId, {}),
    queryFn: () => getBankCashAccountTransactions(selectedId!, {}, token),
    enabled: Boolean(selectedId),
  });

  const createMutation = useMutation({
    mutationFn: () => createBankCashAccount(toPayload(editor), token),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ["bank-cash-accounts"] });
      setSelectedId(created.id);
      setIsEditorOpen(false);
      setEditor(EMPTY_EDITOR);
    },
  });

  const createLinkedAccountMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createLinkedBankCashAccount>[0]) =>
      createLinkedBankCashAccount(payload, token),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
      await queryClient.invalidateQueries({ queryKey: ["accounts-tree"] });
      setEditor((current) => ({
        ...current,
        name: created.postingAccount.name,
        accountId: created.postingAccount.id,
        currencyCode: created.postingAccount.currencyCode,
      }));
      setIsLinkedAccountCreatorOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => updateBankCashAccount(editor.id!, toPayload(editor), token),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ["bank-cash-accounts"] });
      void queryClient.invalidateQueries({ queryKey: ["bank-cash-account-transactions", token, updated.id] });
      setSelectedId(updated.id);
      setIsEditorOpen(false);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivateBankCashAccount(id, token),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ["bank-cash-accounts"] });
      void queryClient.invalidateQueries({ queryKey: ["bank-cash-account-transactions", token, updated.id] });
      setSelectedId(updated.id);
    },
  });

  const rows = accountsQuery.data ?? [];
  const selectedDetails = transactionsQuery.data?.bankCashAccount ?? selectedAccount;
  const historyRows: BankCashAccountTransaction[] = transactionsQuery.data?.transactions ?? [];
  const activeCount = rows.filter((row) => row.isActive).length;
  const totalBalance = rows.reduce((sum, row) => sum + Number(row.currentBalance), 0);
  const defaultOpeningBalanceOffsetAccountId =
    (offsetAccountsQuery.data ?? []).find((account) => account.code === "3410001")?.id ?? "";

  const editorError = useMemo(() => {
    const error = createMutation.error ?? updateMutation.error;
    return error instanceof Error ? localizeBankCashAccountError(error.message, t) : null;
  }, [createMutation.error, t, updateMutation.error]);

  const linkedAccountCreatorError = useMemo(() => {
    const error = createLinkedAccountMutation.error;
    return error instanceof Error ? error.message : null;
  }, [createLinkedAccountMutation.error]);

  const linkedAccountParentOptions = useMemo(
    () => buildLinkedAccountParentOptions(accountHierarchyQuery.data ?? []),
    [accountHierarchyQuery.data],
  );

  useEffect(() => {
    if (!isEditorOpen || editor.id || editor.openingBalanceOffsetAccountId || !defaultOpeningBalanceOffsetAccountId) {
      return;
    }

    setEditor((current) => {
      if (current.id || current.openingBalanceOffsetAccountId) {
        return current;
      }

      return {
        ...current,
        openingBalanceOffsetAccountId: defaultOpeningBalanceOffsetAccountId,
      };
    });
  }, [defaultOpeningBalanceOffsetAccountId, editor.id, editor.openingBalanceOffsetAccountId, isEditorOpen]);

  const openCreate = () => {
    setEditor({
      ...EMPTY_EDITOR,
      openingBalanceOffsetAccountId: defaultOpeningBalanceOffsetAccountId,
    });
    setIsLinkedAccountCreatorOpen(false);
    setIsEditorOpen(true);
  };

  const openEdit = (row: BankCashAccount) => {
    setEditor({
      id: row.id,
      type: row.type,
      name: row.account.name,
      bankName: row.bankName ?? "",
      currencyCode: row.currencyCode,
      accountId: row.account.id,
      openingBalance: "",
      openingBalanceOffsetAccountId: "",
    });
    setIsLinkedAccountCreatorOpen(false);
    setIsEditorOpen(true);
  };

  const submit = () => {
    if (editor.id) {
      updateMutation.mutate();
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="space-y-8">
      <SectionHeading
        title={t("bankCash.title")}
        description={t("bankCash.description")}
        action={
          <Button onClick={openCreate} className="gap-2">
            <CirclePlus className="h-4 w-4 shrink-0" />
            {t("bankCash.button.new")}
          </Button>
        }
      />

      <BankCashAccountsSummary activeCount={activeCount} totalBalance={totalBalance} />

      <BankCashAccountsFilters
        search={search}
        typeFilter={typeFilter}
        statusFilter={statusFilter}
        paymentMethodTypes={paymentMethodTypesQuery.data ?? []}
        onSearchChange={setSearch}
        onTypeFilterChange={setTypeFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <BankCashAccountsTable
          rows={rows}
          selectedId={selectedId}
          isLoading={accountsQuery.isLoading}
          isDeactivatePending={deactivateMutation.isPending}
          onSelect={setSelectedId}
          onEdit={openEdit}
          onDeactivate={(id) => deactivateMutation.mutate(id)}
        />

        <BankCashAccountDetails
          selectedId={selectedId}
          selectedDetails={selectedDetails}
          historyRows={historyRows}
          isLoading={transactionsQuery.isLoading}
        />
      </div>

      <BankCashAccountEditor
        isOpen={isEditorOpen}
        editor={editor}
        postingAccounts={postingAccountsQuery.data ?? []}
        offsetAccounts={(offsetAccountsQuery.data ?? []).filter((account) => account.id !== editor.accountId)}
        paymentMethodTypes={paymentMethodTypesQuery.data ?? []}
        errorMessage={editorError}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        isLinkedAccountCreatorOpen={isLinkedAccountCreatorOpen}
        linkedAccountCreatorError={linkedAccountCreatorError}
        linkedAccountParentOptions={linkedAccountParentOptions}
        isCreatingLinkedAccount={createLinkedAccountMutation.isPending}
        onClose={() => {
          setIsLinkedAccountCreatorOpen(false);
          setIsEditorOpen(false);
        }}
        onSubmit={submit}
        onChange={setEditor}
        onLinkedAccountCreatorOpen={() => setIsLinkedAccountCreatorOpen(true)}
        onLinkedAccountCreatorClose={() => setIsLinkedAccountCreatorOpen(false)}
        onLinkedAccountCreate={(payload) => createLinkedAccountMutation.mutate(payload)}
      />
    </div>
  );
}

function toPayload(editor: EditorState) {
  return {
    type: editor.type,
    name: editor.name,
    bankName: editor.bankName || undefined,
    currencyCode: editor.currencyCode,
    accountId: editor.accountId,
    openingBalance: editor.openingBalance ? Number(editor.openingBalance) : undefined,
    openingBalanceOffsetAccountId: editor.openingBalanceOffsetAccountId || undefined,
  };
}

function localizeBankCashAccountError(message: string, t: (key: string) => string) {
  if (message === "This chart-of-accounts record is already linked to another bank/cash account.") {
    return t("bankCash.error.accountAlreadyLinked");
  }

  if (message === "Opening balance offset account is required when an opening balance is provided.") {
    return t("bankCash.error.openingBalanceOffsetRequired");
  }

  return message;
}

function buildLinkedAccountParentOptions(nodes: AccountTreeLike[]) {
  const anchor = findCashAndCashEquivalentsNode(nodes);
  if (!anchor) {
    return [] satisfies LinkedAccountParentOption[];
  }

  return collectHeaderDescendants(anchor.children ?? [], 0);
}

function findCashAndCashEquivalentsNode(nodes: AccountTreeLike[]): AccountTreeLike | null {
  for (const node of nodes) {
    if (node.code === "1110000" || node.name === "Cash and Cash Equivalents") {
      return node;
    }

    const nested = findCashAndCashEquivalentsNode(node.children ?? []);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function collectHeaderDescendants(nodes: AccountTreeLike[], depth: number) {
  const out: LinkedAccountParentOption[] = [];

  for (const node of nodes) {
    if (!node.isPosting) {
      out.push({
        id: node.id,
        code: node.code,
        name: node.name,
        depth,
      });
    }

    out.push(...collectHeaderDescendants(node.children ?? [], depth + 1));
  }

  return out;
}
