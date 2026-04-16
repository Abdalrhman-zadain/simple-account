"use client";

import { useSettings } from "@/providers/settings-provider";
import { useEffect, useMemo, useState } from "react";

const enTranslations: Record<string, string> = {
  "app.title": "Genius ERP",
  "app.subtitle": "General Ledger",

  "nav.group.ledger": "Ledger",
  "nav.group.setup": "Setup",
  "nav.group.control": "Control",
  "nav.group.system": "System",
  "nav.item.chartOfAccounts": "Chart of Accounts",
  "nav.item.bankCashAccounts": "Bank & Cash",
  "nav.item.journalEntries": "Journal Entries",
  "nav.item.generalLedger": "General Ledger",
  "nav.item.masterData": "Master Data",
  "nav.item.fiscalPeriods": "Fiscal Periods",
  "nav.item.auditTrail": "Audit Trail",
  "nav.item.settings": "Settings",

  "settings.title": "System Settings",
  "settings.globalPreferences": "Global Preferences",
  "settings.displayLanguage": "Display Language",
  "settings.english": "English (LTR)",
  "settings.arabic": "العربية (RTL)",
  "settings.note":
    "Note: Changing the language updates the layout direction (LTR/RTL) immediately.",

  "bankCash.title": "Payment Methods",
  "bankCash.description":
    "Register operational bank and cash accounts, link them to posting accounts, and review balances and transaction history.",
  "bankCash.button.new": "New Bank/Cash Account",
  "bankCash.filters.search": "Search by name, bank, account number, or COA account…",
  "bankCash.filters.type": "Payment Method",
  "bankCash.filters.status": "Status",
  "bankCash.filters.allTypes": "All payment methods",
  "bankCash.filters.allStatuses": "All statuses",
  "bankCash.filters.active": "Active only",
  "bankCash.filters.inactive": "Inactive only",
  "bankCash.empty": "No bank or cash accounts match the current filters.",
  "bankCash.type.BANK": "Bank",
  "bankCash.type.CASH": "Cash",
  "bankCash.table.account": "Account",
  "bankCash.table.type": "Type",
  "bankCash.table.balance": "Balance",
  "bankCash.table.status": "Status",
  "bankCash.table.actions": "Actions",
  "bankCash.table.bankName": "Bank / Location",
  "bankCash.history.title": "Transaction History",
  "bankCash.history.description": "Posted receipts, payments, transfers, and related references for the selected bank/cash account.",
  "bankCash.history.empty": "No posted transactions were found for this bank/cash account.",
  "bankCash.history.type": "Transaction Type",
  "bankCash.history.reference": "Reference",
  "bankCash.history.journalReference": "Journal Ref",
  "bankCash.history.date": "Date",
  "bankCash.history.descriptionColumn": "Description",
  "bankCash.history.debit": "Debit",
  "bankCash.history.credit": "Credit",
  "bankCash.form.createTitle": "New Bank/Cash Account",
  "bankCash.form.editTitle": "Edit Bank/Cash Account",
  "bankCash.form.name": "Account Name",
  "bankCash.form.namePlaceholder": "Search by account code or account name",
  "bankCash.form.nameHelp": "Choose an active posting account. You can search by account number or account name.",
  "bankCash.form.nameEmpty": "No matching posting account found.",
  "bankCash.form.bankName": "Bank Name / Cash Location",
  "bankCash.form.accountNumber": "Account Number / Reference",
  "bankCash.form.currency": "Currency",
  "bankCash.form.linkedAccount": "Linked COA Account",
  "bankCash.form.type": "Payment Method Type",
  "bankCash.form.typePlaceholder": "Select a payment method type",
  "bankCash.form.typeHelp": "Payment methods come from Master Data. Add Bank, Cash, Click, Wallet, or any other payment method there.",
  "bankCash.form.bankNameHelp": "Required when the payment method is Bank. Optional for other payment methods.",
  "bankCash.form.accountNumberHelp": "Required when the payment method is Bank. Optional for other payment methods.",
  "bankCash.form.linkedAccountPlaceholder": "Select a posting asset account",
  "bankCash.form.linkedAccountSearchHelp": "Start typing the account code or name to filter the chart of accounts.",
  "bankCash.form.linkedAccountEmpty": "No matching posting asset account found.",
  "bankCash.form.cancel": "Cancel",
  "bankCash.form.create": "Create",
  "bankCash.form.save": "Save Changes",
  "bankCash.action.edit": "Edit",
  "bankCash.action.deactivate": "Deactivate",
  "bankCash.action.select": "View History",
  "bankCash.summary.balance": "Current Balance",
  "bankCash.summary.linkedAccount": "Linked Account",
  "bankCash.summary.status": "Status",

  "language.toggle.aria": "Toggle language",
  "language.englishShort": "EN",
  "language.arabicShort": "AR",

  "accounts.title.root": "Chart of Accounts",
  "accounts.title.childrenOf": "Children of {code}",
  "accounts.description.root": "Manage your root account hierarchy.",
  "accounts.button.newAccount": "New Account",
  "accounts.button.newChild": "New Child",
  "accounts.breadcrumb.root": "Root",
  "accounts.stats.netBalance": "Net Balance",
  "accounts.stats.accounts": "accounts",
  "accounts.stats.allAccounts": "all accounts",
  "accounts.search.placeholder": "Search or filter: type:Asset, status:Active, is:Posting…",
  "accounts.suggestions.title": "Suggestions",
  "accounts.view.title": "Accounts View",
  "accounts.view.rootAccounts": "Root Accounts",
  "accounts.view.childAccounts": "Child Accounts",
  "accounts.status.error": "Error",
  "accounts.status.syncing": "Syncing…",
  "accounts.status.live": "Live",
  "accounts.table.accountDetails": "Account Details",
  "accounts.table.role": "Role",
  "accounts.table.balance": "Balance",
  "accounts.table.actions": "Actions",
  "accounts.role.label": "Account Role",
  "accounts.loading": "Loading accounts...",
  "accounts.empty": "No accounts found at this level.",
  "accounts.role.posting": "Posting Account",
  "accounts.role.header": "Header Account",
  "accounts.status.inactive": "Inactive",
  "accounts.row.goToLevel": "Go to level",
  "accounts.row.inParent": "in {name}",
  "accounts.action.addChild": "Add Child Account",
  "accounts.action.edit": "Edit Account",
  "accounts.action.deactivate": "Deactivate Account",
  "accounts.action.activate": "Activate Account",
  "accounts.action.delete": "Delete Account",
  "accounts.confirm.delete": "Delete this account? This is only allowed when the account has no transfer history.",

  "accountType.ASSET": "Asset",
  "accountType.LIABILITY": "Liability",
  "accountType.EQUITY": "Equity",
  "accountType.REVENUE": "Revenue",
  "accountType.EXPENSE": "Expense",

  "ledger.title": "General Ledger",
  "ledger.description":
    "Inspect posted transaction history for any account. See running balances, source references, and period summaries.",
  "ledger.filter.account": "Account",
  "ledger.filter.dateFrom": "Date From",
  "ledger.filter.dateTo": "Date To",
  "ledger.filter.selectPostingAccount": "— Select a posting account —",
  "ledger.empty.selectAccount": "Select an account to view its General Ledger",
  "ledger.summary.account": "Account",
  "ledger.summary.totalDebit": "Total Debit",
  "ledger.summary.totalCredit": "Total Credit",
  "ledger.table.date": "Date",
  "ledger.table.reference": "Reference",
  "ledger.table.description": "Description",
  "ledger.table.debit": "Debit",
  "ledger.table.credit": "Credit",
  "ledger.table.balance": "Balance",
  "ledger.loading": "Loading...",
  "ledger.openingBalance.start": "Start",
  "ledger.openingBalance.label": "Opening Balance",
  "ledger.empty.noMovements": "No movements recorded in this period.",
  "ledger.closingBalance": "Closing Balance",

  "fiscal.title": "Fiscal Periods",
  "fiscal.description":
    "Manage fiscal years and monthly periods. Closing a period locks it — no journal entries can be posted to closed periods.",
  "fiscal.button.newYear": "New Fiscal Year",
  "fiscal.add.year": "Year",
  "fiscal.add.placeholderYear": "e.g. 2026",
  "fiscal.add.create": "Create + Generate 12 Periods",
  "fiscal.add.cancel": "Cancel",
  "fiscal.loadingYears": "Loading fiscal years...",
  "fiscal.emptyYears": "No fiscal years yet. Create one above.",
  "fiscal.year.title": "Fiscal Year {year}",
  "fiscal.year.openPeriods": "{open} open / {total} periods",
  "fiscal.table.number": "#",
  "fiscal.table.period": "Period",
  "fiscal.table.dateRange": "Date Range",
  "fiscal.table.status": "Status",
  "fiscal.table.action": "Action",
  "fiscal.action.close": "Close",
  "fiscal.action.reopen": "Re-open",
  "fiscal.confirm.close": "Close \"{name}\"? This will prevent new postings.",
  "fiscal.confirm.reopen": "Re-open \"{name}\"?",

  "audit.title": "Audit Trail",
  "audit.description":
    "Full history of every system action — who did what, on which record, and when. This log is append-only and cannot be modified.",
  "audit.filter.entity": "Entity",
  "audit.filter.allEntities": "All entities",
  "audit.filter.showLast": "Show Last",
  "audit.filter.events": "{count} events",
  "audit.header.title": "System Audit Log",
  "audit.header.eventsRecorded": "{count} events recorded",
  "audit.loading": "Loading audit trail...",
  "audit.empty": "No audit events recorded yet.",
  "audit.user.system": "System",

  "journal.title": "Journal Entries",
  "journal.description":
    "Create, review, and post balanced debit/credit journal entries. Only active posting accounts can be used.",
  "journal.button.newEntry": "New Entry",
  "journal.create.title": "New Journal Entry",
  "journal.field.date": "Date",
  "journal.field.description": "Description",
  "journal.field.type": "Type",
  "journal.none": "— None —",
  "journal.button.addType": "Add new type",
  "journal.button.cancel": "Cancel",
  "journal.button.saveDraft": "Save as Draft",
  "journal.lines.account": "Account",
  "journal.lines.description": "Description",
  "journal.lines.debit": "Debit",
  "journal.lines.credit": "Credit",
  "journal.lines.addLine": "+ Add Line",
  "journal.balance.notBalanced": "Entry is not balanced. Debit: {debit} · Credit: {credit}",
  "journal.balance.balanced": "✓ Entry is balanced",
  "journal.list.title": "Journal Entries",
  "journal.list.subtitle": "Search by reference/description, or filter by type.",
  "journal.list.searchPlaceholder": "Search reference or description…",
  "journal.list.allTypes": "All types",
  "journal.list.loading": "Loading entries...",
  "journal.list.empty": "No journal entries yet.",
  "journal.entry.noDescription": "No description",
  "journal.action.post": "Post",
  "journal.action.reverse": "Reverse",
  "journal.confirm.post": "Post this entry?",
  "journal.confirm.reverse": "Reverse this entry?",

  "master.title": "Master Data Setup",
  "master.description":
    "Define your business dimensions — Companies, Natural Accounts, Departments, Branches, and Projects. These become the building blocks for all account codes.",
  "master.loading": "Loading master data...",

  "master.tab.accountSubtypes": "Account Classes",
  "master.tab.journalEntryTypes": "Journal Entry Types",
  "master.tab.paymentMethodTypes": "Payment Method Types",
  "master.section.accountSubtypes.title": "Account Classes (Subtypes)",
  "master.section.accountSubtypes.description": "Create your own account classes like Bank, Cash, Receivable, Payable, etc.",
  "master.section.accountSubtypes.add": "Add Class",
  "master.section.journalEntryTypes.title": "Journal Entry Types",
  "master.section.journalEntryTypes.description": "Create your own journal entry types like Payment, Invoice, Adjustment, Transfer, etc.",
  "master.section.journalEntryTypes.add": "Add Type",
  "master.section.paymentMethodTypes.title": "Payment Method Types",
  "master.section.paymentMethodTypes.description": "Create payment methods like Bank, Cash, Click, Wallet, Card, or any other way customers can pay.",
  "master.section.paymentMethodTypes.add": "Add Payment Method",
  "master.accountSubtypes.createError": "Failed to create account class.",
  "master.journalEntryTypes.createError": "Failed to create journal entry type.",
  "master.paymentMethodTypes.createError": "Failed to create payment method type.",

  "journal.accountSelect.placeholder": "— Select posting account —",
  "journal.accountSelect.noMatches": "No matches.",
  "journal.accountSelect.searchPlaceholder": "Type code or name…",
  "journal.type.save": "Save type",
  "journal.type.saving": "Saving…",
  "journal.type.createError": "Failed to create type.",

  "common.status.active": "Active",
  "common.status.inactive": "Inactive",
  "common.table.code": "Code",
  "common.table.name": "Name",
  "common.table.status": "Status",
  "common.table.actions": "Actions",
  "common.action.save": "Save",
  "common.action.cancel": "Cancel",
  "common.action.change": "Change",
  "common.action.remove": "Remove",
  "common.optional": "Optional",
  "common.loading": "Loading...",

  "master.segmentValues.empty": "No values yet. Add one above.",
  "master.accountSubtypes.empty": "No classes yet. Add one above.",
  "master.journalEntryTypes.empty": "No types yet. Add one above.",
  "master.paymentMethodTypes.empty": "No payment methods yet. Add one above.",
  "master.segmentValues.codePlaceholder": "Code (e.g., AMM)",
  "master.segmentValues.namePlaceholder": "Full name (e.g., Amman)",
  "master.accountSubtypes.namePlaceholder": "Class name (e.g., Bank)",
  "master.journalEntryTypes.namePlaceholder": "Type name (e.g., Payment)",
  "master.paymentMethodTypes.namePlaceholder": "Payment method name (e.g., Click)",

  "common.confirm.deactivate": "Deactivate \"{name}\"?",

  "accounts.form.loadingDetails": "Loading account details…",
  "accounts.form.title.new": "New Account",
  "accounts.form.title.edit": "Edit Account",
  "accounts.form.description.new": "Add a new entry to your Chart of Accounts.",
  "accounts.form.parentContext.label": "Adding child under",
  "accounts.form.parentContext.loading": "Loading parent…",
  "accounts.form.subtype.addToggle": "Add new class",
  "accounts.form.subtype.save": "Save class",
  "accounts.form.preview": "Preview:",
  "accounts.form.section.names": "Names & Description",
  "accounts.form.action.saveChanges": "Save Changes",
  "accounts.form.action.create": "Create Account",
  "accounts.form.error.saveFailed": "Failed to save account.",
  "accounts.type": "Account Type",
  "accounts.typeAndClass": "Account Type & Class",
  "accounts.subtype.label": "Account Class (Subtype)",
  "accounts.subtype.hint": "Optional — define your own classes in Master Data.",
  "accounts.subtype.placeholder": "e.g. Bank, Cash, Receivable",
  "accounts.subtype.createError": "Failed to create account class.",
  "accounts.form.nameEnLabel": "Account Name (English)",
  "accounts.form.nameEnPlaceholder": "e.g. Main Bank Account",
  "accounts.form.nameArLabel": "Arabic Name",
  "accounts.form.nameArHint": "Optional — displayed RTL",
  "accounts.form.nameArPlaceholder": "الحساب البنكي الرئيسي",
  "accounts.form.descriptionLabel": "Description / Notes",
  "accounts.form.descriptionPlaceholder": "Audit notes, operational scope, or internal commentary…",
  "accounts.form.postingSettings": "Posting Settings",
  "accounts.form.allowManual.label": "Allow manual journal entries",
  "accounts.form.allowManual.help": "When enabled, users can debit/credit this account directly in Journal Entries. Disable for system-controlled accounts (e.g. retained earnings, tax payable).",
  "accounts.form.allowManual.disabledNote": "Manual posting is disabled. This account can only be updated via automated system rules.",
  "common.none": "None",
  "common.back": "Back",
  "accounts.form.validation.nameRequired": "Name is required.",
  "accounts.form.validation.typeRequired": "Type is required.",
  "master.segmentValues.manage": "Manage {name} master values",
  "master.segmentValues.add": "Add {name}",
};

export type TranslationKey = string;

let cachedArabicTranslations: Record<string, string> | null = null;

export function useTranslation() {
  const { language } = useSettings();
  const [translations, setTranslations] = useState<Record<string, string>>(enTranslations);

  useEffect(() => {
    let isCancelled = false;

    if (language === "ar") {
      if (cachedArabicTranslations) {
        setTranslations(cachedArabicTranslations);
        return () => {
          isCancelled = true;
        };
      }

      void import("./ar").then((module) => {
        if (isCancelled) {
          return;
        }

        cachedArabicTranslations = module.default;
        setTranslations(module.default);
      });
    } else {
      setTranslations(enTranslations);
    }

    return () => {
      isCancelled = true;
    };
  }, [language]);

  const t = useMemo(
    () => (key: TranslationKey, vars?: Record<string, string | number>): string => {
      const template = translations[key] || enTranslations[key] || key;
      if (!vars) return template;
      return template.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`));
    },
    [translations],
  );

  return { t, language };
}
