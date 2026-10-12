-- Arquivos só para quem tem conta (parte 2a): endereços públicos antigos do bucket "media"
-- salvos no banco passam a usar a rota /m/media/... (que confere o login).
-- Os gatilhos de auditoria ficam desligados durante a troca para não registrar edições falsas.
alter table public."Community" disable trigger community_audit;
alter table public."CommunityDiscussion" disable trigger community_audit;
alter table public."User" disable trigger user_privilege_audit;

do $$
declare r record; v_prefix text := 'https://hrfrwsedjtvkmpaniijl.supabase.co/storage/v1/object/public/media/';
begin
  for r in
    select c.table_name, c.column_name, c.data_type, c.udt_name
      from information_schema.columns c
      join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name and t.table_type = 'BASE TABLE'
     where c.table_schema = 'public' and c.data_type in ('text', 'jsonb', 'json', 'character varying', 'ARRAY')
  loop
    execute format(
      'update public.%I set %I = replace(%I::text, %L, %L)::%s where %I::text like %L',
      r.table_name, r.column_name, r.column_name, v_prefix, 'https://orbitax.social.br/m/media/',
      case when r.data_type = 'ARRAY' then r.udt_name::regtype::text else r.data_type end,
      r.column_name, '%' || v_prefix || '%');
  end loop;
end $$;

alter table public."Community" enable trigger community_audit;
alter table public."CommunityDiscussion" enable trigger community_audit;
alter table public."User" enable trigger user_privilege_audit;
