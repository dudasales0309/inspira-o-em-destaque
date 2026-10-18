
CREATE OR REPLACE FUNCTION public.assign_opportunity(_opp uuid, _owner uuid, _note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o opportunities;
BEGIN
  SELECT * INTO o FROM opportunities WHERE id = _opp;
  IF NOT FOUND OR NOT public.can_manage_store(o.store_id) THEN RAISE EXCEPTION 'Sem permissão para distribuir/transferir'; END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles p JOIN user_roles r ON r.user_id = p.id WHERE p.id = _owner AND p.store_id = o.store_id AND r.role IN ('vendedor','gerente')) THEN RAISE EXCEPTION 'Responsável inválido para esta loja'; END IF;
  IF o.owner_id = _owner THEN RAISE EXCEPTION 'Esta pessoa já é a responsável'; END IF;
  UPDATE opportunities SET owner_id = _owner, stage = CASE WHEN stage = 'novo' THEN 'distribuido'::opp_stage ELSE stage END WHERE id = _opp;
  UPDATE next_actions SET owner_id = _owner, updated_at = now() WHERE opportunity_id = _opp AND status = 'pendente';
  INSERT INTO opportunity_events(opportunity_id, kind, description, from_user, to_user, created_by)
  VALUES (_opp, CASE WHEN o.owner_id IS NULL THEN 'distribuicao' ELSE 'transferencia' END, coalesce(nullif(trim(_note),''), CASE WHEN o.owner_id IS NULL THEN 'Oportunidade distribuída' ELSE 'Responsabilidade transferida' END), o.owner_id, _owner, auth.uid());
END $$;

DO $seed$
DECLARE
  store_names text[] := ARRAY['Loja 1 · Centro','Loja 2 · Jardins','Loja 3 · Shopping Norte','Loja 4 · Alphaville'];
  gnames text[] := ARRAY['Gisele Moraes','Fernando Lima','Juliana Rocha','Marcos Teixeira'];
  vnames text[] := ARRAY['Ana Paula Souza','Bruno Carvalho','Carla Mendes','Diego Ferreira','Elisa Martins','Felipe Ramos','Helena Castro','Igor Batista'];
  firsts text[] := ARRAY['Mariana','Rafael','Beatriz','Lucas','Fernanda','Gustavo','Larissa','Thiago','Renata','Pedro','Aline','Rodrigo','Vanessa','Eduardo','Tatiana','Leonardo','Priscila','André','Simone','Caio','Débora','Vinícius','Letícia','Henrique','Sabrina','Otávio','Natália','Fábio','Isabela','Murilo','Paula','Sérgio'];
  lasts text[] := ARRAY['Oliveira','Santos','Pereira','Costa','Ribeiro','Gomes','Barbosa','Araújo','Cardoso','Pinto','Moura','Freitas'];
  origins text[] := ARRAY['Instagram','Indicação','Site','Visita presencial'];
  prods text[] := ARRAY['Sofá 3 lugares','Mesa de jantar','Cadeira estofada','Rack para sala','Poltrona','Cama casal','Guarda-roupa','Tapete','Luminária','Aparador'];
  prices numeric[] := ARRAY[4200,3600,650,1900,2100,3800,5200,1200,480,1700];
  reasons text[] := ARRAY['Preço acima do orçamento','Prazo de entrega','Comprou na concorrência','Desistiu da compra'];
  types text[] := ARRAY['Ligação','WhatsApp','Visita na loja','E-mail'];
  stages opp_stage[] := ARRAY['novo','distribuido','negociacao','negociacao','ganho','perdido','distribuido','negociacao','ganho','negociacao']::opp_stage[];
  acts text[] := ARRAY['Retornar atendimento','Enviar orçamento','Convidar para visita na loja','Confirmar medidas'];
  sids uuid[] := '{}'; sellers uuid[] := '{}';
  i int; j int; k int; uid uuid; cid uuid; oid uuid; sale uuid; sid uuid; own uuid; st opp_stage; org text; p1 int; p2 int; cr timestamptz; cl timestamptz; due timestamptz;
  base timestamptz := date_trunc('day', now()) + interval '12 hours';
  PROCEDURE_DUMMY int;
