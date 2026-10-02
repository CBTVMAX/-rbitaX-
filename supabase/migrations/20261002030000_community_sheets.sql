-- Construtor de Ficha da comunidade: o dono/administração monta o modelo (blocos livres) e os
-- membros respondem. Nada de pergunta fixa: tudo vem do modelo publicado de cada comunidade.
-- Escrito só com funções (jsonb_extract_path/_text, sheet_text), sem operadores de seta, para não
-- quebrar se o SQL for copiado por um teclado que troca os sinais de maior por aspas angulares.

create table if not exists public."CommunitySheetTemplate" (
  "communityId" text primary key references public."Community"(id) on delete cascade,
  draft jsonb not null default '{}'::jsonb,
  published jsonb,
  version integer not null default 0,
  "publishedAt" timestamptz,
  "updatedAt" timestamptz not null default now()
);
alter table public."CommunitySheetTemplate" enable row level security;
-- Sem políticas: leitura e escrita só pelas funções abaixo (o rascunho é só da administração).

create table if not exists public."CommunitySheet" (
  id text primary key default gen_random_uuid()::text,
  "communityId" text not null references public."Community"(id) on delete cascade,
  "userId" text not null references public."User"(id) on delete cascade,
  version integer not null default 0,
  answers jsonb not null default '{}'::jsonb,
  narrator jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'pending', 'approved', 'rejected')),
  "rejectReason" text,
  title text,
  "avatarUrl" text,
  "coverUrl" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "submittedAt" timestamptz,
  "reviewedAt" timestamptz,
  "reviewedBy" text
);
create index if not exists "CommunitySheet_community_status" on public."CommunitySheet" ("communityId", status, "updatedAt" desc);
create index if not exists "CommunitySheet_user" on public."CommunitySheet" ("userId");
alter table public."CommunitySheet" enable row level security;

drop policy if exists community_sheet_select on public."CommunitySheet";
create policy community_sheet_select on public."CommunitySheet" for select using (
  "userId" = (auth.uid())::text
  or (status = 'approved' and public.community_visible((auth.uid())::text, "communityId"))
  or public.community_perm((auth.uid())::text, "communityId", 'edit_community')
);

-- Quem administra as fichas: quem pode editar a comunidade (dono e administradores).
create or replace function public.sheet_manager(p_user text, p_community text)
returns boolean language sql stable security definer set search_path = public as $$
  select p_user is not null and public.community_perm(p_user, p_community, 'edit_community');
$$;

-- Narrador: administração ou editor da comunidade.
create or replace function public.sheet_narrator(p_user text, p_community text)
returns boolean language sql stable security definer set search_path = public as $$
  select p_user is not null and (public.community_perm(p_user, p_community, 'edit_community')
    or public.community_role(p_user, p_community) = 'editor');
$$;

-- Texto de um valor JSON (string sem aspas).
create or replace function public.sheet_text(v jsonb)
returns text language sql immutable as $$
  select jsonb_extract_path_text(jsonb_build_object('x', v), 'x');
$$;

-- Valor vazio: nulo, texto em branco, lista vazia ou objeto vazio.
create or replace function public.sheet_blank(v jsonb)
returns boolean language sql immutable as $$
  select v is null or jsonb_typeof(v) = 'null'
    or (jsonb_typeof(v) = 'string' and btrim(public.sheet_text(v)) = '')
    or (jsonb_typeof(v) = 'array' and (jsonb_array_length(v) = 0
        or not exists (select 1 from jsonb_array_elements(v) e where not (jsonb_typeof(e) = 'string' and btrim(public.sheet_text(e)) = ''))))
    or (jsonb_typeof(v) = 'object' and v = '{}'::jsonb);
$$;

