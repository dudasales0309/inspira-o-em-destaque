import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Role = Database["public"]["Enums"]["app_role"];
export type Stage = Database["public"]["Enums"]["opp_stage"];

export const ROLE_LABEL: Record<Role, string> = {
  vendedor: "Vendedor",
  gerente: "Gerente",
  supervisor: "Supervisor",
  diretor: "Diretor",
  marketing: "Marketing",
};

export const STAGES: Stage[] = ["novo", "distribuido", "negociacao", "ganho", "perdido"];
export const STAGE_LABEL: Record<Stage, string> = {
  novo: "Novo",
  distribuido: "Distribuído",
  negociacao: "Negociação",
  ganho: "Ganho",
  perdido: "Perdido",
};
export const ORIGINS = ["Instagram", "Indicação", "Site", "Visita presencial"];
export const CONTACT_TYPES = ["Ligação", "WhatsApp", "Visita na loja", "E-mail"];
export const LOSS_REASONS = [
  "Preço acima do orçamento",
  "Prazo de entrega",
  "Comprou na concorrência",
  "Desistiu da compra",
  "Outro",
];

export type Me = {
  id: string;
  full_name: string;
  store_id: string | null;
  store_name: string | null;
  roles: Role[];
  role: Role;
  canManage: boolean; // distribuir, transferir, arquivar, reabrir
  isGlobal: boolean; // todas as lojas
  canReports: boolean;
  isOperational: boolean; // acessa registros individuais
};

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async (): Promise<Me> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("full_name, store_id, store:stores(name)").eq("id", u.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", u.user.id),
      ]);
      const roles = (r ?? []).map((x) => x.role);
      const has = (x: Role) => roles.includes(x);
      const isGlobal = has("supervisor") || has("diretor");
      return {
        id: u.user.id,
        full_name: p?.full_name || u.user.email || "",
        store_id: p?.store_id ?? null,
        store_name: (p?.store as { name: string } | null)?.name ?? null,
        roles,
        role: roles[0] ?? "vendedor",
        canManage: isGlobal || has("gerente"),
        isGlobal,
        canReports: isGlobal || has("gerente") || has("marketing"),
        isOperational: isGlobal || has("gerente") || has("vendedor"),
      };
    },
    staleTime: 60_000,
  });
}

export function useStores() {
  return useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
    staleTime: 300_000,
  });
}

export function useStaff() {
  return useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const [{ data: p, error }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, store_id").order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (error) throw error;
      return (p ?? []).map((x) => ({ ...x, roles: (r ?? []).filter((y) => y.user_id === x.id).map((y) => y.role) }));
    },
    staleTime: 120_000,
  });
}

export const OPP_SELECT =
  "id, products, origin, stage, archived, archived_reason, created_at, closed_at, store_id, owner_id, client_id, client:clients(id, full_name, phone), store:stores(name), owner:profiles!opportunities_owner_id_fkey(full_name), next_actions(id, description, due_at, status, owner_id)";

export type OppRow = {
  id: string;
  products: string;
  origin: string;
  stage: Stage;
  archived: boolean;
  archived_reason: string | null;
  created_at: string;
  closed_at: string | null;
  store_id: string;
  owner_id: string | null;
  client_id: string;
  client: { id: string; full_name: string; phone: string } | null;
  store: { name: string } | null;
  owner: { full_name: string } | null;
  next_actions: { id: string; description: string; due_at: string | null; status: string; owner_id: string | null }[];
};

export function useOpportunities() {
  return useQuery({
    queryKey: ["opportunities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("opportunities").select(OPP_SELECT).order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as OppRow[];
    },
  });
}

export function pendingAction(o: OppRow) {
  return o.next_actions.find((a) => a.status === "pendente") ?? null;
}

export function isOpen(o: OppRow) {
  return o.stage !== "ganho" && o.stage !== "perdido";
}

/** Classifica a rotina: hoje, atrasada, sem data, sem ação, futura. */
export function routineBucket(o: OppRow, now = new Date()): "hoje" | "atrasada" | "sem_data" | "sem_acao" | "futura" {
  const a = pendingAction(o);
  if (!a) return "sem_acao";
  if (!a.due_at) return "sem_data";
  const d = new Date(a.due_at);
  const sod = new Date(now);
  sod.setHours(0, 0, 0, 0);
  const eod = new Date(sod);
  eod.setDate(eod.getDate() + 1);
  if (d < sod) return "atrasada";
  if (d < eod) return d < now ? "atrasada" : "hoje";
  return "futura";
}

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString("pt-BR") : "—");
export const fmtDateTime = (s: string | null) =>
  s ? new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export function errMsg(e: unknown) {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: string }).message);
  return "Algo deu errado. Tente novamente.";
}

export function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
