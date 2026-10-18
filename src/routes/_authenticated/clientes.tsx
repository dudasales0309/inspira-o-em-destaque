import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Empty, Loading, PageHeader, StageBadge } from "@/components/crm/common";
import { NativeSelect } from "@/components/crm/native-select";
import { NewOpportunityButton } from "@/components/crm/new-opportunity";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ORIGINS, errMsg, fmtDate, useOpportunities } from "@/lib/crm";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({ meta: [{ title: "Clientes · Marrocos" }, { name: "description", content: "Cadastro e consulta de clientes." }] }),
  component: Clientes,
});

type Client = { id: string; full_name: string; phone: string; origin: string; interests: string; created_at: string };

function Clientes() {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Client | "new" | null>(null);
  const [viewing, setViewing] = useState<Client | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["clients", "list", q],
    queryFn: async () => {
      let r = supabase.from("clients").select("*").order("full_name").limit(200);
      if (q.trim()) r = r.or(`full_name.ilike.%${q.trim()}%,phone.ilike.%${q.trim()}%`);
      const { data, error } = await r;
      if (error) throw error;
      return data as Client[];
    },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Cadastro"
        title="Clientes"
        subtitle="Pessoas interessadas em comprar móveis."
        actions={
          <Button size="lg" onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" /> Novo cliente
          </Button>
        }
      />
      <div className="panel p-5">
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Pesquisar por nome ou telefone" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {isLoading ? (
          <Loading />
        ) : !data?.length ? (
          <Empty>Nenhum cliente encontrado.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-normal">Nome</th>
                  <th className="px-3 py-2 font-normal">Telefone</th>
                  <th className="px-3 py-2 font-normal">Origem</th>
                  <th className="px-3 py-2 font-normal">Produtos de interesse</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.id} className="cursor-pointer border-t border-border hover:bg-muted/50" onClick={() => setViewing(c)}>
                    <td className="px-3 py-3 font-medium">{c.full_name}</td>
                    <td className="px-3 py-3">{c.phone}</td>
                    <td className="px-3 py-3">{c.origin}</td>
                    <td className="px-3 py-3 text-muted-foreground">{c.interests}</td>
                    <td className="px-3 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(c);
                        }}
                      >
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Novo cliente" : "Editar cliente"}</DialogTitle>
          </DialogHeader>
          {editing && <ClientForm client={editing === "new" ? null : editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">{viewing && <ClientDetail c={viewing} />}</DialogContent>
      </Dialog>
    </div>
  );
}

function ClientForm({ client, onDone }: { client: Client | null; onDone: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    full_name: client?.full_name ?? "",
    phone: client?.phone ?? "",
    origin: (client?.origin || ORIGINS[0]) as string,
    interests: client?.interests ?? "",
  });
  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("save_client", {
        _id: (client?.id ?? null) as string,
        _full_name: f.full_name,
        _phone: f.phone,
        _origin: f.origin,
        _interests: f.interests,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente salvo");
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["opportunities"] });
      onDone();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        m.mutate();
      }}
    >
      <div className="space-y-1.5">
        <Label>Nome completo</Label>
        <Input required maxLength={120} value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Telefone</Label>
          <Input maxLength={30} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Origem do contato</Label>
          <NativeSelect value={f.origin} onChange={(v) => setF({ ...f, origin: v })}>
            {ORIGINS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Produtos de interesse</Label>
        <Input maxLength={300} value={f.interests} onChange={(e) => setF({ ...f, interests: e.target.value })} />
      </div>
      <Button type="submit" className="w-full" disabled={m.isPending}>
        Salvar
      </Button>
    </form>
  );
}

function ClientDetail({ c }: { c: Client }) {
  const { data: opps } = useOpportunities();
  const mine = (opps ?? []).filter((o) => o.client_id === c.id);
  return (
    <div>
      <DialogHeader>
        <DialogTitle className="text-2xl">{c.full_name}</DialogTitle>
      </DialogHeader>
      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-muted-foreground">Telefone</dt>
          <dd>{c.phone || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Origem</dt>
          <dd>{c.origin || "—"}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted-foreground">Produtos de interesse</dt>
          <dd>{c.interests || "—"}</dd>
        </div>
      </dl>
      <div className="mt-6 flex items-center justify-between">
        <h3 className="font-medium">Oportunidades que você pode ver</h3>
        <NewOpportunityButton clientId={c.id} label="Nova" />
      </div>
      <div className="mt-3 space-y-2">
        {mine.length === 0 && <Empty>Nenhuma oportunidade visível para este cliente.</Empty>}
        {mine.map((o) => (
          <Link key={o.id} to="/oportunidades/$id" params={{ id: o.id }} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm hover:bg-muted/50">
            <div>
              <div className="font-medium">{o.products}</div>
              <div className="text-muted-foreground">
                {o.store?.name} · {fmtDate(o.created_at)}
              </div>
            </div>
            <StageBadge stage={o.stage} />
          </Link>
        ))}
      </div>
    </div>
  );
}
