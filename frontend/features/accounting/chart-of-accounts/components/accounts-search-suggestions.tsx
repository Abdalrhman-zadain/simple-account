"use client";

import type { TranslationKey } from "@/lib/i18n";

import { CommandSuggestion } from "../chart-of-accounts.types";

export function AccountsSearchSuggestions({
  suggestions,
  title,
  translate,
  onSelect,
}: {
  suggestions: CommandSuggestion[];
  title: string;
  translate: (key: TranslationKey) => string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl animate-in slide-in-from-top-2 duration-200">
      <div className="border-b border-gray-200 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
        {title}
      </div>
      <div className="max-h-60 overflow-auto py-1">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.value}
            onClick={() => onSelect(suggestion.value)}
            className="group flex w-full items-center justify-between px-4 py-2.5 text-start transition-colors hover:bg-gray-100"
          >
            <span className="text-sm font-medium text-gray-900">
              {suggestion.labelKey ? translate(suggestion.labelKey) : suggestion.label}
            </span>
            <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
              {suggestion.categoryKey ? translate(suggestion.categoryKey) : suggestion.category}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
