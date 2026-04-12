import React, { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PageShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 animate-in fade-in slide-in-from-bottom-4 duration-700">{children}</div>;
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
        "rounded-3xl border border-white/10 bg-panel/40 p-6 shadow-panel backdrop-blur-xl transition hover:border-white/20",
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
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-4xl font-bold tracking-tight text-transparent drop-shadow-sm">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm text-zinc-400 opacity-80">{description}</p> : null}
      </div>
      {action}
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
    neutral: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
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
    primary: "bg-teal-500 text-teal-950 hover:bg-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.2)] hover:shadow-[0_0_20px_rgba(20,184,166,0.3)]",
    secondary: "bg-white/5 text-white hover:bg-white/10 border border-white/10",
    danger: "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20",
    ghost: "text-zinc-400 hover:text-white hover:bg-white/5",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-6 py-2.5 text-sm",
    lg: "px-8 py-3 text-base",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed",
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
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <button onClick={onClose} className="text-zinc-400 hover:text-white">
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
        "absolute inset-y-0 right-0 w-full max-w-2xl bg-zinc-900 shadow-2xl transition-transform duration-300 transform",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="h-full flex flex-col border-l border-white/5">
          <div className="flex items-center justify-between p-6 border-b border-white/5 bg-zinc-900/50">
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <button onClick={onClose} className="text-zinc-400 hover:text-white">
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
