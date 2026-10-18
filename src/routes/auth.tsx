import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Brand, BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar · Marrocos Gestão Comercial" },
      { name: "description", content: "Acesse o CRM comercial das lojas Marrocos." },
      { property: "og:title", content: "Entrar · Marrocos Gestão Comercial" },
      { property: "og:description", content: "Acesse o CRM comercial das lojas Marrocos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const DEMO = [
  { label: "Vendedor · Loja 1", email: "vendedor1@demo.com" },
  { label: "Gerente · Loja 1", email: "gerente1@demo.com" },
  { label: "Supervisor", email: "supervisor@demo.com" },
  { label: "Diretor", email: "diretor@demo.com" },
  { label: "Marketing", email: "marketing@demo.com" },
];

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn(e?: string, p?: string) {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: (e ?? email).trim(), password: p ?? password });
    setLoading(false);
    if (error) {
      toast.error("E-mail ou senha incorretos.");
      return;
    }
    navigate({ to: "/painel", replace: true });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Brand />
          <h1 className="mt-12 text-3xl font-semibold tracking-tight">Bem-vindo de volta</h1>
          <p className="mt-2 text-sm text-muted-foreground">Entre com seu e-mail e senha para acessar a carteira da loja.</p>
          <form
            className="mt-8 space-y-4"
            onSubmit={(ev) => {
              ev.preventDefault();
              signIn();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw">Senha</Label>
              <Input id="pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
            </div>
            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="mt-10">
            <div className="eyebrow">Contas de demonstração · senha Demo@1234</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {DEMO.map((d) => (
                <Button key={d.email} variant="outline" size="sm" disabled={loading} onClick={() => signIn(d.email, "Demo@1234")}>
                  {d.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="hidden items-center justify-center bg-primary text-primary-foreground lg:flex">
        <div className="max-w-md px-12">
          <BrandMark className="h-20 w-24" />
          <p className="mt-10 text-3xl font-medium leading-snug">Cada cliente tem uma história. Preserve todas elas.</p>
          <p className="mt-4 text-primary-foreground/70">Oportunidades, atendimentos, próximas ações e vendas das quatro lojas em um só lugar.</p>
        </div>
      </div>
    </div>
  );
}
