-- Presentes visíveis no perfil para qualquer pessoa logada (como no VK), sem expor a tabela inteira:
-- quem enviou, quando, o presente e a mensagem. Bloqueios entre as pessoas escondem tudo.
create or replace function public.profile_gifts(p_user text, p_limit int default 100)
returns table (id text, note text, "createdAt" timestamptz, sender jsonb, product jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select g.id::text, g.note, g."createdAt",
         jsonb_build_object('id', u.id, 'name', u.name, 'username', u.username, 'avatarUrl', u."avatarUrl"),
         jsonb_build_object('name', p.name, 'image', p.image)
    from "VirtualGift" g
    join "User" u on u.id = g."senderId"
    join "StoreProduct" p on p.id = g."productId"
   where g."recipientId" = p_user
     and auth.uid() is not null
     and not public.is_blocked_between(auth.uid()::text, p_user)
   order by g."createdAt" desc
   limit least(greatest(coalesce(p_limit, 100), 1), 200)
$$;

revoke all on function public.profile_gifts(text, int) from public, anon;
grant execute on function public.profile_gifts(text, int) to authenticated;
