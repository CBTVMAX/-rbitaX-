-- Corrige story_create: make_interval(hours => ...) só aceita inteiro; com numeric toda história falhava.
create or replace function public.story_create(p jsonb)
returns text language plpgsql security definer set search_path to 'public' as $function$
declare
  v_id text;
  v_user uuid := auth.uid();
  v_hours numeric := coalesce((p ->> 'hours')::numeric, 24);
  v_type text := coalesce(p ->> 'type', 'image');
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if v_hours <= 0 or v_hours > 168 then v_hours := 24; end if;
  insert into public."Moment" (id, "userId", "communityId", "asCommunity", type, "mediaUrl", "thumbnailUrl", text, meta, "expiresAt")
  values (gen_random_uuid()::text, v_user, null, false, v_type, p ->> 'mediaUrl', p ->> 'thumbnailUrl',
          nullif(btrim(coalesce(p ->> 'text', '')), ''), coalesce(p -> 'meta', '{}'::jsonb),
          now() + v_hours * interval '1 hour')
  returning id into v_id;
  return v_id;
end $function$;
