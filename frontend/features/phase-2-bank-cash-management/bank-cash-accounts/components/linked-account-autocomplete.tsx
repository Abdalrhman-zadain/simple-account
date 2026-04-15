"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { AccountOption } from "@/types/api";
import { useTranslation } from "@/lib/i18n";
import { cn, formatCurrency } from "@/lib/utils";

function formatAccountLabel(option: AccountOption) {
  return `${option.code} · ${option.name}`;
}

export function LinkedAccountAutocomplete({
  options,
  value,
  onSelect,
  placeholder,
  helpText,
  emptyText,
}: {
  options: AccountOption[];
  value: string;
  onSelect: (option: AccountOption) => void;
  placeholder?: string;
  helpText?: string;
  emptyText?: string;
}) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = useMemo(
    () => options.find((option) => option.id === value) ?? null,
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const input = query.trim().toLowerCase();
    if (!input) {
      return options;
    }

    return options.filter((option) =>
      [option.code, option.name, option.currencyCode].some((field) => field.toLowerCase().includes(input)),
    );
  }, [options, query]);

  useEffect(() => {
    setQuery(selectedOption ? formatAccountLabel(selectedOption) : "");
  }, [selectedOption]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        value={query}
        placeholder={placeholder ?? t("bankCash.form.linkedAccountPlaceholder")}
        onFocus={() => setIsOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setIsOpen(false);
          }

          if (event.key === "Enter" && filteredOptions.length > 0) {
            event.preventDefault();
            const nextOption = filteredOptions[0];
            onSelect(nextOption);
            setQuery(formatAccountLabel(nextOption));
            setIsOpen(false);
          }
        }}
        className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-500/40"
      />
      <p className="mt-1.5 text-xs text-gray-500">{helpText ?? t("bankCash.form.linkedAccountSearchHelp")}</p>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 max-h-72 overflow-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-4 text-sm text-gray-500">{emptyText ?? t("bankCash.form.linkedAccountEmpty")}</div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = option.id === value;

              return (
                <button
                  key={option.id}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onSelect(option);
                    setQuery(formatAccountLabel(option));
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-start justify-between gap-4 rounded-xl px-3 py-2.5 text-left transition hover:bg-gray-50",
                    isSelected && "bg-teal-50",
                  )}
                >
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-bold text-teal-600">{option.code}</div>
                    <div className="truncate text-sm font-semibold text-gray-900">{option.name}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs font-bold uppercase tracking-wide text-gray-500">{option.currencyCode}</div>
                    <div className="text-xs text-gray-500">{formatCurrency(option.currentBalance)}</div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
