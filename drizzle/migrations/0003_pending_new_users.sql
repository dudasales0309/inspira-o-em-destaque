
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE first_real boolean;
BEGIN
  first_real := NOT EXISTS (SELECT 1 FROM auth.users WHERE id <> NEW.id AND email NOT LIKE '%@demo.com');
  INSERT INTO profiles(id, full_name, store_id) VALUES (NEW.id, coalesce(NEW.raw_user_meta_data->>'full_name', ''), NULL) ON CONFLICT (id) DO NOTHING;
  -- Primeiro usuário real vira Diretor; os demais aguardam liberação do Diretor (sem perfil = sem acesso)
  IF first_real THEN INSERT INTO user_roles(user_id, role) VALUES (NEW.id, 'diretor') ON CONFLICT DO NOTHING; END IF;
  RETURN NEW;
END $$;
DROP POLICY IF EXISTS "read profiles" ON public.profiles;
CREATE POLICY "read profiles" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_operational() OR public.has_role(auth.uid(),'diretor'));
