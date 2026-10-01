-- Chamadas de voz e vídeo (1:1). A mídia vai direto entre os aparelhos (WebRTC); o banco só
-- guarda o registro da chamada e decide quem pode ligar para quem (mesma regra do Messenger:
-- conversa 1:1 entre amigos, sem bloqueio).
create table if not exists public."Call" (
  id text primary key default gen_random_uuid()::text,
  "conversationId" text not null references public."Conversation"(id) on delete cascade,
  "callerId" text not null references public."User"(id) on delete cascade,
  "calleeId" text not null references public."User"(id) on delete cascade,
  kind text not null check (kind in ('voice', 'video')),
  status text not null default 'ringing' check (status in ('ringing', 'accepted', 'declined', 'missed', 'canceled', 'ended', 'failed')),
  "createdAt" timestamptz not null default now(),
  "answeredAt" timestamptz,
  "endedAt" timestamptz
);
create index if not exists call_callee_created_idx on public."Call" ("calleeId", "createdAt" desc);
create index if not exists call_caller_created_idx on public."Call" ("callerId", "createdAt" desc);

alter table public."Call" enable row level security;
drop policy if exists call_select_participants on public."Call";
create policy call_select_participants on public."Call" for select
  using (auth.uid()::text in ("callerId", "calleeId"));
-- Sem insert/update/delete direto: tudo passa pelas funções abaixo.
revoke all on public."Call" from anon, authenticated;
grant select on public."Call" to authenticated;

-- Ligações que ficaram tocando sem resposta viram "perdidas" (ex.: quem ligou fechou o app).
create or replace function public.call_expire_stale()
returns void language sql security definer set search_path = public as $$
  update "Call" set status = 'missed', "endedAt" = now()
   where status = 'ringing' and "createdAt" < now() - interval '60 seconds';
  update "Call" set status = 'ended', "endedAt" = now()
   where status = 'accepted' and "answeredAt" < now() - interval '12 hours';
$$;

create or replace function public.call_start(p_conversation text, p_kind text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_me text := auth.uid()::text;
  v_other text;
  v_group boolean;
  v_saved boolean;
  v_id text;
  v_caller record;
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  if p_kind not in ('voice', 'video') then raise exception 'invalid kind'; end if;
  select "isGroup", "isSaved" into v_group, v_saved from "Conversation" where id = p_conversation;
  if v_group is null then raise exception 'conversation not found'; end if;
  if v_group or v_saved then raise exception 'group_not_supported'; end if;
  if public.conversation_send_status(p_conversation) <> 'ok' then raise exception 'not_allowed'; end if;
  select "userId" into v_other from "ConversationMember"
   where "conversationId" = p_conversation and "userId" <> v_me limit 1;
  if v_other is null then raise exception 'not_allowed'; end if;

  perform public.call_expire_stale();
  -- Evita chamadas em paralelo saindo do mesmo usuário.
  update "Call" set status = 'canceled', "endedAt" = now()
   where "callerId" = v_me and status = 'ringing';

  insert into "Call" ("conversationId", "callerId", "calleeId", kind)
  values (p_conversation, v_me, v_other, p_kind) returning id into v_id;

  select name, "avatarUrl" into v_caller from "User" where id = v_me;
  begin
    perform enqueue_push(
      array[v_other],
      jsonb_build_object(
        'title', coalesce(v_caller.name, 'ÓrbitaX'),
        'body', case when p_kind = 'video' then 'Chamada de vídeo recebida' else 'Chamada de voz recebida' end,
        'url', '/chamadas',
        'tag', 'call-' || v_id,
        'icon', v_caller."avatarUrl"
      )
    );
  exception when others then null; -- push nunca bloqueia a chamada
  end;
  return v_id;
end $$;

-- accept / decline (quem recebe), cancel / miss (quem liga), end / fail (qualquer um).
create or replace function public.call_update(p_call text, p_action text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_me text := auth.uid()::text;
  c record;
begin
  select * into c from "Call" where id = p_call for update;
  if c.id is null or v_me not in (c."callerId", c."calleeId") then raise exception 'not found'; end if;

  if p_action = 'accept' and v_me = c."calleeId" and c.status = 'ringing' then
    update "Call" set status = 'accepted', "answeredAt" = now() where id = p_call;
    return 'accepted';
  elsif p_action = 'decline' and v_me = c."calleeId" and c.status = 'ringing' then
    update "Call" set status = 'declined', "endedAt" = now() where id = p_call;
    return 'declined';
  elsif p_action in ('cancel', 'miss') and v_me = c."callerId" and c.status = 'ringing' then
    update "Call" set status = case when p_action = 'miss' then 'missed' else 'canceled' end, "endedAt" = now() where id = p_call;
    return case when p_action = 'miss' then 'missed' else 'canceled' end;
  elsif p_action = 'end' and c.status = 'accepted' then
    update "Call" set status = 'ended', "endedAt" = now() where id = p_call;
    return 'ended';
  elsif p_action = 'end' and c.status = 'ringing' then
    update "Call" set status = case when v_me = c."callerId" then 'canceled' else 'declined' end, "endedAt" = now() where id = p_call;
    return 'ended';
  elsif p_action = 'fail' and c.status in ('ringing', 'accepted') then
    update "Call" set status = 'failed', "endedAt" = now() where id = p_call;
    return 'failed';
  end if;
  return c.status; -- ação fora de hora: devolve o estado atual sem mudar nada
end $$;

revoke all on function public.call_expire_stale() from public, anon, authenticated;
revoke all on function public.call_start(text, text) from public, anon;
revoke all on function public.call_update(text, text) from public, anon;
grant execute on function public.call_start(text, text) to authenticated;
grant execute on function public.call_update(text, text) to authenticated;

-- Realtime: avisa a chamada recebida e as mudanças de estado (RLS decide quem recebe).
do $$ begin
  alter publication supabase_realtime add table public."Call";
exception when duplicate_object then null;
end $$;

-- Sinalização das chamadas em canal Realtime PRIVADO "call:<id>": só quem liga e quem recebe entram.
create or replace function public.call_topic_allowed(p_topic text)
returns boolean language sql stable security definer set search_path = public as $$
  select p_topic like 'call:%' and exists (
    select 1 from "Call" c
     where c.id = substring(p_topic from 6)
       and auth.uid()::text in (c."callerId", c."calleeId")
       and c.status in ('ringing', 'accepted')
  )
$$;
revoke all on function public.call_topic_allowed(text) from public, anon;
grant execute on function public.call_topic_allowed(text) to authenticated;

drop policy if exists call_signal_receive on realtime.messages;
create policy call_signal_receive on realtime.messages for select to authenticated
  using (realtime.messages.extension = 'broadcast' and public.call_topic_allowed(realtime.topic()));
drop policy if exists call_signal_send on realtime.messages;
create policy call_signal_send on realtime.messages for insert to authenticated
  with check (realtime.messages.extension = 'broadcast' and public.call_topic_allowed(realtime.topic()));
