CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.is_group_member(_group uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.group_members WHERE group_id = _group AND user_id = _user); $$;

CREATE OR REPLACE FUNCTION private.is_group_admin(_group uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.group_members WHERE group_id = _group AND user_id = _user AND role IN ('owner','admin')); $$;

REVOKE ALL ON FUNCTION private.is_group_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_group_admin(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_group_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_group_admin(uuid, uuid) TO authenticated;

DO $do$
DECLARE p record; q text; w text;
BEGIN
  FOR p IN SELECT * FROM pg_policies WHERE schemaname = 'public'
    AND (coalesce(qual,'') LIKE '%is_group_%' OR coalesce(with_check,'') LIKE '%is_group_%')
  LOOP
    q := replace(replace(coalesce(p.qual,''), 'is_group_member(', 'private.is_group_member('), 'is_group_admin(', 'private.is_group_admin(');
    w := replace(replace(coalesce(p.with_check,''), 'is_group_member(', 'private.is_group_member('), 'is_group_admin(', 'private.is_group_admin(');
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR %s TO %s %s %s',
      p.policyname, p.tablename, p.cmd, array_to_string(p.roles, ','),
      CASE WHEN p.qual IS NULL THEN '' ELSE 'USING (' || q || ')' END,
      CASE WHEN p.with_check IS NULL THEN '' ELSE 'WITH CHECK (' || w || ')' END);
  END LOOP;
END $do$;

DROP FUNCTION IF EXISTS public.is_group_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_group_admin(uuid, uuid);