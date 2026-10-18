import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, ChevronRight } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { Empty, Loading, Stat } from "@/components/crm/common";
import { NewOpportunityButton } from "@/components/crm/new-opportunity";
import { ROLE_LABEL, STAGE_LABEL, brl, fmtDateTime, isOpen, pendingAction, routineBucket, useMe, useOpportunities, type Stage } from "@/lib/crm";
import { ReportsView } from "./relatorios";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({ meta: [{ title: "Painel inicial · Marrocos" }, { name: "description", content: "Resumo do dia da loja." }] }),
  component: Painel,
});

function Painel() {
  const { data: me } = useMe();
  if (!me) return <Loading />;
  if (!me.isOperational) {
    return (
      <div>
        <Hero name={me.full_name} subtitle="Acompanhe os resultados consolidados das quatro lojas." />
        <div className="mt-8">
          <ReportsView compact />
        </div>
      </div>
    );
  }
  return <OperationalPanel />;
}

function Hero({ name, subtitle }: { name: string; subtitle: string }) {
  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="flex overflow-hidden rounded-3xl border border-border bg-blush">
      <div className="flex-1 p-8 sm:p-11">
        <div className="eyebrow text-primary/80">{today}</div>
        <h1 className="mt-5 text-3xl font-medium leading-tight tracking-tight sm:text-[2.6rem]">
          Olá, {name.split(" ")[0]}.<br />
          Vamos ao próximo atendimento?
        </h1>
        <p className="mt-5 text-muted-foreground">{subtitle}</p>
      </div>
      <div className="hidden w-64 items-center justify-center bg-primary text-primary-foreground md:flex">
        <BrandMark className="h-20 w-24" />
      </div>
    </div>
  );
}

function OperationalPanel() {
  const { data: me } = useMe();
  const { data: opps, isLoading } = useOpportunities();
  if (isLoading || !me) return <Loading />;
  const active = (opps ?? []).filter((o) => !o.archived);
  const open = active.filter(isOpen);
  const b = open.map((o) => routineBucket(o));
  const count = (k: string) => b.filter((x) => x === k).length;
  const stages: Stage[] = ["novo", "distribuido", "negociacao"];
  const max = Math.max(1, ...stages.map((s) => open.filter((o) => o.stage === s).length));
  const upcoming = open
    .map((o) => ({ o, a: pendingAction(o) }))
    .filter((x) => x.a?.due_at)
    .sort((x, y) => +new Date(x.a!.due_at!) - +new Date(y.a!.due_at!))
    .slice(0, 5);
  const won = active.filter((o) => o.stage === "ganho").length;
  const closed = active.filter((o) => !isOpen(o)).length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="eyebrow">
          {me.store_name ?? "Todas as lojas"} · {ROLE_LABEL[me.role]}
        </div>
        <NewOpportunityButton label="Novo lead" />
      </div>
      <Hero name={me.full_name} subtitle="Organize as oportunidades da sua loja e preserve a história de cada cliente." />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Ações de hoje" value={count("hoje")} hint="Atendimentos com data para hoje" />
        <Stat label="Atrasadas" value={count("atrasada")} hint="Planejamentos para retomar" />
        <Stat label="Sem próxima ação / sem data" value={count("sem_acao") + count("sem_data")} hint="Oportunidades que precisam de planejamento" />
        <Stat label="Taxa de conversão" value={closed ? `${Math.round((won / closed) * 100)}%` : "—"} hint={`${won} ganhas de ${closed} encerradas`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="panel p-7">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-medium">Oportunidades abertas</h2>
            <span className="rounded-md bg-blush px-2 py-0.5 text-sm text-primary">{open.length}</span>
          </div>
          <p className="mt-1 text-muted-foreground">Uma visão do atendimento em cada etapa.</p>
          <div className="mt-8 space-y-5">
            {stages.map((s) => {
              const n = open.filter((o) => o.stage === s).length;
              return (
                <div key={s} className="grid grid-cols-[110px_1fr_30px] items-center gap-4 text-sm">
                  <span>{STAGE_LABEL[s]}</span>
                  <div className="h-2 rounded-full bg-blush">
                    <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${(n / max) * 100}%` }} />
                  </div>
                  <span className="text-right font-medium">{n}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-border pt-6 text-sm">
            <div>
              <div className="text-muted-foreground">Vendas registradas</div>
              <div className="mt-1 text-xl font-medium">{won}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Perdidas</div>
              <div className="mt-1 text-xl font-medium">{active.filter((o) => o.stage === "perdido").length}</div>
            </div>
          </div>
        </div>

        <div className="panel p-7">
          <h2 className="text-2xl font-medium">Próximos atendimentos</h2>
          <div className="mt-5 divide-y divide-border">
            {upcoming.length === 0 && <Empty>Nenhum atendimento com data.</Empty>}
            {upcoming.map(({ o, a }) => (
              <Link key={o.id} to="/oportunidades/$id" params={{ id: o.id }} className="flex items-center gap-4 py-4 hover:opacity-80">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blush text-primary">
                  <CalendarDays className="h-5 w-5" strokeWidth={1.6} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{a!.description}</div>
                  <div className="truncate text-sm text-muted-foreground">{o.client?.full_name}</div>
                  <div className={`text-sm ${routineBucket(o) === "atrasada" ? "text-destructive" : "text-muted-foreground"}`}>{fmtDateTime(a!.due_at)}</div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      </div>
      <p className="sr-only">{brl(0)}</p>
    </div>
  );
}
