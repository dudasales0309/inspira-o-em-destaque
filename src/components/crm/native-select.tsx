import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function NativeSelect({
  value,
  onChange,
  children,
  className,
  disabled,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      required={required}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
        className,
      )}
    >
      {children}
    </select>
  );
}
