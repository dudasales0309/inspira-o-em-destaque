import { createFileRoute, Link } from "@tanstack/react-router";
import { Loading, PageHeader } from "@/components/crm/common";
import { STAGES, STAGE_LABEL, fmtDate, useOpportunities } from "@/lib/crm";

export const Route = createFileRoute("/_authenticated/funil")({
  head: () => ({ meta: [{ title: "Funil de vendas · Marrocos" }, { name: "description", content: "Oportunidades organizadas por etapa." }] }),
  component: Funil,
});

function Funil() {
  const { data, isLoading } = useOpportunities();
  if (isLoading) return <Loading />;
  const active = (data ?? []).filter((o) => !o.archived);
  return (
    <div>
      <PageHeader
        eyebrow="Etapas"
        title="Funil de vendas"
        subtitle="Novo → Distribuído → Negociação → Ganho ou Perdido. As etapas mudam pelos registros feitos em cada oportunidade."
      />
      <div className="grid gap-4 overflow-x-auto pb-4 md:grid-cols-5">
        {STAGES.map((s) => {
          const items = active.filter((o) => o.stage === s);
          return (
            <div key={s} className="min-w-60 rounded-2xl bg-muted/60 p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="font-medium">{STAGE_LABEL[s]}</span>
                <span className="rounded-md bg-card px-2 text-sm">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((o) => (
                  <Link key={o.id} to="/oportunidades/$id" params={{ id: o.id }} className="block rounded-xl border border-border bg-card p-3 text-sm shadow-sm transition hover:border-primary/40">
                    <div className="font-medium">{o.client?.full_name}</div>
                    <div className="mt-1 line-clamp-2 text-muted-foreground">{o.products}</div>
                    <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                      <span>{o.owner?.full_name ?? "Sem responsável"}</span>
                      <span>{fmtDate(o.created_at)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
