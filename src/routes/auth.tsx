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

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");

  async function signUp() {
    if (password.length < 8) return toast.error("A senha precisa ter pelo menos 8 caracteres.");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: window.location.origin, data: { full_name: name.trim() } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Cadastro feito! Confirme pelo link enviado ao seu e-mail.");
    setMode("login");
  }

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
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
          <h1 className="mt-12 text-3xl font-semibold tracking-tight">{mode === "login" ? "Bem-vindo de volta" : "Criar acesso"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "login" ? "Entre com seu e-mail e senha." : "O primeiro cadastro vira Diretor. Os demais aguardam a liberação do Diretor."}
          </p>
          <form
            className="mt-8 space-y-4"
            onSubmit={(ev) => {
              ev.preventDefault();
              if (mode === "login") signIn();
              else signUp();
            }}
          >
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome completo</Label>
                <Input id="name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw">Senha</Label>
              <Input id="pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
            </div>
            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <button type="button" className="mt-6 text-sm text-primary hover:underline" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
            {mode === "login" ? "Ainda não tem acesso? Cadastre-se" : "Já tenho conta — entrar"}
          </button>
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
