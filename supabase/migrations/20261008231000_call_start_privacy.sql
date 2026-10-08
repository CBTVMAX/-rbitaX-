-- Chamadas seguem "Quem pode me ligar", não "Quem pode me escrever": quem limitou só as mensagens
-- continua recebendo ligações de quem pode ligar (a regra das chamadas fica no gatilho call_privacy_guard).
do $$
declare v_def text := pg_get_functiondef('public.call_start(text,text)'::regprocedure);
begin
  if position('<> ''ok'' then raise exception ''not_allowed''' in v_def) > 0 then
    execute replace(v_def, 'public.conversation_send_status(p_conversation) <> ''ok'' then raise exception ''not_allowed''',
                    'public.conversation_send_status(p_conversation) not in (''ok'', ''restricted'') then raise exception ''not_allowed''');
  end if;
end $$;
