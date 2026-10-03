-- Carreira: a pessoa pode marcar uma comunidade do Órbita X como local de trabalho (como no VK).
-- Só vale comunidade de que ela participa; ao exibir, o perfil traz nome, link e foto atuais da comunidade.

create or replace function public.profile_about_clean(p jsonb)
returns jsonb language plpgsql immutable set search_path to '' as $$
declare
  v_out jsonb := '{}'::jsonb; v_list jsonb := '[]'::jsonb; e jsonb; t text; y int; y2 int;
  c_priority text[] := array['Família e filhos', 'Carreira e dinheiro', 'Diversão e lazer', 'Ciência e pesquisa',
                             'Melhorar o mundo', 'Autodesenvolvimento', 'Beleza e arte', 'Fama e influência'];
  c_people text[] := array['Inteligência e criatividade', 'Bondade e honestidade', 'Beleza e saúde',
                           'Poder e riqueza', 'Coragem e persistência', 'Humor e amor à vida'];
  c_habit text[] := array['Muito negativa', 'Negativa', 'Neutra', 'Compromisso', 'Positiva'];
  c_level text[] := array['Ensino fundamental', 'Ensino médio', 'Técnico', 'Graduação', 'Pós-graduação', 'Mestrado', 'Doutorado', 'Curso livre'];
begin
  p := coalesce(p, '{}'::jsonb);
  t := left(btrim(coalesce(p->>'hometown', '')), 80); if t <> '' then v_out := v_out || jsonb_build_object('hometown', t); end if;
  t := left(btrim(coalesce(p->>'motto', '')), 160); if t <> '' then v_out := v_out || jsonb_build_object('motto', t); end if;
  t := left(btrim(coalesce(p->>'inspiredBy', '')), 160); if t <> '' then v_out := v_out || jsonb_build_object('inspiredBy', t); end if;
  if p->>'priority' = any (c_priority) then v_out := v_out || jsonb_build_object('priority', p->>'priority'); end if;
  if p->>'peopleValue' = any (c_people) then v_out := v_out || jsonb_build_object('peopleValue', p->>'peopleValue'); end if;
  if p->>'smoking' = any (c_habit) then v_out := v_out || jsonb_build_object('smoking', p->>'smoking'); end if;
  if p->>'alcohol' = any (c_habit) then v_out := v_out || jsonb_build_object('alcohol', p->>'alcohol'); end if;

  if jsonb_typeof(p->'languages') = 'array' then
    for t in select distinct on (lower(btrim(x))) left(btrim(x), 30) from jsonb_array_elements_text(p->'languages') x where btrim(x) <> '' limit 10 loop
      v_list := v_list || to_jsonb(t);
    end loop;
    if jsonb_array_length(v_list) > 0 then v_out := v_out || jsonb_build_object('languages', v_list); end if;
  end if;

  v_list := '[]'::jsonb;
  if jsonb_typeof(p->'education') = 'array' then
    for e in select x from jsonb_array_elements(p->'education') x where jsonb_typeof(x) = 'object' limit 5 loop
      t := left(btrim(coalesce(e->>'school', '')), 100);
      continue when t = '';
      y := case when e->>'year' ~ '^[0-9]{4}$' and (e->>'year')::int between 1940 and 2040 then (e->>'year')::int end;
      v_list := v_list || jsonb_strip_nulls(jsonb_build_object(
        'school', t,
        'course', nullif(left(btrim(coalesce(e->>'course', '')), 100), ''),
        'level', case when e->>'level' = any (c_level) then e->>'level' end,
        'year', y));
    end loop;
    if jsonb_array_length(v_list) > 0 then v_out := v_out || jsonb_build_object('education', v_list); end if;
  end if;

  v_list := '[]'::jsonb;
  if jsonb_typeof(p->'career') = 'array' then
    for e in select x from jsonb_array_elements(p->'career') x where jsonb_typeof(x) = 'object' limit 5 loop
      t := left(btrim(coalesce(e->>'company', '')), 100);
      continue when t = '';
      y := case when e->>'from' ~ '^[0-9]{4}$' and (e->>'from')::int between 1940 and 2040 then (e->>'from')::int end;
      y2 := case when e->>'to' ~ '^[0-9]{4}$' and (e->>'to')::int between 1940 and 2040 then (e->>'to')::int end;
      v_list := v_list || jsonb_strip_nulls(jsonb_build_object(
        'company', t,
        'community', case when e->>'community' ~ '^[A-Za-z0-9_-]{1,64}$' then e->>'community' end,
        'role', nullif(left(btrim(coalesce(e->>'role', '')), 100), ''),
        'city', nullif(left(btrim(coalesce(e->>'city', '')), 80), ''),
        'from', y, 'to', case when y2 is not null and (y is null or y2 >= y) then y2 end));
    end loop;
    if jsonb_array_length(v_list) > 0 then v_out := v_out || jsonb_build_object('career', v_list); end if;
  end if;
  return v_out;
end $$;

create or replace function public.save_profile_about(p jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare v_me text := auth.uid()::text; v_clean jsonb;
begin
  if v_me is null then raise exception 'not authenticated' using errcode = 'insufficient_privilege'; end if;
  if pg_column_size(p) > 16384 then raise exception 'too_large' using errcode = 'check_violation'; end if;
  v_clean := public.profile_about_clean(p);
  if v_clean ? 'career' then
    v_clean := jsonb_set(v_clean, '{career}', (
      select coalesce(jsonb_agg(case
               when c ? 'community' and not exists (
                 select 1 from public."CommunityMember" m where m."communityId" = c->>'community' and m."userId" = v_me)
               then c - 'community' else c end), '[]'::jsonb)
        from jsonb_array_elements(v_clean->'career') c));
  end if;
  update public."Profile" set about = v_clean, "updatedAt" = now() where "userId" = v_me;
  if not found then
    insert into public."Profile" (id, "userId", about, "createdAt", "updatedAt") values (gen_random_uuid()::text, v_me, v_clean, now(), now());
  end if;
  return v_clean;
end $$;

/** Mais informações de um perfil (respeita bloqueios); a comunidade da carreira vem com nome, link e foto. */
create or replace function public.profile_about(p_user text)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare v_about jsonb;
begin
  if public.is_blocked_between(coalesce(auth.uid()::text, ''), p_user) then return '{}'::jsonb; end if;
  select coalesce(p.about, '{}'::jsonb) into v_about from public."Profile" p where p."userId" = p_user;
  v_about := coalesce(v_about, '{}'::jsonb);
  if v_about ? 'career' then
    v_about := jsonb_set(v_about, '{career}', (
      select coalesce(jsonb_agg(case
               when cm.id is not null then c || jsonb_strip_nulls(jsonb_build_object(
                 'communityName', cm.name, 'communitySlug', cm.slug, 'communityAvatar', cm."avatarUrl"))
               else c - 'community' end order by ord), '[]'::jsonb)
        from jsonb_array_elements(v_about->'career') with ordinality as x(c, ord)
        left join public."Community" cm on cm.id = c->>'community'));
  end if;
  return v_about;
end $$;

revoke all on function public.save_profile_about(jsonb), public.profile_about(text) from public, anon;
grant execute on function public.save_profile_about(jsonb), public.profile_about(text) to authenticated;
grant execute on function public.profile_about(text) to anon;
