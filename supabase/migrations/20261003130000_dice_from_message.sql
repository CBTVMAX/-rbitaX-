-- Dados no grupo como o rolador do VK: a pessoa escreve normalmente e coloca "/r d20" em qualquer
-- parte da mensagem ("Pedir ajuda. /r d10" ou "/r d20 Cuidar do hospital"). A mensagem dela fica no
-- chat como está e, logo em seguida, o servidor responde citando-a com o resultado.
-- O resultado é sorteado no servidor e só ele cria mensagens de dado (nada de resultado forjado).
-- (Sem os operadores de seta do jsonb: o SQL pode ser colado no editor sem se corromper.)

-- 1) Só o servidor cria mensagens do tipo "dice".
create or replace function public.message_dice_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.type = 'dice' and coalesce(current_setting('orbitax.dice_message', true), '') <> 'on' then
    raise exception 'invalid_message_type' using errcode = 'check_violation';
  end if;
  return new;
end $$;

create or replace trigger message_dice_guard before insert on public."Message"
  for each row execute function public.message_dice_guard();

-- 2) Rolagem a partir do texto da mensagem (resposta citando a mensagem original).
create or replace function public.dice_roll_reply(p_conversation_id text, p_user text, p_expr text, p_reply_to text)
returns text language plpgsql security definer set search_path = public as $$
declare
  m text[];
  v_count int; v_sides int;
  v_rolls int[] := '{}'; v_total int := 0; v_i int; v_r int;
  v_dice text; v_name text; v_msg_id text := gen_random_uuid()::text;
begin
  m := regexp_match(lower(btrim(p_expr)), '^([0-9]{0,2})d([0-9]{1,3})$');
  if m is null then return null; end if;
  v_count := coalesce(nullif(m[1], '')::int, 1);
  v_sides := m[2]::int;
  if v_count < 1 or v_count > 20 or v_sides not in (4,6,8,10,12,20,100) then return null; end if;

  for v_i in 1..v_count loop
    v_r := public.secure_die(v_sides);
    v_rolls := array_append(v_rolls, v_r);
    v_total := v_total + v_r;
  end loop;

  v_dice := case when v_count > 1 then v_count::text else '' end || 'd' || v_sides;
  select name into v_name from "User" where id = p_user;

  perform set_config('orbitax.dice_message', 'on', true);
  insert into "Message" (id, "conversationId", "senderId", content, type, attachments, meta, "replyToId")
  values (v_msg_id, p_conversation_id, p_user,
          '🎲 ' || coalesce(v_name, 'Alguém') || ' rolou ' || v_dice || ' · Dados: [' || array_to_string(v_rolls, ', ') || '] · Resultado: ' || v_total,
          'dice', '[]'::jsonb,
          jsonb_build_object('roll', jsonb_build_object(
            'dice', v_dice, 'sides', v_sides, 'count', v_count,
            'rolls', to_jsonb(v_rolls), 'total', v_total, 'player', coalesce(v_name, 'Alguém'))),
          p_reply_to);
  perform set_config('orbitax.dice_message', '', true);

  insert into "DiceRoll" (id, "conversationId", "userId", dice, sides, count, rolls, total, "messageId")
  values (gen_random_uuid(), p_conversation_id, p_user, v_dice, v_sides, v_count, v_rolls, v_total, v_msg_id);
  return v_msg_id;
end $$;

revoke all on function public.dice_roll_reply(text, text, text, text) from public, anon, authenticated;

create or replace function public.message_dice_command()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  m text[];
begin
  if new.type <> 'text' then return new; end if;
  if not exists (select 1 from "Conversation" where id = new."conversationId" and "isGroup") then return new; end if;
  m := regexp_match(new.content, '(?:^|\s)/(?:r|roll)\s+([0-9]{0,2}[dD][0-9]{1,3})(?=$|[\s.,!?;:)])', 'i');
  if m is null then return new; end if;
  perform public.dice_roll_reply(new."conversationId", new."senderId", m[1], new.id);
  return new;
exception when others then
  return new; -- a rolagem nunca impede a mensagem de ser enviada
end $$;

create or replace trigger message_dice_command after insert on public."Message"
  for each row execute function public.message_dice_command();

-- 3) A rolagem pelo comando antigo (roll_dice) continua funcionando, agora com a permissão.
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

  perform set_config('orbitax.dice_message', 'on', true);
  insert into "Message" (id, "conversationId", "senderId", content, type, attachments, meta)
  values (v_msg_id, p_conversation_id, v_me, v_body, 'dice', '[]'::jsonb,
          jsonb_build_object('roll', jsonb_strip_nulls(jsonb_build_object(
            'dice', v_dice, 'sides', v_sides, 'count', v_count,
            'rolls', to_jsonb(v_rolls), 'total', v_total, 'player', coalesce(v_name,'Alguém'),
            'reason', v_reason))));
  perform set_config('orbitax.dice_message', '', true);

  insert into "DiceRoll" (id, "conversationId", "userId", dice, sides, count, rolls, total, "messageId")
  values (gen_random_uuid(), p_conversation_id, v_me, v_dice, v_sides, v_count, v_rolls, v_total, v_msg_id);

  return jsonb_build_object('ok', true, 'dice', v_dice, 'rolls', to_jsonb(v_rolls), 'total', v_total, 'messageId', v_msg_id, 'reason', v_reason);
end $function$;
