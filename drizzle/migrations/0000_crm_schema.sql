
CREATE TYPE public.app_role AS ENUM ('vendedor','gerente','supervisor','diretor','marketing');
CREATE TYPE public.opp_stage AS ENUM ('novo','distribuido','negociacao','ganho','perdido');
CREATE TYPE public.contact_result AS ENUM ('sem_resposta','efetivo');
CREATE TYPE public.action_status AS ENUM ('pendente','concluida','cancelada','substituida');

CREATE TABLE public.stores (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.profiles (id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, full_name text NOT NULL DEFAULT '', store_id uuid REFERENCES public.stores(id), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role public.app_role NOT NULL, UNIQUE(user_id, role));
CREATE TABLE public.clients (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text NOT NULL, phone text NOT NULL DEFAULT '', origin text NOT NULL DEFAULT '', interests text NOT NULL DEFAULT '', created_by uuid, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  store_id uuid NOT NULL REFERENCES public.stores(id),
  owner_id uuid REFERENCES public.profiles(id),
  products text NOT NULL DEFAULT '',
  origin text NOT NULL DEFAULT '',
  stage public.opp_stage NOT NULL DEFAULT 'novo',
  archived boolean NOT NULL DEFAULT false,
  archived_reason text, archived_at timestamptz, archived_by uuid,
  closed_at timestamptz,
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.interactions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), opportunity_id uuid NOT NULL REFERENCES public.opportunities(id), contact_date timestamptz NOT NULL DEFAULT now(), user_id uuid NOT NULL REFERENCES public.profiles(id), contact_type text NOT NULL, result public.contact_result NOT NULL, notes text NOT NULL DEFAULT '', action_id uuid, created_by uuid, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.next_actions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), opportunity_id uuid NOT NULL REFERENCES public.opportunities(id), description text NOT NULL, due_at timestamptz, owner_id uuid REFERENCES public.profiles(id), notes text NOT NULL DEFAULT '', status public.action_status NOT NULL DEFAULT 'pendente', completed_interaction_id uuid REFERENCES public.interactions(id), created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.sales (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), opportunity_id uuid NOT NULL REFERENCES public.opportunities(id), store_id uuid NOT NULL REFERENCES public.stores(id), sale_date date NOT NULL, total numeric(12,2) NOT NULL, created_by uuid, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.sale_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE, product text NOT NULL, quantity numeric(10,2) NOT NULL CHECK (quantity > 0), unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0), subtotal numeric(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED);
CREATE TABLE public.losses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), opportunity_id uuid NOT NULL REFERENCES public.opportunities(id), reason text NOT NULL, notes text NOT NULL DEFAULT '', created_by uuid, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.opportunity_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), opportunity_id uuid NOT NULL REFERENCES public.opportunities(id), kind text NOT NULL, description text NOT NULL DEFAULT '', from_user uuid, to_user uuid, created_by uuid, created_at timestamptz NOT NULL DEFAULT now());

-- Writes go only through security-definer functions below; tables are read-only via the API.
GRANT SELECT ON public.stores, public.profiles, public.user_roles, public.clients, public.opportunities, public.interactions, public.next_actions, public.sales, public.sale_items, public.losses, public.opportunity_events TO authenticated;
GRANT ALL ON public.stores, public.profiles, public.user_roles, public.clients, public.opportunities, public.interactions, public.next_actions, public.sales, public.sale_items, public.losses, public.opportunity_events TO service_role;

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.next_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.losses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_events ENABLE ROW LEVEL SECURITY;

