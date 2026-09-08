CREATE OR REPLACE FUNCTION private.shares_group(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _a = _b OR EXISTS (
    SELECT 1 FROM public.group_members m1
    JOIN public.group_members m2 ON m1.group_id = m2.group_id
    WHERE m1.user_id = _a AND m2.user_id = _b
  );
$$;
REVOKE ALL ON FUNCTION private.shares_group(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.shares_group(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS doubts_update ON public.doubts;
CREATE POLICY doubts_update ON public.doubts FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR private.is_group_admin(group_id, auth.uid()))
WITH CHECK (user_id = auth.uid() OR private.is_group_admin(group_id, auth.uid()));

DROP POLICY IF EXISTS notif_insert ON public.notifications;
CREATE POLICY notif_insert ON public.notifications FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR private.shares_group(auth.uid(), user_id));

DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR private.shares_group(auth.uid(), id));