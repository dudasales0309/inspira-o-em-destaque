import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BarChart3, ShieldCheck, CalendarCheck, Columns3, Home, LogOut, Menu, Target, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "@/components/brand";
import { ROLE_LABEL, useMe } from "@/lib/crm";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: AppShell,
});

const NAV = [
  { to: "/painel", label: "Painel inicial", icon: Home, op: false },
  { to: "/clientes", label: "Clientes", icon: Users, op: true },
  { to: "/oportunidades", label: "Oportunidades", icon: Target, op: true },
  { to: "/funil", label: "Funil de vendas", icon: Columns3, op: true },
  { to: "/rotina", label: "Minha Rotina", icon: CalendarCheck, op: true },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3, op: false, reports: true },
  { to: "/equipe", label: "Equipe", icon: ShieldCheck, op: false, director: true },
] as const;

function AppShell() {
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const items = NAV.filter((n) => (n.op ? me?.isOperational : true) && (!("reports" in n) || me?.canReports) && (!("director" in n) || me?.roles.includes("diretor")));
  const initials = (me?.full_name ?? "").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  const sidebar = (
    <div className="flex h-full flex-col px-5 py-8">
      <div className="px-2">
        <Brand />
      </div>
      <div className="eyebrow mt-12 px-3 font-semibold">CRM Essencial</div>
      <nav className="mt-3 space-y-1">
        {items.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-[0.95rem] font-medium text-foreground transition-colors hover:bg-sidebar-accent"
            activeProps={{ className: "!bg-primary !text-primary-foreground" }}
          >
            <n.icon className="h-5 w-5" strokeWidth={1.6} />
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="mt-8 px-3 text-sm text-muted-foreground">{me?.store_name ?? (me?.isGlobal || me?.role === "marketing" ? "Todas as lojas" : "")}</div>
      <div className="mt-auto border-t border-sidebar-border pt-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blush text-sm font-semibold text-primary">{initials}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{me?.full_name}</div>
            <div className="truncate text-xs text-muted-foreground">{me ? me.roles.map((r) => ROLE_LABEL[r]).join(", ") : ""}</div>
          </div>
          <button onClick={signOut} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Sair">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-72">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-sidebar-border bg-sidebar lg:block">{sidebar}</aside>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-sidebar px-4 py-3 lg:hidden">
        <Brand />
        <button onClick={() => setOpen(true)} aria-label="Abrir menu" className="rounded-lg p-2 hover:bg-muted">
          <Menu className="h-5 w-5" />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-foreground/30" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-sidebar">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-3 rounded-lg p-2 hover:bg-muted" aria-label="Fechar menu">
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}
      <main className={cn("mx-auto max-w-[1400px] px-4 py-6 sm:px-8 lg:py-10")}>
        {me && me.roles.length === 0 ? (
          <div className="mx-auto max-w-md py-24 text-center">
            <h1 className="text-2xl font-semibold">Cadastro aguardando liberação</h1>
            <p className="mt-2 text-muted-foreground">O Diretor precisa definir seu perfil e sua loja. Depois disso, é só entrar novamente.</p>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
