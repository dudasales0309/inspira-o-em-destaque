
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE first_real boolean; v_store uuid;
BEGIN
  BEGIN v_store := nullif(NEW.raw_user_meta_data->>'store_id','')::uuid; EXCEPTION WHEN others THEN v_store := NULL; END;
  IF v_store IS NOT NULL AND NOT EXISTS (SELECT 1 FROM stores WHERE id = v_store) THEN v_store := NULL; END IF;
  first_real := NOT EXISTS (SELECT 1 FROM auth.users WHERE id <> NEW.id AND email NOT LIKE '%@demo.com');
  INSERT INTO profiles(id, full_name, store_id) VALUES (NEW.id, coalesce(NEW.raw_user_meta_data->>'full_name', ''), CASE WHEN first_real THEN NULL ELSE v_store END)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO user_roles(user_id, role) VALUES (NEW.id, CASE WHEN first_real THEN 'diretor'::app_role ELSE 'vendedor'::app_role END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Diretor define perfil e loja de cada usuário
CREATE OR REPLACE FUNCTION public.set_user_access(_user uuid, _role public.app_role, _store uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'diretor') THEN RAISE EXCEPTION 'Somente o Diretor pode alterar perfis'; END IF;
  IF _user = auth.uid() AND _role <> 'diretor' THEN RAISE EXCEPTION 'Você não pode remover seu próprio perfil de Diretor'; END IF;
  IF _role IN ('vendedor','gerente') AND _store IS NULL THEN RAISE EXCEPTION 'Vendedor e Gerente precisam de uma loja'; END IF;
  DELETE FROM user_roles WHERE user_id = _user;
  INSERT INTO user_roles(user_id, role) VALUES (_user, _role);
  UPDATE profiles SET store_id = CASE WHEN _role IN ('vendedor','gerente') THEN _store ELSE NULL END WHERE id = _user;
END $$;
REVOKE EXECUTE ON FUNCTION public.set_user_access(uuid, public.app_role, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.set_user_access(uuid, public.app_role, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public, authenticated;

-- lojas visíveis antes do login (formulário de cadastro)
GRANT SELECT ON public.stores TO anon;
CREATE POLICY "anon read stores" ON public.stores FOR SELECT TO anon USING (true);
