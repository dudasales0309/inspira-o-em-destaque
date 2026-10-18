import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Empty, Loading, PageHeader, StageBadge } from "@/components/crm/common";
import { NativeSelect } from "@/components/crm/native-select";
import { NewOpportunityButton } from "@/components/crm/new-opportunity";
import { Input } from "@/components/ui/input";
import { ORIGINS, STAGES, STAGE_LABEL, fmtDateTime, pendingAction, routineBucket, useMe, useOpportunities, useStaff, useStores } from "@/lib/crm";

export const Route = createFileRoute("/_authenticated/oportunidades/")({
  head: () => ({ meta: [{ title: "Oportunidades · Marrocos" }, { name: "description", content: "Carteira de oportunidades de venda." }] }),
  component: Oportunidades,
});

function Oportunidades() {
  const { data: me } = useMe();
  const { data: opps, isLoading } = useOpportunities();
  const { data: stores } = useStores();
  const { data: staff } = useStaff();
  const navigate = useNavigate();
  const [f, setF] = useState({ stage: "", store: "", owner: "", origin: "", q: "", archived: "ativas" });

  const rows = useMemo(
    () =>
      (opps ?? []).filter(
        (o) =>
          (f.archived === "todas" || (f.archived === "arquivadas" ? o.archived : !o.archived)) &&
          (!f.stage || o.stage === f.stage) &&
          (!f.store || o.store_id === f.store) &&
          (!f.owner || (f.owner === "none" ? !o.owner_id : o.owner_id === f.owner)) &&
          (!f.origin || o.origin === f.origin) &&
          (!f.q || `${o.client?.full_name} ${o.products}`.toLowerCase().includes(f.q.toLowerCase())),
      ),
    [opps, f],
  );
  const owners = (staff ?? []).filter((s) => s.roles.includes("vendedor") || s.roles.includes("gerente"));

  return (
    <div>
      <PageHeader eyebrow="Carteira" title="Oportunidades" subtitle="Cada oportunidade é uma possível venda vinculada a um cliente." actions={<NewOpportunityButton />} />
      <div className="panel p-5">
        <div className="mb-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Input placeholder="Buscar cliente ou produto" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
          <NativeSelect value={f.stage} onChange={(v) => setF({ ...f, stage: v })}>
            <option value="">Todas as situações</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABEL[s]}
              </option>
            ))}
          </NativeSelect>
          {me?.isGlobal && (
            <NativeSelect value={f.store} onChange={(v) => setF({ ...f, store: v })}>
              <option value="">Todas as lojas</option>
              {stores?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
          )}
          {me?.canManage && (
            <NativeSelect value={f.owner} onChange={(v) => setF({ ...f, owner: v })}>
              <option value="">Todos os responsáveis</option>
              <option value="none">Sem responsável</option>
              {owners.filter((s) => !f.store || s.store_id === f.store).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </NativeSelect>
          )}
          <NativeSelect value={f.origin} onChange={(v) => setF({ ...f, origin: v })}>
            <option value="">Todas as origens</option>
            {ORIGINS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </NativeSelect>
          <NativeSelect value={f.archived} onChange={(v) => setF({ ...f, archived: v })}>
            <option value="ativas">Ativas</option>
            <option value="arquivadas">Arquivadas</option>
            <option value="todas">Todas</option>
          </NativeSelect>
        </div>
        {isLoading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty>Nenhuma oportunidade encontrada.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  {["Cliente", "Produtos", "Loja", "Responsável", "Situação", "Próximo atendimento"].map((h) => (
                    <th key={h} className="px-3 py-2 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => {
                  const a = pendingAction(o);
                  const late = routineBucket(o) === "atrasada";
                  return (
                    <tr key={o.id} onClick={() => navigate({ to: "/oportunidades/$id", params: { id: o.id } })} className="cursor-pointer border-t border-border hover:bg-muted/50">
                      <td className="px-3 py-3 font-medium">
                        {o.client?.full_name}
                        {o.archived && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">Arquivada</span>}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{o.products}</td>
                      <td className="px-3 py-3">{o.store?.name}</td>
                      <td className="px-3 py-3">{o.owner?.full_name ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-3 py-3">
                        <StageBadge stage={o.stage} />
                      </td>
                      <td className={`px-3 py-3 ${late ? "text-destructive" : ""}`}>
                        {a ? (
                          <>
                            <div>{a.description}</div>
                            <div className="text-xs text-muted-foreground">{a.due_at ? fmtDateTime(a.due_at) : "Sem data"}</div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