-- Helpers
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
CREATE OR REPLACE FUNCTION public.my_store() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT store_id FROM public.profiles WHERE id = auth.uid() $$;
CREATE OR REPLACE FUNCTION public.is_global_manager() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'supervisor') OR public.has_role(auth.uid(),'diretor') $$;
CREATE OR REPLACE FUNCTION public.is_operational() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'vendedor') OR public.has_role(auth.uid(),'gerente') OR public.is_global_manager() $$;
-- Can manage (distribute/transfer/archive/reopen) opportunities of a store
CREATE OR REPLACE FUNCTION public.can_manage_store(_store uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_global_manager() OR (public.has_role(auth.uid(),'gerente') AND public.my_store() = _store) $$;
CREATE OR REPLACE FUNCTION public.can_view_opp(_opp uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = _opp AND (
    public.can_manage_store(o.store_id) OR (public.has_role(auth.uid(),'vendedor') AND o.owner_id = auth.uid()))) $$;
-- Can register contacts/actions/sales/losses
CREATE OR REPLACE FUNCTION public.can_work_opp(_opp uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = _opp AND (
    public.can_manage_store(o.store_id) OR o.owner_id = auth.uid())) $$;

-- Read policies
CREATE POLICY "auth read stores" ON public.stores FOR SELECT TO authenticated USING (true);
CREATE POLICY "read profiles" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_operational());
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_global_manager() OR public.has_role(auth.uid(),'gerente'));
CREATE POLICY "operational read clients" ON public.clients FOR SELECT TO authenticated USING (public.is_operational());
CREATE POLICY "read opps" ON public.opportunities FOR SELECT TO authenticated USING (public.can_manage_store(store_id) OR (public.has_role(auth.uid(),'vendedor') AND owner_id = auth.uid()));
CREATE POLICY "read interactions" ON public.interactions FOR SELECT TO authenticated USING (public.can_view_opp(opportunity_id));
CREATE POLICY "read actions" ON public.next_actions FOR SELECT TO authenticated USING (public.can_view_opp(opportunity_id));
CREATE POLICY "read sales" ON public.sales FOR SELECT TO authenticated USING (public.can_view_opp(opportunity_id));
CREATE POLICY "read sale items" ON public.sale_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND public.can_view_opp(s.opportunity_id)));
CREATE POLICY "read losses" ON public.losses FOR SELECT TO authenticated USING (public.can_view_opp(opportunity_id));
CREATE POLICY "read events" ON public.opportunity_events FOR SELECT TO authenticated USING (public.can_view_opp(opportunity_id));

-- Write functions
CREATE OR REPLACE FUNCTION public.save_client(_id uuid, _full_name text, _phone text, _origin text, _interests text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid;
BEGIN
  IF NOT public.is_operational() THEN RAISE EXCEPTION 'Sem permissão para cadastrar clientes'; END IF;
  IF coalesce(trim(_full_name),'') = '' THEN RAISE EXCEPTION 'Informe o nome do cliente'; END IF;
  IF _id IS NULL THEN
    INSERT INTO clients(full_name, phone, origin, interests, created_by) VALUES (trim(_full_name), coalesce(_phone,''), coalesce(_origin,''), coalesce(_interests,''), auth.uid()) RETURNING id INTO v;
  ELSE
    UPDATE clients SET full_name = trim(_full_name), phone = coalesce(_phone,''), origin = coalesce(_origin,''), interests = coalesce(_interests,'') WHERE id = _id RETURNING id INTO v;
  END IF;
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public.create_opportunity(_client uuid, _store uuid, _products text, _origin text, _owner uuid, _action_desc text, _action_due timestamptz) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid; v_owner uuid := _owner;
BEGIN
  IF NOT public.is_operational() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF NOT public.can_manage_store(_store) THEN
    -- vendedor: só na própria loja e fica como responsável
    IF public.my_store() IS DISTINCT FROM _store THEN RAISE EXCEPTION 'Você só pode cadastrar oportunidades na sua loja'; END IF;
    v_owner := auth.uid();
  END IF;
  IF v_owner IS NOT NULL AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = v_owner AND p.store_id = _store) THEN RAISE EXCEPTION 'Responsável não pertence à loja'; END IF;
  INSERT INTO opportunities(client_id, store_id, owner_id, products, origin, stage, created_by)
  VALUES (_client, _store, v_owner, coalesce(_products,''), coalesce(_origin,''), CASE WHEN v_owner IS NULL THEN 'novo'::opp_stage ELSE 'distribuido'::opp_stage END, auth.uid()) RETURNING id INTO v;
  INSERT INTO opportunity_events(opportunity_id, kind, description, to_user, created_by) VALUES (v, 'criacao', 'Oportunidade cadastrada', v_owner, auth.uid());
  IF v_owner IS NOT NULL THEN
    INSERT INTO opportunity_events(opportunity_id, kind, description, to_user, created_by) VALUES (v, 'distribuicao', 'Oportunidade distribuída', v_owner, auth.uid());
  END IF;
  IF coalesce(trim(_action_desc),'') <> '' THEN
    INSERT INTO next_actions(opportunity_id, description, due_at, owner_id, created_by) VALUES (v, trim(_action_desc), _action_due, coalesce(v_owner, auth.uid()), auth.uid());
  END IF;
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public.assign_opportunity(_opp uuid, _owner uuid, _note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o opportunities;
BEGIN
  SELECT * INTO o FROM opportunities WHERE id = _opp;
  IF NOT FOUND OR NOT public.can_manage_store(o.store_id) THEN RAISE EXCEPTION 'Sem permissão para distribuir/transferir'; END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles p JOIN user_roles r ON r.user_id = p.id WHERE p.id = _owner AND p.store_id = o.store_id AND r.role = 'vendedor' OR (p.id = _owner AND r.user_id = p.id AND r.role = 'gerente' AND p.store_id = o.store_id)) THEN RAISE EXCEPTION 'Responsável inválido para esta loja'; END IF;
  UPDATE opportunities SET owner_id = _owner, stage = CASE WHEN stage = 'novo' THEN 'distribuido'::opp_stage ELSE stage END WHERE id = _opp;
  UPDATE next_actions SET owner_id = _owner, updated_at = now() WHERE opportunity_id = _opp AND status = 'pendente';
  INSERT INTO opportunity_events(opportunity_id, kind, description, from_user, to_user, created_by)
  VALUES (_opp, CASE WHEN o.owner_id IS NULL THEN 'distribuicao' ELSE 'transferencia' END, coalesce(nullif(trim(_note),''), CASE WHEN o.owner_id IS NULL THEN 'Oportunidade distribuída' ELSE 'Responsabilidade transferida' END), o.owner_id, _owner, auth.uid());