create or replace function public.sheet_template_get(p_community text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_me text := auth.uid()::text; t record; v_manage boolean;
begin
  if not public.community_visible(v_me, p_community) then return null; end if;
  v_manage := public.sheet_manager(v_me, p_community);
  select * into t from public."CommunitySheetTemplate" where "communityId" = p_community;
  return jsonb_build_object(
    'published', t.published,
    'draft', case when v_manage then coalesce(t.draft, '{}'::jsonb) else null end,
    'version', coalesce(t.version, 0),
    'publishedAt', t."publishedAt",
    'canManage', v_manage,
    'canNarrate', public.sheet_narrator(v_me, p_community),
    'isMember', exists (select 1 from public."CommunityMember" m where m."communityId" = p_community and m."userId" = v_me)
  );
end $$;

create or replace function public.sheet_template_save(p_community text, p_draft jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_me text := auth.uid()::text;
begin
  if not public.sheet_manager(v_me, p_community) then raise exception 'community_forbidden' using errcode = 'insufficient_privilege'; end if;
  if jsonb_typeof(p_draft) <> 'object' or jsonb_typeof(coalesce(jsonb_extract_path(p_draft, 'blocks'), '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(jsonb_extract_path(p_draft, 'blocks'), '[]'::jsonb)) > 300
     or pg_column_size(p_draft) > 300000 then
    raise exception 'invalid_template' using errcode = 'check_violation';
  end if;
  insert into public."CommunitySheetTemplate" ("communityId", draft, "updatedAt") values (p_community, p_draft, now())
  on conflict ("communityId") do update set draft = excluded.draft, "updatedAt" = now();
end $$;

create or replace function public.sheet_template_publish(p_community text)
returns integer language plpgsql security definer set search_path = public as $$
declare v_me text := auth.uid()::text; v_version integer;
begin
  if not public.sheet_manager(v_me, p_community) then raise exception 'community_forbidden' using errcode = 'insufficient_privilege'; end if;
  update public."CommunitySheetTemplate"
     set published = draft, version = version + 1, "publishedAt" = now(), "updatedAt" = now()
   where "communityId" = p_community
   returning version into v_version;
  if v_version is null then raise exception 'invalid_template' using errcode = 'check_violation'; end if;
  perform public.community_log(p_community, 'sheet_publish', 'community', p_community, jsonb_build_object('version', v_version));
  return v_version;
end $$;

-- Salva (rascunho) ou envia a ficha do membro, validando contra o modelo publicado.
create or replace function public.sheet_save(p_community text, p_sheet text, p_answers jsonb, p_submit boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me text := auth.uid()::text; v_tpl jsonb; v_version integer; v_old_user text; v_old_status text; v_old_answers jsonb := '{}'::jsonb; b jsonb;
  v_fid text; v_type text; v_val jsonb; v_clean jsonb := '{}'::jsonb; v_opts jsonb; v_pts jsonb;
  v_sum numeric; v_n numeric; v_attr jsonb; v_card text; v_title text; v_avatar text; v_cover text;
  v_status text; v_manage boolean; v_max integer; v_id text; v_first_short text;
begin
  if v_me is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from public."CommunityMember" m where m."communityId" = p_community and m."userId" = v_me) then
    raise exception 'community_forbidden' using errcode = 'insufficient_privilege';
  end if;
  select published, version into v_tpl, v_version from public."CommunitySheetTemplate" where "communityId" = p_community;
  if v_tpl is null then raise exception 'no_template' using errcode = 'check_violation'; end if;
  if jsonb_typeof(coalesce(p_answers, '{}'::jsonb)) <> 'object' or pg_column_size(p_answers) > 200000 then
    raise exception 'invalid_sheet' using errcode = 'check_violation';
  end if;
  v_manage := public.sheet_manager(v_me, p_community);

  if p_sheet is not null then
    select "userId", status, answers into v_old_user, v_old_status, v_old_answers from public."CommunitySheet" where id = p_sheet and "communityId" = p_community;
    if v_old_user is null or v_old_user <> v_me then raise exception 'not_found' using errcode = 'no_data_found'; end if;
  else
    v_max := coalesce((jsonb_extract_path_text(v_tpl, 'settings', 'maxPerMember'))::integer, 1);
    if (select count(*) from public."CommunitySheet" where "communityId" = p_community and "userId" = v_me) >= greatest(1, least(v_max, 20)) then
      raise exception 'sheet_limit' using errcode = 'check_violation';
    end if;
  end if;
  if (select count(*) from public."CommunitySheet" where "userId" = v_me and "updatedAt" > now() - interval '1 minute') >= 20 then
    raise exception 'rate_limited' using errcode = 'check_violation';
  end if;

  for b in select e from jsonb_array_elements(coalesce(jsonb_extract_path(v_tpl, 'blocks'), '[]'::jsonb)) e loop
    if coalesce(jsonb_extract_path_text(b, 'kind'), '') <> 'field' then continue; end if;
    if coalesce((jsonb_extract_path_text(b, 'narratorOnly'))::boolean, false) then continue; end if;
    v_fid := jsonb_extract_path_text(b, 'id');
    v_type := coalesce(jsonb_extract_path_text(b, 'type'), 'short');
    if v_fid is null then continue; end if;
    v_val := jsonb_extract_path(coalesce(p_answers, '{}'::jsonb), v_fid);

    -- Depois de aprovada, só mudam os campos que o modelo libera.
    if v_old_status = 'approved' and not coalesce((jsonb_extract_path_text(b, 'editableAfterApproval'))::boolean, false) then
      v_val := jsonb_extract_path(v_old_answers, v_fid);
    end if;

    if not public.sheet_blank(v_val) then
      if v_type in ('short', 'long', 'number', 'date', 'location', 'image') and jsonb_typeof(v_val) <> 'string' then
        raise exception 'invalid_sheet' using errcode = 'check_violation';
      end if;
      if jsonb_typeof(v_val) = 'string' and char_length(public.sheet_text(v_val)) > 8000 then
        raise exception 'invalid_sheet' using errcode = 'check_violation';
      end if;
      if v_type = 'number' and (public.sheet_text(v_val)) !~ '^-?[0-9]+([.,][0-9]+)?$' then raise exception 'invalid_number' using errcode = 'check_violation'; end if;
      if v_type = 'image' and (public.sheet_text(v_val)) !~ '^https://[a-z0-9]+[.]supabase[.]co/storage/v1/object/public/' then raise exception 'invalid_media' using errcode = 'check_violation'; end if;
      if v_type = 'gallery' and (jsonb_typeof(v_val) <> 'array' or jsonb_array_length(v_val) > 24
          or exists (select 1 from jsonb_array_elements_text(v_val) u where u !~ '^https://[a-z0-9]+[.]supabase[.]co/storage/v1/object/public/')) then
        raise exception 'invalid_media' using errcode = 'check_violation';
      end if;
      v_opts := coalesce(jsonb_extract_path(b, 'options'), '[]'::jsonb);
      if v_type = 'single' and not (v_opts @> jsonb_build_array(public.sheet_text(v_val))) then raise exception 'invalid_option' using errcode = 'check_violation'; end if;
      if v_type = 'yesno' and (public.sheet_text(v_val)) not in ('sim', 'nao') then raise exception 'invalid_option' using errcode = 'check_violation'; end if;
      if v_type = 'multi' and (jsonb_typeof(v_val) <> 'array' or not (v_opts @> v_val)) then raise exception 'invalid_option' using errcode = 'check_violation'; end if;
      if v_type = 'list' and (jsonb_typeof(v_val) <> 'array' or jsonb_array_length(v_val) > 30) then raise exception 'invalid_sheet' using errcode = 'check_violation'; end if;
      if v_type = 'points' then
        if jsonb_typeof(v_val) <> 'object' then raise exception 'invalid_points' using errcode = 'check_violation'; end if;
        v_pts := coalesce(jsonb_extract_path(b, 'points'), '{}'::jsonb);
        v_sum := 0;
        for v_attr in select e from jsonb_array_elements(coalesce(jsonb_extract_path(v_pts, 'attrs'), '[]'::jsonb)) e loop
          v_n := coalesce((jsonb_extract_path_text(v_val, jsonb_extract_path_text(v_attr, 'id')))::numeric, 0);
          if v_n < coalesce((jsonb_extract_path_text(v_pts, 'min'))::numeric, 0) or v_n > coalesce((jsonb_extract_path_text(v_pts, 'max'))::numeric, 1000000) then
            raise exception 'invalid_points' using errcode = 'check_violation';
          end if;
          v_sum := v_sum + v_n;
        end loop;
        if v_sum > coalesce((jsonb_extract_path_text(v_pts, 'total'))::numeric, 1000000) then raise exception 'invalid_points' using errcode = 'check_violation'; end if;
        if p_submit and not coalesce((jsonb_extract_path_text(v_pts, 'allowLeftover'))::boolean, false)
           and v_sum <> coalesce((jsonb_extract_path_text(v_pts, 'total'))::numeric, v_sum) then
          raise exception 'points_left' using errcode = 'check_violation';
        end if;
      end if;
      v_clean := v_clean || jsonb_build_object(v_fid, v_val);
    elsif p_submit and coalesce((jsonb_extract_path_text(b, 'required'))::boolean, false) then
      raise exception 'required_missing' using errcode = 'check_violation', detail = coalesce(jsonb_extract_path_text(b, 'label'), v_fid);
    end if;

    -- O que aparece no cartão da lista.
    v_card := jsonb_extract_path_text(b, 'card');
    if v_first_short is null and v_type = 'short' and jsonb_typeof(v_val) = 'string' then v_first_short := btrim(public.sheet_text(v_val)); end if;
    if v_card = 'name' and jsonb_typeof(v_val) = 'string' then v_title := btrim(public.sheet_text(v_val)); end if;
    if v_card = 'avatar' and v_type = 'image' and jsonb_typeof(v_val) = 'string' then v_avatar := public.sheet_text(v_val); end if;
    if v_card = 'cover' and v_type = 'image' and jsonb_typeof(v_val) = 'string' then v_cover := public.sheet_text(v_val); end if;
  end loop;

  v_title := left(coalesce(nullif(v_title, ''), nullif(v_first_short, ''), 'Ficha sem nome'), 80);
  if v_old_status = 'approved' then
    v_status := 'approved';
  elsif p_submit then
    v_status := case when v_manage or not coalesce((jsonb_extract_path_text(v_tpl, 'settings', 'requireApproval'))::boolean, true) then 'approved' else 'pending' end;
  else
    v_status := coalesce(case when v_old_status in ('pending', 'rejected') then 'draft' else v_old_status end, 'draft');
  end if;

  if p_sheet is null then
    v_id := gen_random_uuid()::text;
    insert into public."CommunitySheet" (id, "communityId", "userId", version, answers, status, title, "avatarUrl", "coverUrl", "submittedAt")
    values (v_id, p_community, v_me, v_version, v_clean, v_status, v_title, v_avatar, v_cover, case when p_submit then now() end);
  else
    v_id := p_sheet;
    update public."CommunitySheet"
       set answers = v_clean, version = v_version, status = v_status, title = v_title, "avatarUrl" = v_avatar, "coverUrl" = v_cover,
           "rejectReason" = case when v_status = 'rejected' then "rejectReason" else null end,
           "submittedAt" = case when p_submit then now() else "submittedAt" end, "updatedAt" = now()
     where id = v_id;
  end if;

  if p_submit and v_status = 'pending' then
    perform public.community_notify(m."userId", v_me, 'community_sheet', 'Nova ficha para aprovar', v_title,
      '/comunidades/' || c.slug || '/fichas/' || v_id, 'sheet:' || v_id || ':' || extract(epoch from now())::bigint, null)
      from public."CommunityMember" m join public."Community" c on c.id = m."communityId"
     where m."communityId" = p_community and public.sheet_manager(m."userId", p_community) and m."userId" <> v_me
     limit 50;
  end if;
  return jsonb_build_object('id', v_id, 'status', v_status);
end $$;

create or replace function public.sheet_review(p_sheet text, p_approve boolean, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_me text := auth.uid()::text; s record; v_slug text;
begin
  select * into s from public."CommunitySheet" where id = p_sheet;
  if not found then raise exception 'not_found' using errcode = 'no_data_found'; end if;
  if not public.sheet_manager(v_me, s."communityId") then raise exception 'community_forbidden' using errcode = 'insufficient_privilege'; end if;
  update public."CommunitySheet"
     set status = case when p_approve then 'approved' else 'rejected' end,
         "rejectReason" = case when p_approve then null else left(nullif(btrim(coalesce(p_reason, '')), ''), 1000) end,
         "reviewedAt" = now(), "reviewedBy" = v_me, "updatedAt" = now()
   where id = p_sheet;
  select slug into v_slug from public."Community" where id = s."communityId";
  perform public.community_notify(s."userId", v_me, 'community_sheet',
    case when p_approve then 'Sua ficha foi aprovada' else 'Sua ficha precisa de ajustes' end,
    coalesce(s.title, 'Ficha') || case when p_approve then '' else coalesce(': ' || nullif(btrim(coalesce(p_reason, '')), ''), '') end,
    '/comunidades/' || v_slug || '/fichas/' || p_sheet, 'sheetreview:' || p_sheet || ':' || extract(epoch from now())::bigint, null);
  perform public.community_log(s."communityId", 'sheet_review', 'community_sheet', p_sheet, jsonb_build_object('approve', p_approve));
end $$;

-- Campos exclusivos do narrador (o membro vê, mas não edita).
create or replace function public.sheet_narrate(p_sheet text, p_values jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_me text := auth.uid()::text; s record; v_tpl jsonb; b jsonb; v_clean jsonb := '{}'::jsonb; v_fid text; v_val jsonb;
begin
  select * into s from public."CommunitySheet" where id = p_sheet;
  if not found then raise exception 'not_found' using errcode = 'no_data_found'; end if;
  if not public.sheet_narrator(v_me, s."communityId") then raise exception 'community_forbidden' using errcode = 'insufficient_privilege'; end if;
  select published into v_tpl from public."CommunitySheetTemplate" where "communityId" = s."communityId";
  for b in select e from jsonb_array_elements(coalesce(jsonb_extract_path(v_tpl, 'blocks'), '[]'::jsonb)) e loop
    if coalesce(jsonb_extract_path_text(b, 'kind'), '') <> 'field' or not coalesce((jsonb_extract_path_text(b, 'narratorOnly'))::boolean, false) then continue; end if;
    v_fid := jsonb_extract_path_text(b, 'id');
    v_val := jsonb_extract_path(coalesce(p_values, '{}'::jsonb), v_fid);
    if not public.sheet_blank(v_val) then
      if jsonb_typeof(v_val) = 'string' and char_length(public.sheet_text(v_val)) > 8000 then raise exception 'invalid_sheet' using errcode = 'check_violation'; end if;
      v_clean := v_clean || jsonb_build_object(v_fid, v_val);
    end if;
  end loop;
  update public."CommunitySheet" set narrator = v_clean, "updatedAt" = now() where id = p_sheet;
  perform public.community_log(s."communityId", 'sheet_narrate', 'community_sheet', p_sheet, '{}'::jsonb);
end $$;

create or replace function public.sheet_delete(p_sheet text)
returns void language plpgsql security definer set search_path = public as $$
declare v_me text := auth.uid()::text; s record;
begin
  select * into s from public."CommunitySheet" where id = p_sheet;
  if not found then raise exception 'not_found' using errcode = 'no_data_found'; end if;
  if s."userId" <> v_me and not public.sheet_manager(v_me, s."communityId") then raise exception 'community_forbidden' using errcode = 'insufficient_privilege'; end if;
  delete from public."CommunitySheet" where id = p_sheet;
  if s."userId" <> v_me then
    perform public.community_log(s."communityId", 'sheet_delete', 'community_sheet', p_sheet, '{}'::jsonb);
  end if;
end $$;

revoke all on function public.sheet_manager(text, text) from public, anon, authenticated;
revoke all on function public.sheet_narrator(text, text) from public, anon, authenticated;
revoke all on function public.sheet_template_get(text) from public, anon;
revoke all on function public.sheet_template_save(text, jsonb) from public, anon;
revoke all on function public.sheet_template_publish(text) from public, anon;
revoke all on function public.sheet_save(text, text, jsonb, boolean) from public, anon;
revoke all on function public.sheet_review(text, boolean, text) from public, anon;
revoke all on function public.sheet_narrate(text, jsonb) from public, anon;
revoke all on function public.sheet_delete(text) from public, anon;
grant execute on function public.sheet_template_get(text) to authenticated;
grant execute on function public.sheet_template_save(text, jsonb) to authenticated;
grant execute on function public.sheet_template_publish(text) to authenticated;
grant execute on function public.sheet_save(text, text, jsonb, boolean) to authenticated;
grant execute on function public.sheet_review(text, boolean, text) to authenticated;
grant execute on function public.sheet_narrate(text, jsonb) to authenticated;
grant execute on function public.sheet_delete(text) to authenticated;