BEGIN
  FOR i IN 1..4 LOOP
    INSERT INTO stores(name) VALUES (store_names[i]) RETURNING id INTO sid; sids := sids || sid;
  END LOOP;

  -- demo users: (email, name, role, store index or 0)
  FOR i IN 1..15 LOOP
    uid := gen_random_uuid();
    DECLARE em text; nm text; rl app_role; si int := 0;
    BEGIN
      IF i = 1 THEN em := 'diretor@demo.com'; nm := 'Ricardo Almeida'; rl := 'diretor';
      ELSIF i = 2 THEN em := 'supervisor@demo.com'; nm := 'Patrícia Nunes'; rl := 'supervisor';
      ELSIF i = 3 THEN em := 'marketing@demo.com'; nm := 'Camila Duarte'; rl := 'marketing';
      ELSIF i <= 7 THEN si := i - 3; em := 'gerente' || si || '@demo.com'; nm := gnames[si]; rl := 'gerente';
      ELSE k := i - 7; si := (k + 1) / 2; em := 'vendedor' || k || '@demo.com'; nm := vnames[k]; rl := 'vendedor';
      END IF;
      INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change,email_change_token_current,reauthentication_token,phone_change,phone_change_token)
      VALUES ('00000000-0000-0000-0000-000000000000',uid,'authenticated','authenticated',em,extensions.crypt('Demo@1234',extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,jsonb_build_object('full_name',nm),now(),now(),'','','','','','','','');
      INSERT INTO auth.identities(id,user_id,provider_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
      VALUES (gen_random_uuid(),uid,uid::text,jsonb_build_object('sub',uid::text,'email',em,'email_verified',true),'email',now(),now(),now());
      INSERT INTO profiles(id,full_name,store_id) VALUES (uid,nm,CASE WHEN si>0 THEN sids[si] END);
      INSERT INTO user_roles(user_id,role) VALUES (uid,rl);
      IF rl = 'vendedor' THEN sellers := sellers || uid; END IF;
    END;
  END LOOP;

  FOR i IN 1..32 LOOP
    org := origins[1 + (i*7) % 4];
    p1 := 1 + (i*3) % 10; p2 := 1 + (i*7+2) % 10; IF p2 = p1 THEN p2 := 1 + p1 % 10; END IF;
    INSERT INTO clients(full_name,phone,origin,interests,created_at)
    VALUES (firsts[i] || ' ' || lasts[1 + (i*5) % 12], '(11) 9' || (1000 + (i*137)%9000) || '-' || (1000 + (i*571)%9000), org, prods[p1] || ', ' || prods[p2], base - interval '60 days')
    RETURNING id INTO cid;
    FOR j IN 1..(CASE WHEN i % 8 = 0 THEN 2 ELSE 1 END) LOOP
      k := 1 + ((i - 1) % 4); sid := sids[k];
      st := stages[1 + (i*3 + j) % 10];
      own := CASE WHEN st = 'novo' THEN NULL ELSE sellers[(k-1)*2 + 1 + (i % 2)] END;
      cr := base - ((1 + (i*11 + j*5) % 55) || ' days')::interval;
      cl := CASE WHEN st IN ('ganho','perdido') THEN cr + interval '5 days' END;
      INSERT INTO opportunities(client_id,store_id,owner_id,products,origin,stage,created_at,closed_at,archived,archived_reason,archived_at)
      VALUES (cid,sid,own,prods[p1] || ', ' || prods[p2],org,st,cr,cl,i=30,CASE WHEN i=30 THEN 'Cliente pediu para retomar só em 2027' END,CASE WHEN i=30 THEN now() END)
      RETURNING id INTO oid;
      INSERT INTO opportunity_events(opportunity_id,kind,description,created_at) VALUES (oid,'criacao','Oportunidade cadastrada',cr);
      IF own IS NOT NULL THEN
        INSERT INTO opportunity_events(opportunity_id,kind,description,to_user,created_at) VALUES (oid,'distribuicao','Oportunidade distribuída',own,cr + interval '2 hours');
        INSERT INTO interactions(opportunity_id,contact_date,user_id,contact_type,result,notes) VALUES (oid,cr + interval '1 day',own,'Ligação','sem_resposta','Cliente não atendeu.');
      END IF;
      IF st IN ('negociacao','ganho','perdido') THEN
        INSERT INTO interactions(opportunity_id,contact_date,user_id,contact_type,result,notes) VALUES (oid,cr + interval '2 days',own,types[1 + i % 4],'efetivo','Conversa sobre medidas, acabamentos e prazo de entrega.');
      END IF;
      IF st = 'ganho' THEN
        INSERT INTO sales(opportunity_id,store_id,sale_date,total) VALUES (oid,sid,(cl)::date,0) RETURNING id INTO sale;
        INSERT INTO sale_items(sale_id,product,quantity,unit_price) VALUES (sale,prods[p1],1,prices[p1]),(sale,prods[p2],1 + i % 3,prices[p2]);
        UPDATE sales SET total = (SELECT sum(subtotal) FROM sale_items WHERE sale_id = sale) WHERE id = sale;
        INSERT INTO opportunity_events(opportunity_id,kind,description,created_at) VALUES (oid,'ganho','Venda registrada',cl);
      ELSIF st = 'perdido' THEN
        INSERT INTO losses(opportunity_id,reason,created_at) VALUES (oid,reasons[1 + i % 4],cl);
        INSERT INTO opportunity_events(opportunity_id,kind,description,created_at) VALUES (oid,'perdido','Perda registrada: ' || reasons[1 + i % 4],cl);
      END IF;
      IF st IN ('distribuido','negociacao') AND i % 5 <> 0 THEN
        due := CASE i % 4 WHEN 0 THEN NULL WHEN 1 THEN base + ((1 + i % 5) || ' hours')::interval WHEN 2 THEN base - ((1 + i % 4) || ' days')::interval ELSE base + ((1 + i % 7) || ' days')::interval END;
        INSERT INTO next_actions(opportunity_id,description,due_at,owner_id) VALUES (oid,acts[1 + i % 4],due,own);
      END IF;
    END LOOP;
  END LOOP;
END $seed$;
