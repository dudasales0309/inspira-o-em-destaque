import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ORIGINS, errMsg, useMe, useStaff, useStores } from "@/lib/crm";
import { NativeSelect } from "./native-select";

export function NewOpportunityButton({ clientId, label = "Nova oportunidade" }: { clientId?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg">
          <Plus className="h-4 w-4" /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova oportunidade</DialogTitle>
        </DialogHeader>
        {open && <NewOpportunityForm clientId={clientId} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function NewOpportunityForm({ clientId, onDone }: { clientId?: string; onDone: () => void }) {
  const { data: me } = useMe();
  const { data: stores } = useStores();
  const { data: staff } = useStaff();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"existing" | "new">(clientId ? "existing" : "existing");
  const [search, setSearch] = useState("");
  const [selClient, setSelClient] = useState<string>(clientId ?? "");
  const [nc, setNc] = useState({ full_name: "", phone: "", origin: ORIGINS[0], interests: "" });
  const [storeId, setStoreId] = useState("");
  const [products, setProducts] = useState("");
  const [origin, setOrigin] = useState(ORIGINS[0]);
  const [owner, setOwner] = useState("");
  const [actDesc, setActDesc] = useState("");
  const [actDue, setActDue] = useState("");

  useEffect(() => {
    if (!storeId && me) setStoreId(me.store_id ?? stores?.[0]?.id ?? "");
  }, [me, stores, storeId]);

  const { data: clients } = useQuery({
    queryKey: ["clients", "search", search],
    queryFn: async () => {
      let q = supabase.from("clients").select("id, full_name, phone, origin, interests").order("full_name").limit(20);
      if (search.trim()) q = q.or(`full_name.ilike.%${search.trim()}%,phone.ilike.%${search.trim()}%`);
      const { data } = await q;
      return data ?? [];
    },
  });

  const chosen = clients?.find((c) => c.id === selClient);
  useEffect(() => {
    if (chosen) {
      if (!products) setProducts(chosen.interests);
      if (chosen.origin) setOrigin(chosen.origin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosen?.id]);

  const owners = useMemo(
    () => (staff ?? []).filter((s) => s.store_id === storeId && (s.roles.includes("vendedor") || s.roles.includes("gerente"))),
    [staff, storeId],
  );

  const m = useMutation({
    mutationFn: async () => {
      let cid = selClient;
      if (mode === "new") {
        if (!nc.full_name.trim()) throw new Error("Informe o nome do cliente");
        const { data, error } = await supabase.rpc("save_client", {
          _id: null as unknown as string,
          _full_name: nc.full_name,
          _phone: nc.phone,
          _origin: nc.origin,
          _interests: nc.interests,
        });
        if (error) throw error;
        cid = data as string;
      }
      if (!cid) throw new Error("Selecione um cliente");
      const { data, error } = await supabase.rpc("create_opportunity", {
        _client: cid,
        _store: storeId,
        _products: products || nc.interests,
        _origin: mode === "new" ? nc.origin : origin,
        _owner: (me?.canManage ? owner || null : me?.id) as string,
        _action_desc: actDesc,
        _action_due: (actDue ? new Date(actDue).toISOString() : null) as string,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (id) => {
      toast.success("Oportunidade cadastrada");
      qc.invalidateQueries();
      onDone();
      navigate({ to: "/oportunidades/$id", params: { id } });
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        m.mutate();
      }}
    >
      {!clientId && (
        <div className="flex gap-2 rounded-xl bg-muted p-1">
          {(["existing", "new"] as const).map((k) => (
            <button
              type="button"
              key={k}
              onClick={() => setMode(k)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${mode === k ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            >
              {k === "existing" ? "Cliente já cadastrado" : "Novo cliente"}
            </button>
          ))}
        </div>
      )}

      {mode === "existing" ? (
        <div className="space-y-2">
          <Label>Cliente</Label>
          {!clientId && <Input placeholder="Buscar por nome ou telefone" value={search} onChange={(e) => setSearch(e.target.value)} />}
          <NativeSelect value={selClient} onChange={setSelClient} required>
            <option value="">Selecione...</option>
            {clients?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name} · {c.phone}
              </option>
            ))}
          </NativeSelect>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Nome completo</Label>
            <Input required value={nc.full_name} onChange={(e) => setNc({ ...nc, full_name: e.target.value })} maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label>Telefone</Label>
            <Input value={nc.phone} onChange={(e) => setNc({ ...nc, phone: e.target.value })} maxLength={30} />
          </div>
          <div className="space-y-1.5">
            <Label>Origem do contato</Label>
            <NativeSelect value={nc.origin} onChange={(v) => setNc({ ...nc, origin: v })}>
              {ORIGINS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Produtos de interesse</Label>
            <Input value={nc.interests} onChange={(e) => setNc({ ...nc, interests: e.target.value })} maxLength={300} />
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Produtos desta oportunidade</Label>
          <Input value={products} onChange={(e) => setProducts(e.target.value)} placeholder="Ex.: Sofá 3 lugares, Tapete" maxLength={300} />
        </div>
        <div className="space-y-1.5">
          <Label>Loja</Label>
          <NativeSelect value={storeId} onChange={setStoreId} disabled={!me?.isGlobal}>
            {stores?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        {mode === "existing" && (
          <div className="space-y-1.5">
            <Label>Origem</Label>
            <NativeSelect value={origin} onChange={setOrigin}>
              {ORIGINS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </NativeSelect>
          </div>
        )}
        {me?.canManage && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Responsável</Label>
            <NativeSelect value={owner} onChange={setOwner}>
              <option value="">Sem responsável (fica como Novo)</option>
              {owners.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </NativeSelect>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border p-4">
        <div className="text-sm font-medium">Retorno inicial (opcional)</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
          <Input placeholder="Próxima ação planejada" value={actDesc} onChange={(e) => setActDesc(e.target.value)} maxLength={200} />
          <Input type="datetime-local" value={actDue} onChange={(e) => setActDue(e.target.value)} />
        </div>
      </div>

      <Textarea className="hidden" readOnly />
      <Button type="submit" className="w-full" size="lg" disabled={m.isPending}>
        {m.isPending ? "Salvando..." : "Cadastrar oportunidade"}
      </Button>
    </form>
  );
}
