-- Publicações agendadas ("Quando publicar"): só o autor vê até a hora marcada.
alter table public."Post" add column if not exists "publishAt" timestamptz;

create or replace function public.post_schedule_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new."publishAt" is not null and new."publishAt" <= now() + interval '1 minute' then
      new."publishAt" := null; -- hora já passou: publica agora
    end if;
    if new."publishAt" is not null and new."publishAt" > now() + interval '90 days' then
      raise exception 'schedule_too_far';
    end if;
    -- A data do post é a da publicação; ninguém consegue "fixar no topo" com data no futuro.
    if new."publishAt" is not null then
      new."createdAt" := (new."publishAt" at time zone 'UTC');
    elsif new."createdAt" is null or new."createdAt" > (now() at time zone 'UTC') + interval '5 minutes' then
      new."createdAt" := (now() at time zone 'UTC');
    end if;
  else
    -- Depois de criado, data e agendamento não mudam.
    new."createdAt" := old."createdAt";
    new."publishAt" := old."publishAt";
  end if;
  return new;
end $$;

drop trigger if exists post_schedule_guard on public."Post";
create trigger post_schedule_guard before insert or update on public."Post"
  for each row execute function public.post_schedule_guard();

drop policy if exists post_select_visible on public."Post";
create policy post_select_visible on public."Post" for select
  using (
    "authorId" = auth.uid()::text
    or (
      ("publishAt" is null or "publishAt" <= now())
      and (
        visibility = 'public'
        or (visibility = 'followers' and exists (
          select 1 from "Follow" f
           where f."followerId" = auth.uid()::text and f."followingId" = "Post"."authorId" and f.status = 'accepted'))
      )
    )
  );

drop policy if exists post_select_anon on public."Post";
create policy post_select_anon on public."Post" for select
  using (visibility = 'public' and ("publishAt" is null or "publishAt" <= now()));

create index if not exists post_publish_at_idx on public."Post" ("publishAt") where "publishAt" is not null;
