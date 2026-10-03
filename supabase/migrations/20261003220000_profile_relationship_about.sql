-- Perfil no formato do VK: relacionamento com parceiro, parentes e mais informações
-- (cidade natal, idiomas, formação, carreira e lema de vida).

-- ---------------------------------------------------------------- relacionamento
-- Status do VK (enrolado, sempre procurando, apaixonado, união estável) além dos que já existiam.
-- Coluna nova com a regra completa; "relationshipStatus" fica só como histórico.
alter table public."Profile" add column if not exists relationship text;
alter table public."Profile" add constraint "Profile_relationship_check" check (relationship is null or relationship = any (array[
  'single', 'relationship', 'engaged', 'married', 'civil_union', 'complicated', 'searching', 'in_love',
  'separated', 'divorced', 'widowed'
]::text[])) not valid;
update public."Profile" set relationship = "relationshipStatus" where relationship is null and "relationshipStatus" is not null;
alter table public."Profile" validate constraint "Profile_relationship_check";
grant insert (relationship), update (relationship) on public."Profile" to authenticated;

-- Mais informações (só gravadas pela função save_profile_about, que valida tudo).
alter table public."Profile" add column if not exists about jsonb not null default '{}'::jsonb;

create or replace function public.public_profile_details(target_user_id text)
returns table(age integer, "zodiacSign" text, location text, website text, interests text, "relationshipStatus" text,
              "showAge" boolean, "showSign" boolean, "showLocation" boolean, "showInterests" boolean, "showRelationship" boolean)
language sql stable security definer set search_path to 'public' as $function$
  select
    case when (p."showAge" or me.is_owner) and p."birthDate" is not null
      then extract(year from age(p."birthDate"::date))::int end,
    case when p."showSign" or me.is_owner then p."zodiacSign" end,
    case when p."showLocation" or me.is_owner then p.location end,
    p.website,
    case when coalesce(p."showInterests", true) or me.is_owner then p.interests end,
    case when coalesce(p."showRelationship", true) or me.is_owner then coalesce(p.relationship, p."relationshipStatus") end,
    p."showAge", p."showSign", p."showLocation", coalesce(p."showInterests", true), coalesce(p."showRelationship", true)
  from "Profile" p
  cross join (select auth.uid()::text = target_user_id as is_owner) me
  where p."userId" = target_user_id
    and not public.is_blocked_between(coalesce(auth.uid()::text, ''), target_user_id)
$function$;

create or replace function public.my_account_details()
returns table(email text, phone text, "termsAcceptedAt" timestamptz, "privacyAcceptedAt" timestamptz, "hasProfileRow" boolean,
              "birthDate" text, gender text, location text, website text, interests text, "relationshipStatus" text,
              "showAge" boolean, "showSign" boolean, "showLocation" boolean, "showInterests" boolean, "showRelationship" boolean,
              "familyVisibility" text)
language sql stable security definer set search_path to 'public' as $function$
  select
    u.email, u.phone, u."termsAcceptedAt", u."privacyAcceptedAt",
    p.id is not null,
    to_char(p."birthDate", 'YYYY-MM-DD'), p.gender, p.location, p.website, p.interests,
    coalesce(p.relationship, p."relationshipStatus"),
    coalesce(p."showAge", true), coalesce(p."showSign", true), coalesce(p."showLocation", true),
    coalesce(p."showInterests", true), coalesce(p."showRelationship", true),
    coalesce(p."familyVisibility", 'all')
  from "User" u
  left join "Profile" p on p."userId" = u.id
  where u.id = auth.uid()::text
$function$;

-- Parceiro: um só por pessoa, com aviso próprio ("indicou você como parceiro(a)").
create or replace function public.family_add(p_relative_id text, p_relation text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_me text := auth.uid()::text; v_name text; v_partner boolean := p_relation in ('Cônjuge', 'Companheiro(a)');
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  if p_relative_id is null or p_relative_id = v_me then raise exception 'invalid_relative' using errcode='check_violation'; end if;
  if not (p_relation = any (public.family_relations())) then raise exception 'invalid_relation' using errcode='check_violation'; end if;
  if not exists (select 1 from "User" where id = p_relative_id) then raise exception 'user_not_found' using errcode='no_data_found'; end if;
  if exists (select 1 from "Block" where ("blockerId"=p_relative_id and "blockedId"=v_me) or ("blockerId"=v_me and "blockedId"=p_relative_id)) then
    raise exception 'blocked' using errcode='insufficient_privilege'; end if;
  if (select count(*) from "FamilyLink" where "userId"=v_me and "createdAt" > now() - interval '1 hour') >= 30 then
    raise exception 'rate_limited' using errcode='check_violation'; end if;
  if v_partner and exists (
       select 1 from "FamilyLink" f
        where f."userId" = v_me and f."relativeId" <> p_relative_id and f.relation in ('Cônjuge', 'Companheiro(a)')) then
    raise exception 'partner_exists' using errcode='check_violation';
  end if;

  insert into "FamilyLink" (id, "userId", "relativeId", relation, status)
    values (gen_random_uuid()::text, v_me, p_relative_id, p_relation, 'pending')
  on conflict ("userId","relativeId") do update set relation = excluded.relation
    where "FamilyLink".status = 'pending';

  select name into v_name from "User" where id = v_me;
  if v_partner then
    perform public.app_notify(p_relative_id, v_me, 'family', 'Pedido de relacionamento',
      coalesce(v_name,'Alguém') || ' indicou você como ' || case when p_relation = 'Cônjuge' then 'cônjuge' else 'parceiro(a)' end || ' no perfil.',
      '/configuracoes/conta/parentes');
  else
    perform public.app_notify(p_relative_id, v_me, 'family',
      'Pedido de parentesco', coalesce(v_name,'Alguém') || ' quer te adicionar como ' || p_relation || '.', '/configuracoes/conta/parentes');
  end if;
  return jsonb_build_object('ok', true);
end $function$;

-- ---------------------------------------------------------------- mais informações
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
  update public."Profile" set about = v_clean, "updatedAt" = now() where "userId" = v_me;
  if not found then
    insert into public."Profile" (id, "userId", about, "createdAt", "updatedAt") values (gen_random_uuid()::text, v_me, v_clean, now(), now());
  end if;
  return v_clean;
end $$;

/** Mais informações de um perfil (respeita bloqueios). */
create or replace function public.profile_about(p_user text)
returns jsonb language sql stable security definer set search_path to '' as $$
  select coalesce((select p.about from public."Profile" p where p."userId" = p_user), '{}'::jsonb)
   where not public.is_blocked_between(coalesce(auth.uid()::text, ''), p_user)
$$;

revoke all on function public.profile_about_clean(jsonb), public.save_profile_about(jsonb), public.profile_about(text) from public, anon;
grant execute on function public.save_profile_about(jsonb), public.profile_about(text) to authenticated;
grant execute on function public.profile_about(text) to anon;
