import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold tracking-wide text-zinc-300">{label}</span>
      {children}
      {error ? (
        <span className="mt-2 block text-sm font-medium text-red-400">{error}</span>
      ) : hint ? (
        <span className="mt-2 block text-[13px] font-medium text-zinc-500">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition-all placeholder:text-zinc-600 focus:border-teal-500 focus:bg-black/40 focus:ring-4 focus:ring-teal-500/10",
        props.className,
      )}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition-all focus:border-teal-500 focus:bg-black/40 focus:ring-4 focus:ring-teal-500/10 [&>option]:bg-zinc-900",
        props.className,
      )}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition-all placeholder:text-zinc-600 focus:border-teal-500 focus:bg-black/40 focus:ring-4 focus:ring-teal-500/10",
        props.className,
      )}
    />
  );
}
