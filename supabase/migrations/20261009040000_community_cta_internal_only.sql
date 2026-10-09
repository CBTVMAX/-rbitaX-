-- Botão de ação só com destinos dentro do Órbita X (ninguém é levado para fora):
-- Escrever mensagem, Ver evento ou Abrir discussão da própria comunidade.
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
  if v_type not in ('message', 'event', 'discussion') then raise exception 'invalid_type' using errcode = 'check_violation'; end if;
  if v_type = 'message' then v_target := ''; end if;
  if v_type = 'event' and not exists (select 1 from "CommunityEvent" where id = v_target and "communityId" = p_community) then
    raise exception 'invalid_target' using errcode = 'check_violation';
  end if;
  if v_type = 'discussion' and not exists (select 1 from "CommunityDiscussion" where id = v_target and "communityId" = p_community) then
    raise exception 'invalid_target' using errcode = 'check_violation';
  end if;
  if v_label = '' then
    v_label := case v_type when 'message' then 'Enviar mensagem' when 'event' then 'Ver evento' else 'Abrir discussão' end;
  end if;
  v_out := jsonb_build_object('enabled', true, 'type', v_type, 'target', v_target, 'label', v_label);
  update "Community" set cta = v_out where id = p_community;
  return v_out;
end $$;

-- Qualquer valor antigo com destino externo fica desligado.
update public."Community" set cta = cta || '{"enabled": false}'::jsonb
 where cta is not null and coalesce(cta->>'type', '') not in ('message', 'event', 'discussion');
