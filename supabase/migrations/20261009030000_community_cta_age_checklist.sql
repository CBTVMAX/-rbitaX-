-- Comunidades (padrão VK): botão de ação com cliques nas estatísticas e restrição por idade.

alter table public."Community" add column if not exists cta jsonb;
alter table public."Community" add column if not exists "ageLimit" int not null default 0;
alter table public."Community" add constraint community_age_limit_check check ("ageLimit" in (0, 16, 18)) not valid;

create table if not exists public."CommunityCtaClick" (
  "communityId" text not null,
  "userId" text not null,
  day date not null default current_date,
  primary key ("communityId", "userId", day)
);
alter table public."CommunityCtaClick" enable row level security;
-- Sem leitura direta: o total sai pela função das estatísticas.

-- Botão de ação: enabled, type (message | site | whatsapp | phone | email), target e texto.
create or replace function public.community_set_cta(p_community text, p_cta jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_me text := auth.uid()::text; v_type text; v_target text; v_label text; v_out jsonb;
begin
  if public.community_rank(public.community_role(v_me, p_community)) < 3 then raise exception 'forbidden' using errcode = 'insufficient_privilege'; end if;
  if p_cta is null or not coalesce((p_cta->>'enabled')::boolean, false) then
    update "Community" set cta = case when p_cta is null then null else coalesce(cta, '{}'::jsonb) || '{"enabled": false}'::jsonb end where id = p_community;
    return (select cta from "Community" where id = p_community);
  end if;
  v_type := p_cta->>'type';
  v_target := btrim(coalesce(p_cta->>'target', ''));
  v_label := left(btrim(coalesce(p_cta->>'label', '')), 30);
  if v_type not in ('message', 'site', 'whatsapp', 'phone', 'email') then raise exception 'invalid_type' using errcode = 'check_violation'; end if;
  if v_type = 'site' and v_target !~ '^https://[^\s]+\.[^\s]+$' then raise exception 'invalid_target' using errcode = 'check_violation'; end if;
  if v_type in ('whatsapp', 'phone') then
    v_target := regexp_replace(v_target, '[^0-9+]', '', 'g');
    if v_target !~ '^\+?[0-9]{10,15}$' then raise exception 'invalid_target' using errcode = 'check_violation'; end if;
  end if;
  if v_type = 'email' and v_target !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid_target' using errcode = 'check_violation'; end if;
  if v_type = 'message' then v_target := ''; end if;
  if v_label = '' then
    v_label := case v_type when 'message' then 'Enviar mensagem' when 'site' then 'Abrir site' when 'whatsapp' then 'Chamar no WhatsApp'
                           when 'phone' then 'Ligar' else 'Enviar e-mail' end;
  end if;
  v_out := jsonb_build_object('enabled', true, 'type', v_type, 'target', left(v_target, 300), 'label', v_label);
  update "Community" set cta = v_out where id = p_community;
  return v_out;
end $$;

create or replace function public.community_cta_click(p_community text)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if auth.uid() is null then return; end if;
  insert into "CommunityCtaClick" ("communityId", "userId") values (p_community, auth.uid()::text) on conflict do nothing;
end $$;

create or replace function public.community_cta_stats(p_community text, p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
begin
  if public.community_rank(public.community_role(auth.uid()::text, p_community)) < 3 then raise exception 'forbidden' using errcode = 'insufficient_privilege'; end if;
  return jsonb_build_object(
    'clicks', (select count(*) from "CommunityCtaClick" where "communityId" = p_community and day > current_date - greatest(1, least(p_days, 365))),
    'people', (select count(distinct "userId") from "CommunityCtaClick" where "communityId" = p_community and day > current_date - greatest(1, least(p_days, 365))));
end $$;

-- Restrição por idade: 16+ e 18+ somem das recomendações e da busca; quem não tem a idade vê um aviso.
create or replace function public.community_set_age_limit(p_community text, p_limit int)
returns int language plpgsql security definer set search_path to 'public' as $$
begin
  if public.community_rank(public.community_role(auth.uid()::text, p_community)) < 3 then raise exception 'forbidden' using errcode = 'insufficient_privilege'; end if;
  if p_limit not in (0, 16, 18) then raise exception 'invalid_limit' using errcode = 'check_violation'; end if;
  update "Community" set "ageLimit" = p_limit where id = p_community;
  return p_limit;
end $$;

-- A idade sai da data de nascimento (que continua privada); membros e equipe sempre entram.
create or replace function public.community_age_ok(p_community text)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select coalesce((select "ageLimit" from "Community" where id = p_community), 0) = 0
      or exists (select 1 from "CommunityMember" m where m."communityId" = p_community and m."userId" = auth.uid()::text)
      or coalesce((select extract(year from age(p."birthDate"::date)) from "Profile" p where p."userId" = auth.uid()::text), 0)
           >= (select "ageLimit" from "Community" where id = p_community)
$$;

revoke all on function public.community_set_cta(text, jsonb), public.community_cta_click(text), public.community_cta_stats(text, int),
  public.community_set_age_limit(text, int), public.community_age_ok(text) from public, anon;
grant execute on function public.community_set_cta(text, jsonb), public.community_cta_click(text), public.community_cta_stats(text, int),
  public.community_set_age_limit(text, int), public.community_age_ok(text) to authenticated;
