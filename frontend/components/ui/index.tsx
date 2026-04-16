import React, { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";
export { Skeleton };

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1800px] px-4 py-8 sm:px-6 lg:px-8 animate-in fade-in slide-in-from-bottom-8 duration-300 motion-reduce:animate-none">
      {children}
    </div>
  );
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "app-surface p-8 md:p-10 transition-all duration-300",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string | ReactNode;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between mb-8">
      <div className="space-y-3">
        <h1 className="app-title text-3xl font-black tracking-tight sm:text-4xl xl:text-5xl">{title}</h1>
        {description ? <p className="app-subtitle text-lg leading-relaxed">{description}</p> : null}
      </div>
      <div className="flex-shrink-0">
        {action}
      </div>
    </div>
  );
}

export function StatusPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "positive" | "neutral" | "warning";
}) {
  const tones = {
    positive: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    neutral: "bg-zinc-500/10 text-gray-400 border-zinc-500/20",
    warning: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  };

  return (
    <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-medium shadow-sm", tones[tone])}>
      {label}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  ...props
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary: "bg-primary text-white hover:brightness-110 shadow-md",
    secondary: "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm",
    danger: "bg-red-50 text-red-700 hover:bg-red-100 shadow-sm",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-6 py-2.5 text-sm",
    lg: "px-8 py-3 text-base",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full font-bold transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-105",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg animate-in zoom-in-95 fade-in duration-300">
        <Card className="p-8 shadow-2xl ring-1 ring-white/10">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-900">
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {children}
        </Card>
      </div>
    </div>
  );
}

export function SidePanel({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={cn(
      "fixed inset-0 z-50 overflow-hidden transition-opacity duration-300",
      isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
    )}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={cn(
        "absolute inset-y-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl transition-transform duration-300 transform sm:inset-y-4 sm:right-4 sm:h-[calc(100vh-2rem)] sm:rounded-3xl sm:border sm:border-gray-200",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex h-full flex-col border-l border-gray-200 sm:border-l-0">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-gray-50 p-6">
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-900">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number, columns?: number }) {
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between py-4 border-b border-gray-100">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50/50 p-6">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="p-0">
          {[...Array(rows)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-10 py-8 border-b border-gray-50 last:border-0">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-1/4 opacity-50" />
              </div>
              <Skeleton className="h-6 w-24 shrink-0" />
              <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="flex flex-col gap-4 p-8 border-2 border-gray-50">
          <Skeleton className="h-3 w-1/2 opacity-50" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-3 w-1/3 opacity-30" />
        </Card>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-12 animate-pulse">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-4">
          <Skeleton className="h-14 w-80" />
          <Skeleton className="h-6 w-[500px] opacity-50" />
        </div>
        <Skeleton className="h-12 w-40 rounded-full" />
      </div>
      <StatsSkeleton />
      <div className="space-y-8 mt-16">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <TableSkeleton rows={3} />
      </div>
    </div>
  );
}
