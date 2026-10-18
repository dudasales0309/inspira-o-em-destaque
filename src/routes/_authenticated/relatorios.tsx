import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Empty, Loading, PageHeader, Stat } from "@/components/crm/common";
import { NativeSelect } from "@/components/crm/native-select";
import { Input } from "@/components/ui/input";
import { STAGE_LABEL, STAGES, brl, errMsg, useMe, useStores } from "@/lib/crm";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios · Marrocos" }, { name: "description", content: "Indicadores comerciais por período e loja." }] }),
  component: () => {
    return (
      <div>
        <PageHeader eyebrow="Resultados" title="Relatórios" subtitle="Números consolidados calculados a partir dos registros." />
        <ReportsView />
      </div>
    );
  },
});

type Summary = {
  total: number;
  by_stage: Record<string, number>;
  by_origin: { name: string; value: number }[];
  by_store: { name: string; value: number }[];
  won: number;
  lost: number;
  sales_count: number;
  sales_total: number;
  sales_by_month: { name: string; value: number }[];
  products: { name: string; quantity: number; value: number }[];
  loss_reasons: { name: string; value: number }[];
};

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const iso = (d: Date) => d.toISOString().slice(0, 10);

export function ReportsView({ compact = false }: { compact?: boolean }) {
  const { data: me } = useMe();
  const { data: stores } = useStores();
  const [from, setFrom] = useState(() => iso(new Date(Date.now() - 90 * 864e5)));
  const [to, setTo] = useState(() => iso(new Date()));
  const [store, setStore] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["report", from, to, store],
    enabled: !!me?.canReports,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("report_summary", { _from: from, _to: to, _store: (store || null) as string });
      if (error) throw error;
      return data as unknown as Summary;
    },
  });

  if (me && !me.canReports) return <Empty>Seu perfil não tem acesso aos relatórios.</Empty>;
  const lockedStore = me && !me.isGlobal && me.role === "gerente";
  const closed = (data?.won ?? 0) + (data?.lost ?? 0);

  return (
    <div className="space-y-6">
      <div className="panel flex flex-wrap items-end gap-4 p-5">
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">De</div>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Até</div>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="min-w-56 space-y-1">
          <div className="text-xs text-muted-foreground">Loja</div>
          {lockedStore ? (
            <div className="flex h-10 items-center text-sm">{me?.store_name}</div>
          ) : (
            <NativeSelect value={store} onChange={setStore}>
              <option value="">Todas as lojas</option>
              {stores?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
          )}
        </div>
      </div>
      {isLoading && <Loading />}
      {error && <Empty>{errMsg(error)}</Empty>}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Oportunidades" value={data.total} hint="Cadastradas no período" />
            <Stat label="Taxa de conversão" value={closed ? `${Math.round((data.won / closed) * 100)}%` : "—"} hint={`${data.won} ganhas · ${data.lost} perdidas`} />
            <Stat label="Vendas realizadas" value={data.sales_count} hint="Vendas registradas no período" />
            <Stat label="Valor vendido" value={<span className="text-3xl">{brl(Number(data.sales_total))}</span>} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Volume por etapa">
              <BarSimple data={STAGES.map((s) => ({ name: STAGE_LABEL[s], value: data.by_stage[s] ?? 0 }))} />
            </ChartCard>
            <ChartCard title="Origem das oportunidades">
              <PieSimple data={data.by_origin} />
            </ChartCard>
            {!compact && (
              <>
                <ChartCard title="Vendas por mês (R$)">
                  <BarSimple data={data.sales_by_month.map((x) => ({ ...x, value: Number(x.value) }))} money />
                </ChartCard>
                <ChartCard title="Oportunidades por loja">
                  <BarSimple data={data.by_store} />
                </ChartCard>
                <ChartCard title="Produtos vendidos">
                  {data.products.length === 0 ? (
                    <Empty>Sem vendas no período.</Empty>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="text-left text-muted-foreground">
                        <tr>
                          <th className="py-2 font-normal">Produto</th>
                          <th className="py-2 text-right font-normal">Qtd.</th>
                          <th className="py-2 text-right font-normal">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.products.map((p) => (
                          <tr key={p.name} className="border-t border-border">
                            <td className="py-2">{p.name}</td>
                            <td className="py-2 text-right">{Number(p.quantity)}</td>
                            <td className="py-2 text-right">{brl(Number(p.value))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </ChartCard>
                <ChartCard title="Motivos de perda">
                  {data.loss_reasons.length === 0 ? <Empty>Sem perdas no período.</Empty> : <PieSimple data={data.loss_reasons} />}
                </ChartCard>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel p-6">
      <h3 className="mb-4 text-lg font-medium">{title}</h3>
      {children}
    </div>
  );
}

function BarSimple({ data, money }: { data: { name: string; value: number }[]; money?: boolean }) {
  if (!data.length) return <Empty>Sem dados no período.</Empty>;
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <BarChart data={data}>
          <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
          <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" allowDecimals={false} width={money ? 80 : 30} />
          <Tooltip formatter={(v: number) => (money ? brl(v) : v)} />
          <Bar dataKey="value" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PieSimple({ data }: { data: { name: string; value: number }[] }) {
  if (!data.length) return <Empty>Sem dados no período.</Empty>;
  return (
    <div className="flex h-64 items-center gap-4">
      <ResponsiveContainer width="55%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <ul className="space-y-2 text-sm">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
            {d.name} <span className="text-muted-foreground">({d.value})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
