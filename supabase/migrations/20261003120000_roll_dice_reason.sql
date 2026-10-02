-- Dados no grupo com motivo: "/r d20 ataque no dragão" rola o D20 e guarda o texto depois do dado
-- (até 200 caracteres) como motivo, mostrado no cartão da rolagem e na prévia da conversa.
-- (Sem os operadores de seta do jsonb: o SQL pode ser colado no editor sem se corromper.)
create or replace function public.roll_dice(p_conversation_id text, p_expr text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_me text := auth.uid()::text;
  v_group boolean;
  v_name text;
  v_input text := btrim(coalesce(p_expr, ''));
  v_raw text;
  v_reason text;
  v_count int; v_sides int;
  v_rolls int[] := '{}'; v_total int := 0; v_i int; v_r int;
  v_dice text; v_msg_id text := gen_random_uuid()::text; v_body text;
  m text[];
begin
  if v_me is null then raise exception 'not authenticated'; end if;

  select "isGroup" into v_group from "Conversation" where id = p_conversation_id;
  if v_group is null then raise exception 'not_found' using errcode='no_data_found'; end if;
  if not v_group then raise exception 'groups_only' using errcode='check_violation'; end if;
  if public.conversation_send_status(p_conversation_id) <> 'ok' then
    raise exception 'not_member' using errcode='insufficient_privilege';
  end if;

  -- Tolera o prefixo /r ou /roll; o primeiro termo é o dado (NdM), o resto é o motivo.
  v_input := regexp_replace(v_input, '^/?(r|roll)\s+', '', 'i');
  m := regexp_match(v_input, '^([0-9]{0,2}[dD][0-9]{1,3})(?:\s+(.*))?$', 's');
  if m is null then raise exception 'invalid_dice' using errcode='check_violation'; end if;
  v_raw := lower(m[1]);
  v_reason := nullif(left(btrim(regexp_replace(coalesce(m[2], ''), '^[-–—:]\s*', '')), 200), '');

  m := regexp_match(v_raw, '^([0-9]{0,2})d([0-9]{1,3})$');
  v_count := coalesce(nullif(m[1], '')::int, 1);
  v_sides := m[2]::int;
  if v_count < 1 or v_count > 20 then raise exception 'invalid_dice' using errcode='check_violation'; end if;
  if v_sides not in (4,6,8,10,12,20,100) then raise exception 'invalid_dice' using errcode='check_violation'; end if;

  for v_i in 1..v_count loop
    v_r := public.secure_die(v_sides);
    v_rolls := array_append(v_rolls, v_r);
    v_total := v_total + v_r;
  end loop;

  v_dice := case when v_count > 1 then v_count::text else '' end || 'd' || v_sides;
  select name into v_name from "User" where id = v_me;
  v_body := coalesce(v_name, 'Alguém') || ' rolou ' || upper(v_dice) || ' → ' || v_total
            || case when v_reason is not null then ' · ' || v_reason else '' end;

  insert into "Message" (id, "conversationId", "senderId", content, type, attachments, meta)
  values (v_msg_id, p_conversation_id, v_me, v_body, 'dice', '[]'::jsonb,
          jsonb_build_object('roll', jsonb_strip_nulls(jsonb_build_object(
            'dice', v_dice, 'sides', v_sides, 'count', v_count,
            'rolls', to_jsonb(v_rolls), 'total', v_total, 'player', coalesce(v_name,'Alguém'),
            'reason', v_reason))));

  insert into "DiceRoll" (id, "conversationId", "userId", dice, sides, count, rolls, total, "messageId")
  values (gen_random_uuid(), p_conversation_id, v_me, v_dice, v_sides, v_count, v_rolls, v_total, v_msg_id);

  return jsonb_build_object('ok', true, 'dice', v_dice, 'rolls', to_jsonb(v_rolls), 'total', v_total, 'messageId', v_msg_id, 'reason', v_reason);
end $function$;
