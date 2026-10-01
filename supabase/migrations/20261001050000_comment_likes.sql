-- Curtidas em comentários (coração ao lado de cada comentário, como no VK).
-- Só curte quem consegue ver o comentário; o autor do comentário é avisado uma vez por pessoa.

create table if not exists public."CommentLike" (
  "commentId" text not null references public."Comment"(id) on delete cascade,
  "userId"    text not null references public."User"(id) on delete cascade,
  "createdAt" timestamptz not null default now(),
  primary key ("commentId", "userId")
);
create index if not exists commentlike_user_idx on public."CommentLike" ("userId");

alter table public."CommentLike" enable row level security;

-- Ler/curtir depende de ver o comentário: a subconsulta passa pelo RLS de "Comment" (e do post).
create policy commentlike_select on public."CommentLike" for select to authenticated
  using (exists (select 1 from public."Comment" c where c.id = "CommentLike"."commentId"));

create policy commentlike_insert_self on public."CommentLike" for insert to authenticated
  with check (
    "userId" = auth.uid()::text
    and exists (select 1 from public."Comment" c where c.id = "CommentLike"."commentId" and c.status = 'visible')
  );

create policy commentlike_delete_self on public."CommentLike" for delete to authenticated
  using ("userId" = auth.uid()::text);

grant select, insert, delete on public."CommentLike" to authenticated;

create or replace function public.notify_on_comment_like()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_c record; v_comm text; v_slug text;
begin
  select "userId", "postId" into v_c from public."Comment" where id = new."commentId";
  if v_c."userId" is null or v_c."userId" = new."userId" then return new; end if;
  select "communityId" into v_comm from public."Post" where id = v_c."postId";
  if v_comm is not null then select slug into v_slug from public."Community" where id = v_comm; end if;
  perform public.community_notify(v_c."userId", new."userId", 'comment_like', 'Curtida no comentário',
    'curtiu seu comentário',
    case when v_slug is not null then '/comunidades/' || v_slug || '?post=' || v_c."postId" else '/feed' end,
    'clike:' || new."commentId" || ':' || new."userId", v_c."postId");
  return new;
end $$;

revoke all on function public.notify_on_comment_like() from public, anon, authenticated;

drop trigger if exists notify_on_comment_like on public."CommentLike";
create trigger notify_on_comment_like after insert on public."CommentLike"
  for each row execute function public.notify_on_comment_like();
