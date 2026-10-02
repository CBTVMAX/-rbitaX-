-- Contatos da comunidade (como no VK): pessoas escolhidas pelo dono/administradores, cada uma com
-- um cargo livre ("President MC®", "Vice President MC®", "Official Page MC®"…).
-- Sem o operador ->> de propósito: ao copiar o SQL pelo celular, o ">>" virava "»" e quebrava a função.
alter table public."Community" add column if not exists contacts jsonb not null default '[]'::jsonb;

create or replace function public.community_set_contacts(p_community text, p_contacts jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_me text := auth.uid()::text; v_clean jsonb;
begin
  if public.community_rank(public.community_role(v_me, p_community)) < 3 then
    raise exception 'forbidden' using errcode = 'insufficient_privilege';
  end if;
  if jsonb_typeof(p_contacts) <> 'array' or jsonb_array_length(p_contacts) > 10 then
    raise exception 'invalid_contacts' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_contacts) c
     where coalesce(jsonb_extract_path_text(c, 'userId'), '') = ''
        or char_length(btrim(coalesce(jsonb_extract_path_text(c, 'title'), ''))) > 60
        or not exists (select 1 from public."User" u where u.id = jsonb_extract_path_text(c, 'userId'))
  ) or (select count(distinct jsonb_extract_path_text(c, 'userId')) from jsonb_array_elements(p_contacts) c) <> jsonb_array_length(p_contacts) then
    raise exception 'invalid_contacts' using errcode = 'check_violation';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('userId', jsonb_extract_path_text(c, 'userId'), 'title', btrim(coalesce(jsonb_extract_path_text(c, 'title'), ''))) order by o), '[]'::jsonb)
    into v_clean
    from jsonb_array_elements(p_contacts) with ordinality as t(c, o);
  update public."Community" set contacts = v_clean, "updatedAt" = now() where id = p_community;
  perform public.community_log(p_community, 'contacts_update', 'community', p_community, jsonb_build_object('count', jsonb_array_length(v_clean)));
  return v_clean;
end $$;

revoke all on function public.community_set_contacts(text, jsonb) from public, anon;
grant execute on function public.community_set_contacts(text, jsonb) to authenticated;
