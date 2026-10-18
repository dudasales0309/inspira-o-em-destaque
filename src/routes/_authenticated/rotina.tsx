import { createFileRoute, Link } from "@tanstack/react-router";
import { Empty, Loading, PageHeader, StageBadge } from "@/components/crm/common";
import { fmtDateTime, isOpen, pendingAction, routineBucket, useMe, useOpportunities, type OppRow } from "@/lib/crm";

export const Route = createFileRoute("/_authenticated/rotina")({
  head: () => ({ meta: [{ title: "Minha Rotina · Marrocos" }, { name: "description", content: "Próximos contatos a realizar." }] }),
  component: Rotina,
});

const GROUPS = [
  { k: "atrasada", title: "Ações atrasadas" },
  { k: "hoje", title: "Ações previstas para hoje" },
  { k: "sem_acao", title: "Oportunidades sem próxima ação" },
  { k: "sem_data", title: "Com próxima ação, mas sem data" },
] as const;

function Rotina() {
  const { data: me } = useMe();
  const { data, isLoading } = useOpportunities();
  if (isLoading || !me) return <Loading />;
  const open = (data ?? []).filter((o) => !o.archived && isOpen(o));
  return (
    <div>
      <PageHeader
        eyebrow="Rotina"
        title="Minha Rotina"
        subtitle={me.canManage ? "Atendimentos das oportunidades sob sua gestão." : "Seus próximos contatos com clientes."}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        {GROUPS.map((g) => {
          const items = open.filter((o) => routineBucket(o) === g.k);
          return (
            <div key={g.k} className="panel p-6">
              <div className="mb-4 flex items-center gap-3">
                <h2 className="text-lg font-medium">{g.title}</h2>
                <span className={`rounded-md px-2 text-sm ${g.k === "atrasada" && items.length ? "bg-destructive/10 text-destructive" : "bg-blush text-primary"}`}>{items.length}</span>
              </div>
              {items.length === 0 ? <Empty>Nada por aqui.</Empty> : <div className="divide-y divide-border">{items.map((o) => <Row key={o.id} o={o} />)}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Row({ o }: { o: OppRow }) {
  const a = pendingAction(o);
  return (
    <Link to="/oportunidades/$id" params={{ id: o.id }} className="flex items-center justify-between gap-3 py-3 text-sm hover:opacity-80">
      <div className="min-w-0">
        <div className="font-medium">{o.client?.full_name}</div>
        <div className="truncate text-muted-foreground">{a ? `${a.description}${a.due_at ? " · " + fmtDateTime(a.due_at) : ""}` : o.products}</div>
        <div className="text-xs text-muted-foreground">
          {o.store?.name} · {o.owner?.full_name ?? "Sem responsável"}
        </div>
      </div>
      <StageBadge stage={o.stage} />
    </Link>
  );
}
