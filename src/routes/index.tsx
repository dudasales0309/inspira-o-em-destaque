import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    throw redirect({ to: data.session ? "/painel" : "/auth" });
  },
  head: () => ({
    meta: [
      { title: "Marrocos · Gestão Comercial" },
      { name: "description", content: "CRM de atendimento comercial para quatro lojas de móveis e decoração." },
      { property: "og:title", content: "Marrocos · Gestão Comercial" },
      { property: "og:description", content: "CRM de atendimento comercial para quatro lojas de móveis e decoração." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
