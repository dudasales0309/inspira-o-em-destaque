import type { ReactNode } from "react";
import { STAGE_LABEL, type Stage } from "@/lib/crm";
import { cn } from "@/lib/utils";

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const stageStyle: Record<Stage, string> = {
  novo: "bg-muted text-foreground",
  distribuido: "bg-secondary text-secondary-foreground",
  negociacao: "bg-blush text-primary",
  ganho: "bg-success/15 text-success",
  perdido: "bg-destructive/10 text-destructive",
};

export function StageBadge({ stage }: { stage: Stage }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", stageStyle[stage])}>{STAGE_LABEL[stage]}</span>;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="panel p-6">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-3 text-4xl font-medium tracking-tight">{value}</div>
      {hint && <div className="mt-3 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">{children}</div>;
}

export function Loading() {
  return <div className="py-16 text-center text-sm text-muted-foreground">Carregando...</div>;
}