END $$;

CREATE OR REPLACE FUNCTION public.register_interaction(_opp uuid, _date timestamptz, _type text, _result contact_result, _notes text, _action uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o opportunities; v uuid;
BEGIN
  SELECT * INTO o FROM opportunities WHERE id = _opp;
  IF NOT FOUND OR NOT public.can_work_opp(_opp) THEN RAISE EXCEPTION 'Sem permissão para registrar atendimento'; END IF;
  IF o.stage IN ('ganho','perdido') THEN RAISE EXCEPTION 'Oportunidade encerrada. Reabra para registrar novos atendimentos'; END IF;
  IF o.archived THEN RAISE EXCEPTION 'Oportunidade arquivada'; END IF;
  INSERT INTO interactions(opportunity_id, contact_date, user_id, contact_type, result, notes, action_id, created_by)
  VALUES (_opp, coalesce(_date, now()), auth.uid(), _type, _result, coalesce(_notes,''), _action, auth.uid()) RETURNING id INTO v;
  IF _result = 'efetivo' AND o.stage IN ('novo','distribuido') THEN
    UPDATE opportunities SET stage = 'negociacao' WHERE id = _opp;
    INSERT INTO opportunity_events(opportunity_id, kind, description, created_by) VALUES (_opp, 'etapa', 'Primeiro contato efetivo: etapa Negociação', auth.uid());
  END IF;
  IF _action IS NOT NULL THEN
    UPDATE next_actions SET status = 'concluida', completed_interaction_id = v, updated_at = now() WHERE id = _action AND opportunity_id = _opp AND status = 'pendente';
  END IF;
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public.plan_action(_opp uuid, _desc text, _due timestamptz, _owner uuid, _notes text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid; o opportunities;
BEGIN
  SELECT * INTO o FROM opportunities WHERE id = _opp;
  IF NOT FOUND OR NOT public.can_work_opp(_opp) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF coalesce(trim(_desc),'') = '' THEN RAISE EXCEPTION 'Descreva a ação'; END IF;
  UPDATE next_actions SET status = 'substituida', updated_at = now() WHERE opportunity_id = _opp AND status = 'pendente';
  INSERT INTO next_actions(opportunity_id, description, due_at, owner_id, notes, created_by)
  VALUES (_opp, trim(_desc), _due, coalesce(_owner, o.owner_id, auth.uid()), coalesce(_notes,''), auth.uid()) RETURNING id INTO v;
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public.cancel_action(_action uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a next_actions;
BEGIN
  SELECT * INTO a FROM next_actions WHERE id = _action;
  IF NOT FOUND OR NOT public.can_work_opp(a.opportunity_id) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  UPDATE next_actions SET status = 'cancelada', updated_at = now() WHERE id = _action AND status = 'pendente';
END $$;

CREATE OR REPLACE FUNCTION public.register_sale(_opp uuid, _date date, _items jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o opportunities; v uuid; it jsonb; tot numeric := 0;
BEGIN
  SELECT * INTO o FROM opportunities WHERE id = _opp;
  IF NOT FOUND OR NOT public.can_work_opp(_opp) THEN RAISE EXCEPTION 'Sem permissão para registrar venda'; END IF;
  IF o.stage IN ('ganho','perdido') THEN RAISE EXCEPTION 'Oportunidade já encerrada'; END IF;
  IF jsonb_array_length(coalesce(_items,'[]'::jsonb)) = 0 THEN RAISE EXCEPTION 'Informe ao menos um produto'; END IF;
  INSERT INTO sales(opportunity_id, store_id, sale_date, total, created_by) VALUES (_opp, o.store_id, coalesce(_date, current_date), 0, auth.uid()) RETURNING id INTO v;
  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    IF coalesce(trim(it->>'product'),'') = '' THEN RAISE EXCEPTION 'Produto sem nome'; END IF;
    INSERT INTO sale_items(sale_id, product, quantity, unit_price) VALUES (v, trim(it->>'product'), (it->>'quantity')::numeric, (it->>'unit_price')::numeric);
  END LOOP;
  SELECT coalesce(sum(subtotal),0) INTO tot FROM sale_items WHERE sale_id = v;
  UPDATE sales SET total = tot WHERE id = v;
  UPDATE opportunities SET stage = 'ganho', closed_at = now() WHERE id = _opp;
  UPDATE next_actions SET status = 'cancelada', updated_at = now() WHERE opportunity_id = _opp AND status = 'pendente';
  INSERT INTO opportunity_events(opportunity_id, kind, description, created_by) VALUES (_opp, 'ganho', 'Venda registrada: R$ ' || to_char(tot, 'FM999G999G990D00'), auth.uid());
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public.register_loss(_opp uuid, _reason text, _notes text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o opportunities;
BEGIN
  SELECT * INTO o FROM opportunities WHERE id = _opp;
  IF NOT FOUND OR NOT public.can_work_opp(_opp) THEN RAISE EXCEPTION 'Sem permissão para registrar perda'; END IF;
  IF o.stage IN ('ganho','perdido') THEN RAISE EXCEPTION 'Oportunidade já encerrada'; END IF;
  IF coalesce(trim(_reason),'') = '' THEN RAISE EXCEPTION 'O motivo da perda é obrigatório'; END IF;
  INSERT INTO losses(opportunity_id, reason, notes, created_by) VALUES (_opp, trim(_reason), coalesce(_notes,''), auth.uid());
  UPDATE opportunities SET stage = 'perdido', closed_at = now() WHERE id = _opp;
  UPDATE next_actions SET status = 'cancelada', updated_at = now() WHERE opportunity_id = _opp AND status = 'pendente';
  INSERT INTO opportunity_events(opportunity_id, kind, description, created_by) VALUES (_opp, 'perdido', 'Perda registrada: ' || trim(_reason), auth.uid());
END $$;

CREATE OR REPLACE FUNCTION public.reopen_opportunity(_opp uuid, _note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o opportunities; ns opp_stage;
BEGIN
  SELECT * INTO o FROM opportunities WHERE id = _opp;
  IF NOT FOUND OR NOT public.can_manage_store(o.store_id) THEN RAISE EXCEPTION 'Somente a gestão pode reabrir'; END IF;
  IF o.stage NOT IN ('ganho','perdido') THEN RAISE EXCEPTION 'A oportunidade não está encerrada'; END IF;
  IF EXISTS (SELECT 1 FROM interactions WHERE opportunity_id = _opp AND result = 'efetivo') THEN ns := 'negociacao';
  ELSIF o.owner_id IS NOT NULL THEN ns := 'distribuido'; ELSE ns := 'novo'; END IF;
  UPDATE opportunities SET stage = ns, closed_at = NULL WHERE id = _opp;
  INSERT INTO opportunity_events(opportunity_id, kind, description, created_by) VALUES (_opp, 'reabertura', coalesce(nullif(trim(_note),''), 'Oportunidade reaberta'), auth.uid());
END $$;

CREATE OR REPLACE FUNCTION public.set_archived(_opp uuid, _archived boolean, _reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o opportunities;
BEGIN
  SELECT * INTO o FROM opportunities WHERE id = _opp;
  IF NOT FOUND OR NOT public.can_manage_store(o.store_id) THEN RAISE EXCEPTION 'Somente a gestão pode arquivar'; END IF;
  UPDATE opportunities SET archived = _archived, archived_reason = CASE WHEN _archived THEN nullif(trim(_reason),'') ELSE archived_reason END,
    archived_at = CASE WHEN _archived THEN now() ELSE archived_at END, archived_by = CASE WHEN _archived THEN auth.uid() ELSE archived_by END WHERE id = _opp;
  INSERT INTO opportunity_events(opportunity_id, kind, description, created_by)
  VALUES (_opp, CASE WHEN _archived THEN 'arquivamento' ELSE 'desarquivamento' END, coalesce(nullif(trim(_reason),''), CASE WHEN _archived THEN 'Oportunidade arquivada' ELSE 'Oportunidade desarquivada' END), auth.uid());
END $$;

-- Aggregated reports: returns only totals, scoped by role (marketing, gerente, supervisor, diretor)
CREATE OR REPLACE FUNCTION public.report_summary(_from date, _to date, _store uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE scope uuid := _store; res jsonb;
BEGIN
  IF public.has_role(auth.uid(),'gerente') AND NOT public.is_global_manager() AND NOT public.has_role(auth.uid(),'marketing') THEN scope := public.my_store();
  ELSIF NOT (public.is_global_manager() OR public.has_role(auth.uid(),'marketing')) THEN RAISE EXCEPTION 'Sem acesso aos relatórios'; END IF;
  WITH o AS (SELECT * FROM opportunities WHERE created_at::date BETWEEN _from AND _to AND (scope IS NULL OR store_id = scope)),
  s AS (SELECT sa.* FROM sales sa JOIN opportunities op ON op.id = sa.opportunity_id WHERE sa.sale_date BETWEEN _from AND _to AND (scope IS NULL OR sa.store_id = scope)),
  l AS (SELECT lo.* FROM losses lo JOIN opportunities op ON op.id = lo.opportunity_id WHERE lo.created_at::date BETWEEN _from AND _to AND (scope IS NULL OR op.store_id = scope))
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM o),
    'by_stage', (SELECT coalesce(jsonb_object_agg(stage, c),'{}') FROM (SELECT stage, count(*) c FROM o GROUP BY stage) x),
    'by_origin', (SELECT coalesce(jsonb_agg(jsonb_build_object('name', name, 'value', c) ORDER BY c DESC),'[]') FROM (SELECT coalesce(nullif(origin,''),'Não informada') name, count(*) c FROM o GROUP BY 1) x),
    'by_store', (SELECT coalesce(jsonb_agg(jsonb_build_object('name', st.name, 'value', c) ORDER BY st.name),'[]') FROM (SELECT store_id, count(*) c FROM o GROUP BY store_id) x JOIN stores st ON st.id = x.store_id),
    'won', (SELECT count(*) FROM o WHERE stage = 'ganho'),
    'lost', (SELECT count(*) FROM o WHERE stage = 'perdido'),
    'sales_count', (SELECT count(*) FROM s),
    'sales_total', (SELECT coalesce(sum(total),0) FROM s),
    'sales_by_month', (SELECT coalesce(jsonb_agg(jsonb_build_object('name', m, 'value', v) ORDER BY m),'[]') FROM (SELECT to_char(sale_date,'YYYY-MM') m, sum(total) v FROM s GROUP BY 1) x),
    'products', (SELECT coalesce(jsonb_agg(jsonb_build_object('name', product, 'quantity', q, 'value', v) ORDER BY v DESC),'[]') FROM (SELECT si.product, sum(si.quantity) q, sum(si.subtotal) v FROM sale_items si JOIN s ON s.id = si.sale_id GROUP BY si.product LIMIT 15) x),
    'loss_reasons', (SELECT coalesce(jsonb_agg(jsonb_build_object('name', reason, 'value', c) ORDER BY c DESC),'[]') FROM (SELECT reason, count(*) c FROM l GROUP BY reason) x),
    'scope_store', scope
  ) INTO res;
  RETURN res;
END $$;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, public;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
