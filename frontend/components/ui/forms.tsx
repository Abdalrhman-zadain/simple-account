import { forwardRef, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

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
      <span className="mb-2 block text-sm font-semibold tracking-wide text-gray-900">{label}</span>
      {children}
      {error ? (
        <span className="mt-2 block text-sm font-medium text-red-400 arabic-auto">{error}</span>
      ) : hint ? (
        <span className="mt-2 block text-[13px] font-medium text-gray-500 arabic-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>((props, ref) => {
  return (
    <input
      {...props}
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] font-medium text-gray-900 outline-none transition-all placeholder:font-medium placeholder:text-gray-600 focus:border-teal-500 focus:bg-gray-50 focus:ring-4 focus:ring-teal-500/10 arabic-auto arabic-placeholder",
        props.className,
      )}
    />
  );
});
Input.displayName = "Input";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>((props, ref) => {
  return (
    <select
      {...props}
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] font-medium text-gray-900 outline-none transition-all focus:border-teal-500 focus:bg-gray-50 focus:ring-4 focus:ring-teal-500/10 arabic-auto arabic-placeholder [&>option]:bg-white [&>option]:font-medium",
        props.className,
      )}
    />
  );
});
Select.displayName = "Select";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>((props, ref) => {
  return (
    <textarea
      {...props}
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] font-medium text-gray-900 outline-none transition-all placeholder:font-medium placeholder:text-gray-600 focus:border-teal-500 focus:bg-gray-50 focus:ring-4 focus:ring-teal-500/10 arabic-auto arabic-placeholder",
        props.className,
      )}
    />
  );
});
Textarea.displayName = "Textarea";
