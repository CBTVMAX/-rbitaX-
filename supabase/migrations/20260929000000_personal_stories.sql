-- Personal (profile) stories.
--
-- Community stories already live in `Moment` with `community_create_story`, but that RPC requires a
-- community and checks community role. This adds a sibling RPC for stories published to the
-- author's own profile, which is what the avatar flow offers ("Foto do perfil" / "História").
--
-- `Moment.communityId` is nullable, so no table change is needed — a personal story is a Moment
-- with no community. The same table means the same expiry column and the same RLS surface.

create or replace function public.story_create(
  p jsonb
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id   text;
  v_user uuid := auth.uid();
  v_hours numeric := coalesce((p ->> 'hours')::numeric, 24);
  v_type  text := coalesce(p ->> 'type', 'image');
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  -- A personal story is never posted on behalf of a community.
  if v_hours <= 0 or v_hours > 168 then
    v_hours := 24;
  end if;

  insert into public."Moment" (id, "userId", "communityId", "asCommunity", type, "mediaUrl", "thumbnailUrl", text, meta, "expiresAt")
  values (
    gen_random_uuid()::text,
    v_user,
    null,
    false,
    v_type,
    p ->> 'mediaUrl',
    p ->> 'thumbnailUrl',
    nullif(btrim(coalesce(p ->> 'text', '')), ''),
    coalesce(p -> 'meta', '{}'::jsonb),
    now() + make_interval(hours => v_hours)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.story_create(jsonb) from public, anon;
grant execute on function public.story_create(jsonb) to authenticated;
