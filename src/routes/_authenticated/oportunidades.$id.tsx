import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Empty, Loading, StageBadge } from "@/components/crm/common";
import { NativeSelect } from "@/components/crm/native-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CONTACT_TYPES, LOSS_REASONS, OPP_SELECT, brl, errMsg, fmtDate, fmtDateTime, isOpen, toLocalInput, useMe, useStaff, type OppRow } from "@/lib/crm";

export const Route = createFileRoute("/_authenticated/oportunidades/$id")({
  head: () => ({ meta: [{ title: "Oportunidade · Marrocos" }, { name: "description", content: "Detalhes e histórico da oportunidade." }] }),
  component: Detail,
});

type Dlg = null | "contato" | "acao" | "venda" | "perda" | "responsavel" | "arquivar" | "reabrir";

function useDetail(id: string) {
  return useQuery({
    queryKey: ["opportunity", id],
    queryFn: async () => {
      const [o, i, a, s, l, e] = await Promise.all([
        supabase.from("opportunities").select(OPP_SELECT).eq("id", id).maybeSingle(),
        supabase.from("interactions").select("*, user:profiles!interactions_user_id_fkey(full_name)").eq("opportunity_id", id).order("contact_date", { ascending: false }),
        supabase.from("next_actions").select("*, owner:profiles!next_actions_owner_id_fkey(full_name)").eq("opportunity_id", id).order("created_at", { ascending: false }),
        supabase.from("sales").select("*, sale_items(*)").eq("opportunity_id", id).order("created_at", { ascending: false }),
        supabase.from("losses").select("*").eq("opportunity_id", id).order("created_at", { ascending: false }),
        supabase.from("opportunity_events").select("*").eq("opportunity_id", id).order("created_at", { ascending: false }),
      ]);
      if (o.error) throw o.error;
      return { opp: o.data as unknown as OppRow | null, interactions: i.data ?? [], actions: a.data ?? [], sales: s.data ?? [], losses: l.data ?? [], events: e.data ?? [] };
    },
  });
}

