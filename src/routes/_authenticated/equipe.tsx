import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Empty, Loading, PageHeader } from "@/components/crm/common";
import { NativeSelect } from "@/components/crm/native-select";
import { Button } from "@/components/ui/button";
import { ROLE_LABEL, errMsg, useMe, useStores, type Role } from "@/lib/crm";

export const Route = createFileRoute("/_authenticated/equipe")({
  head: () => ({ meta: [{ title: "Equipe · Marrocos" }, { name: "description", content: "Perfis e lojas da equipe." }] }),
  component: Equipe,
});

const ROLES: Role[] = ["vendedor", "gerente", "supervisor", "diretor", "marketing"];

function Equipe() {
  const { data: me } = useMe();
  const { data, isLoading } = useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, store_id").order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      return (p ?? []).map((x) => ({ ...x, role: (r ?? []).find((y) => y.user_id === x.id)?.role ?? null }));
    },
  });
  if (!me || isLoading) return <Loading />;
  if (!me.roles.includes("diretor")) return <Empty>Somente o Diretor acessa esta página.</Empty>;
  return (
    <div>
      <PageHeader eyebrow="Acesso" title="Equipe" subtitle="Libere novos cadastros definindo o perfil e a loja de cada pessoa." />
      <div className="panel divide-y divide-border">
        {data?.map((u) => <Row key={u.id} u={u} />)}
      </div>
    </div>
  );
}

function Row({ u }: { u: { id: string; full_name: string; store_id: string | null; role: Role | null } }) {
  const { data: stores } = useStores();
  const qc = useQueryClient();
  const [role, setRole] = useState<string>(u.role ?? "");
  const [store, setStore] = useState(u.store_id ?? "");
  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("set_user_access", { _user: u.id, _role: role as Role, _store: (store || null) as string });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Acesso atualizado");
      qc.invalidateQueries();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const needsStore = role === "vendedor" || role === "gerente";
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="flex-1">
        <div className="font-medium">{u.full_name || "Sem nome"}</div>
        <div className="text-xs text-muted-foreground">{u.role ? ROLE_LABEL[u.role] : "Aguardando liberação"}</div>
      </div>
      <NativeSelect className="sm:w-40" value={role} onChange={setRole}>
        <option value="">Perfil...</option>
        {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
      </NativeSelect>
      <NativeSelect className="sm:w-56" value={needsStore ? store : ""} onChange={setStore} disabled={!needsStore}>
        <option value="">{needsStore ? "Loja..." : "Todas as lojas"}</option>
        {stores?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </NativeSelect>
      <Button size="sm" disabled={!role || m.isPending} onClick={() => m.mutate()}>Salvar</Button>
    </div>
  );
}
