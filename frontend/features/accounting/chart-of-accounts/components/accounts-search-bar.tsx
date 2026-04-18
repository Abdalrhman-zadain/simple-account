"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { LuSearch as Search, LuX as X } from "react-icons/lu";

import { Input } from "@/components/forms";
import { Card } from "@/components/ui";
import { useTranslation } from "@/lib/i18n";

import { ActiveFilterChip, CommandSuggestion } from "../chart-of-accounts.types";
import { AccountsSearchSuggestions } from "./accounts-search-suggestions";

export type AccountsSearchBarHandle = {
  focus: () => void;
};

export const AccountsSearchBar = forwardRef<
  AccountsSearchBarHandle,
  {
    searchQuery: string;
    activeFilters: ActiveFilterChip[];
    suggestions: CommandSuggestion[];
    showSuggestions: boolean;
    onSearchChange: (value: string) => void;
    onShowSuggestions: () => void;
    onHideSuggestions: () => void;
    onRemoveFilter: (token: string) => void;
    onSelectSuggestion: (value: string) => void;
  }
>(
  (
    {
      searchQuery,
      activeFilters,
      suggestions,
      showSuggestions,
      onSearchChange,
      onShowSuggestions,
      onHideSuggestions,
      onRemoveFilter,
      onSelectSuggestion,
    },
    ref,
  ) => {
    const { t } = useTranslation();
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }));

    return (
      <Card className="app-surface relative z-50 overflow-visible p-4 shadow-xl ring-1 ring-gray-200/50">
        <div className="relative w-full">
          <div className="group relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              ref={inputRef}
              value={searchQuery}
              onChange={(event) => {
                onSearchChange(event.target.value);
                onShowSuggestions();
              }}
              onClick={onShowSuggestions}
              onBlur={() => window.setTimeout(onHideSuggestions, 150)}
              placeholder={t("accounts.search.placeholder")}
              className="app-field h-12 pl-11 focus:ring-teal-500/20"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {activeFilters.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {activeFilters.map((chip) => (
                <span
                  key={chip.remove}
                  className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-300"
                >
                  {chip.label}
                  <button onClick={() => onRemoveFilter(chip.remove)} className="ml-0.5 transition-colors hover:text-gray-900">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {showSuggestions && suggestions.length > 0 && (
            <AccountsSearchSuggestions
              suggestions={suggestions}
              title={t("accounts.suggestions.title")}
              onSelect={onSelectSuggestion}
            />
          )}
        </div>
      </Card>
    );
  },
);

AccountsSearchBar.displayName = "AccountsSearchBar";