function Detail() {
  const { id } = Route.useParams();
  const { data: me } = useMe();
  const { data: staff } = useStaff();
  const { data, isLoading } = useDetail(id);
  const [dlg, setDlg] = useState<Dlg>(null);
  if (isLoading || !me) return <Loading />;
  if (!data?.opp) return <Empty>Oportunidade não encontrada ou sem permissão de acesso.</Empty>;
  const o = data.opp;
  const name = (uid: string | null) => staff?.find((s) => s.id === uid)?.full_name ?? "—";
  const canWork = me.canManage || o.owner_id === me.id;
  const open = isOpen(o);
  const pending = data.actions.find((a) => a.status === "pendente");
  const close = () => setDlg(null);

  type Item = { at: string; node: ReactNode };
  const timeline: Item[] = [
    ...data.interactions.map((x) => ({
      at: x.contact_date,
      node: (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{x.contact_type}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs ${x.result === "efetivo" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
              {x.result === "efetivo" ? "Conversa efetiva" : "Tentativa sem resposta"}
            </span>
          </div>
          <div className="text-muted-foreground">{(x.user as { full_name: string } | null)?.full_name}</div>
          {x.notes && <div className="mt-1">{x.notes}</div>}
        </>
      ),
    })),
    ...data.events.map((e) => ({
      at: e.created_at,
      node: (
        <div className="text-muted-foreground">
          {e.description}
          {e.kind === "transferencia" && ` · de ${name(e.from_user)} para ${name(e.to_user)}`}
          {e.kind === "distribuicao" && e.to_user && ` · para ${name(e.to_user)}`}
        </div>
      ),
    })),
  ].sort((a, b) => +new Date(b.at) - +new Date(a.at));

  return (
    <div>
      <Link to="/oportunidades" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Oportunidades
      </Link>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">{o.client?.full_name}</h1>
            <StageBadge stage={o.stage} />
            {o.archived && <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs">Arquivada</span>}
          </div>
          <p className="mt-1 text-muted-foreground">{o.products}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canWork && open && !o.archived && (
            <>
              <Button onClick={() => setDlg("contato")}>Registrar atendimento</Button>
              <Button variant="outline" onClick={() => setDlg("venda")}>Registrar venda</Button>
              <Button variant="outline" onClick={() => setDlg("perda")}>Registrar perda</Button>
            </>
          )}
          {me.canManage && (
            <>
              {open && !o.archived && <Button variant="outline" onClick={() => setDlg("responsavel")}>{o.owner_id ? "Transferir" : "Distribuir"}</Button>}
              {!open && <Button variant="outline" onClick={() => setDlg("reabrir")}>Reabrir</Button>}
              <Button variant="ghost" onClick={() => setDlg("arquivar")}>{o.archived ? "Desarquivar" : "Arquivar"}</Button>
            </>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <div className="space-y-6">
          <div className="panel p-6">
            <h2 className="mb-4 text-lg font-medium">Dados</h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <Info k="Telefone" v={o.client?.phone || "—"} />
              <Info k="Origem" v={o.origin || "—"} />
              <Info k="Loja" v={o.store?.name} />
              <Info k="Responsável" v={o.owner?.full_name ?? "Sem responsável"} />
              <Info k="Cadastro" v={fmtDate(o.created_at)} />
              <Info k="Encerramento" v={fmtDate(o.closed_at)} />
              {o.archived && <Info k="Motivo do arquivamento" v={o.archived_reason || "Não informado"} />}
            </dl>
          </div>

          <div className="panel p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium">Próxima ação</h2>
              {canWork && open && !o.archived && (
                <Button size="sm" variant="outline" onClick={() => setDlg("acao")}>
                  {pending ? "Substituir" : "Planejar"}
                </Button>
              )}
            </div>
            {pending ? (
              <div className="rounded-xl bg-blush p-4 text-sm">
                <div className="font-medium">{pending.description}</div>
                <div className="text-muted-foreground">{pending.due_at ? fmtDateTime(pending.due_at) : "Sem data definida"} · {(pending.owner as { full_name: string } | null)?.full_name}</div>
                {pending.notes && <div className="mt-1">{pending.notes}</div>}
                {canWork && <CancelAction id={pending.id} oppId={o.id} />}
              </div>
            ) : (
              <Empty>Nenhuma ação planejada.</Empty>
            )}
            {data.actions.filter((a) => a.status !== "pendente").length > 0 && (
              <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                {data.actions.filter((a) => a.status !== "pendente").map((a) => (
                  <div key={a.id}>
                    {a.description} · {a.status === "concluida" ? "concluída" : a.status === "cancelada" ? "cancelada" : "substituída"}
                  </div>
                ))}
              </div>
            )}
          </div>

          {data.sales.map((s) => (
            <div key={s.id} className="panel p-6">
              <h2 className="text-lg font-medium">Venda · {fmtDate(s.sale_date)}</h2>
              <table className="mt-3 w-full text-sm">
                <tbody>
                  {s.sale_items.map((it) => (
                    <tr key={it.id} className="border-t border-border">
                      <td className="py-2">{it.product}</td>
                      <td className="py-2 text-right text-muted-foreground">{Number(it.quantity)} × {brl(Number(it.unit_price))}</td>
                      <td className="py-2 text-right">{brl(Number(it.subtotal))}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-border font-medium">
                    <td className="py-2" colSpan={2}>Total</td>
                    <td className="py-2 text-right">{brl(Number(s.total))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
          {data.losses.map((l) => (
            <div key={l.id} className="panel p-6 text-sm">
              <h2 className="text-lg font-medium">Perda · {fmtDate(l.created_at)}</h2>
              <div className="mt-2">{l.reason}</div>
              {l.notes && <div className="text-muted-foreground">{l.notes}</div>}
            </div>
          ))}
        </div>

        <div className="panel p-6">
          <h2 className="mb-4 text-lg font-medium">Histórico</h2>
          {timeline.length === 0 ? (
            <Empty>Sem registros.</Empty>
          ) : (
            <ol className="relative space-y-5 border-l border-border pl-6">
              {timeline.map((t, i) => (
                <li key={i} className="text-sm">
                  <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                  <div className="text-xs text-muted-foreground">{fmtDateTime(t.at)}</div>
                  {t.node}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <Dialog open={!!dlg} onOpenChange={(v) => !v && close()}>
        <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
          {dlg === "contato" && <ContactForm o={o} pendingId={pending?.id} onDone={close} />}
          {dlg === "acao" && <ActionForm o={o} onDone={close} />}
          {dlg === "venda" && <SaleForm o={o} onDone={close} />}
          {dlg === "perda" && <LossForm o={o} onDone={close} />}
          {dlg === "responsavel" && <OwnerForm o={o} onDone={close} />}
          {dlg === "arquivar" && <ArchiveForm o={o} onDone={close} />}
          {dlg === "reabrir" && <ReopenForm o={o} onDone={close} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

function useAct(onDone: () => void, ok: string, fn: () => Promise<{ error: unknown }>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await fn();
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(ok);
      qc.invalidateQueries();
      onDone();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
}

function FormShell({ title, children, onSubmit, pending, cta }: { title: string; children: ReactNode; onSubmit: () => void; pending: boolean; cta: string }) {
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      {children}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Salvando..." : cta}
      </Button>
    </form>
  );
}

function CancelAction({ id, oppId }: { id: string; oppId: string }) {
  const m = useAct(() => {}, "Ação cancelada", async () => supabase.rpc("cancel_action", { _action: id }));
  void oppId;
  return (
    <button className="mt-3 text-xs text-destructive hover:underline" onClick={() => confirm("Cancelar esta ação planejada?") && m.mutate()}>
      Cancelar ação
    </button>
  );
}

function ContactForm({ o, pendingId, onDone }: { o: OppRow; pendingId?: string; onDone: () => void }) {
  const [f, setF] = useState({ date: toLocalInput(new Date()), type: CONTACT_TYPES[0] as string, result: "efetivo" as "efetivo" | "sem_resposta", notes: "", complete: !!pendingId });
  const m = useAct(onDone, "Atendimento registrado", async () =>
    supabase.rpc("register_interaction", {
      _opp: o.id,
      _date: new Date(f.date).toISOString(),
      _type: f.type,
      _result: f.result,
      _notes: f.notes,
      _action: (f.complete && pendingId ? pendingId : null) as string,
    }),
  );
  return (
    <FormShell title="Registrar atendimento" onSubmit={() => m.mutate()} pending={m.isPending} cta="Salvar atendimento">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Data do contato</Label>
          <Input type="datetime-local" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} required />
        </div>
        <div className="space-y-1.5">
          <Label>Tipo de contato</Label>
          <NativeSelect value={f.type} onChange={(v) => setF({ ...f, type: v })}>
            {CONTACT_TYPES.map((t) => <option key={t}>{t}</option>)}
          </NativeSelect>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Resultado</Label>
        <div className="grid grid-cols-2 gap-2">
          {([["efetivo", "Conversa efetiva"], ["sem_resposta", "Sem resposta"]] as const).map(([k, l]) => (
            <button type="button" key={k} onClick={() => setF({ ...f, result: k })} className={`rounded-xl border p-3 text-sm ${f.result === k ? "border-primary bg-blush font-medium" : "border-border"}`}>
              {l}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {f.result === "efetivo" ? "Uma conversa efetiva leva oportunidades Novas/Distribuídas para Negociação." : "Tentativas sem resposta ficam no histórico, sem mudar a etapa."}
        </p>
      </div>
      <div className="space-y-1.5">
        <Label>Observações</Label>
        <Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} maxLength={1000} />
      </div>
      {pendingId && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.complete} onChange={(e) => setF({ ...f, complete: e.target.checked })} />
          Este atendimento conclui a próxima ação planejada
        </label>
      )}
    </FormShell>
  );
}

function ActionForm({ o, onDone }: { o: OppRow; onDone: () => void }) {
  const { data: staff } = useStaff();
  const [f, setF] = useState({ desc: "", due: "", owner: o.owner_id ?? "", notes: "" });
  const m = useAct(onDone, "Próxima ação planejada", async () =>
    supabase.rpc("plan_action", { _opp: o.id, _desc: f.desc, _due: (f.due ? new Date(f.due).toISOString() : null) as string, _owner: (f.owner || null) as string, _notes: f.notes }),
  );
  return (
    <FormShell title="Planejar próxima ação" onSubmit={() => m.mutate()} pending={m.isPending} cta="Salvar ação">
      <div className="space-y-1.5">
        <Label>Descrição</Label>
        <Input required value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} maxLength={200} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Data prevista (opcional)</Label>
          <Input type="datetime-local" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Responsável</Label>
          <NativeSelect value={f.owner} onChange={(v) => setF({ ...f, owner: v })}>
            {(staff ?? []).filter((s) => s.store_id === o.store_id).map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </NativeSelect>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Observações</Label>
        <Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} maxLength={500} />
      </div>
      <p className="text-xs text-muted-foreground">Se já houver uma ação pendente, ela será substituída (e continuará no histórico).</p>
    </FormShell>
  );
}

function SaleForm({ o, onDone }: { o: OppRow; onDone: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState(() => (o.products ? o.products.split(",").map((p) => ({ product: p.trim(), quantity: 1, unit_price: 0 })) : [{ product: "", quantity: 1, unit_price: 0 }]));
  const total = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const upd = (i: number, k: string, v: string | number) => setItems(items.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const m = useAct(onDone, "Venda registrada — oportunidade Ganha", async () => supabase.rpc("register_sale", { _opp: o.id, _date: date, _items: items }));
  return (
    <FormShell title="Registrar venda" onSubmit={() => m.mutate()} pending={m.isPending} cta={`Salvar venda · ${brl(total)}`}>
      <div className="space-y-1.5">
        <Label>Data da venda</Label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>
      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={i} className="rounded-xl border border-border p-3">
            <div className="flex gap-2">
              <Input placeholder="Produto" required value={it.product} onChange={(e) => upd(i, "product", e.target.value)} />
              {items.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label="Remover">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="mt-2 grid grid-cols-3 items-center gap-2 text-sm">
              <Input type="number" min={1} step={1} value={it.quantity} onChange={(e) => upd(i, "quantity", Number(e.target.value))} aria-label="Quantidade" />
              <Input type="number" min={0} step="0.01" value={it.unit_price} onChange={(e) => upd(i, "unit_price", Number(e.target.value))} aria-label="Valor unitário" />
              <div className="text-right font-medium">{brl(it.quantity * it.unit_price)}</div>
            </div>
            <div className="mt-1 grid grid-cols-3 text-xs text-muted-foreground"><span>Quantidade</span><span>Valor unitário</span><span className="text-right">Subtotal</span></div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { product: "", quantity: 1, unit_price: 0 }])}>
          <Plus className="h-4 w-4" /> Adicionar produto
        </Button>
      </div>
      <div className="flex justify-between border-t border-border pt-3 text-lg font-medium">
        <span>Valor total</span>
        <span>{brl(total)}</span>
      </div>
    </FormShell>
  );
}

function LossForm({ o, onDone }: { o: OppRow; onDone: () => void }) {
  const [reason, setReason] = useState<string>(LOSS_REASONS[0]);
  const [other, setOther] = useState("");
  const [notes, setNotes] = useState("");
  const m = useAct(onDone, "Perda registrada", async () => supabase.rpc("register_loss", { _opp: o.id, _reason: reason === "Outro" ? other : reason, _notes: notes }));
  return (
    <FormShell title="Registrar perda" onSubmit={() => m.mutate()} pending={m.isPending} cta="Encerrar como Perdido">
      <div className="space-y-1.5">
        <Label>Motivo da perda (obrigatório)</Label>
        <NativeSelect value={reason} onChange={setReason}>
          {LOSS_REASONS.map((r) => <option key={r}>{r}</option>)}
        </NativeSelect>
        {reason === "Outro" && <Input required placeholder="Descreva o motivo" value={other} onChange={(e) => setOther(e.target.value)} maxLength={200} />}
      </div>
      <div className="space-y-1.5">
        <Label>Observações</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
      </div>
    </FormShell>
  );
}

function OwnerForm({ o, onDone }: { o: OppRow; onDone: () => void }) {
  const { data: staff } = useStaff();
  const options = (staff ?? []).filter((s) => s.store_id === o.store_id && s.id !== o.owner_id && (s.roles.includes("vendedor") || s.roles.includes("gerente")));
  const [owner, setOwner] = useState("");
  const [note, setNote] = useState("");
  const m = useAct(onDone, o.owner_id ? "Responsabilidade transferida" : "Oportunidade distribuída", async () => supabase.rpc("assign_opportunity", { _opp: o.id, _owner: owner, _note: note }));
  return (
    <FormShell title={o.owner_id ? "Transferir responsabilidade" : "Distribuir oportunidade"} onSubmit={() => m.mutate()} pending={m.isPending} cta="Confirmar">
      <div className="space-y-1.5">
        <Label>Novo responsável</Label>
        <NativeSelect value={owner} onChange={setOwner} required>
          <option value="">Selecione...</option>
          {options.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label>Observação</Label>
        <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
      </div>
      <p className="text-xs text-muted-foreground">Todo o histórico é preservado.</p>
    </FormShell>
  );
}

function ArchiveForm({ o, onDone }: { o: OppRow; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const m = useAct(onDone, o.archived ? "Oportunidade desarquivada" : "Oportunidade arquivada", async () => supabase.rpc("set_archived", { _opp: o.id, _archived: !o.archived, _reason: reason }));
  return (
    <FormShell title={o.archived ? "Desarquivar oportunidade" : "Arquivar oportunidade"} onSubmit={() => m.mutate()} pending={m.isPending} cta="Confirmar">
      <div className="space-y-1.5">
        <Label>Justificativa (opcional)</Label>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
      </div>
      {!o.archived && <p className="text-xs text-muted-foreground">Arquivar não é registrar perda: a etapa no funil não muda.</p>}
    </FormShell>
  );
}

function ReopenForm({ o, onDone }: { o: OppRow; onDone: () => void }) {
  const [note, setNote] = useState("");
  const m = useAct(onDone, "Oportunidade reaberta", async () => supabase.rpc("reopen_opportunity", { _opp: o.id, _note: note }));
  return (
    <FormShell title="Reabrir oportunidade" onSubmit={() => m.mutate()} pending={m.isPending} cta="Reabrir">
      <div className="space-y-1.5">
        <Label>Motivo (opcional)</Label>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
      </div>
      <p className="text-xs text-muted-foreground">Vendas, perdas e atendimentos anteriores continuam no histórico.</p>
    </FormShell>
  );
}
