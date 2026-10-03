-- Órbita X é só para quem tem conta: visitantes (papel anon) não leem nada pela API.
-- Perfis, comunidades, publicações e qualquer recurso exigem login. Pessoas logadas continuam
-- exatamente com as mesmas permissões de antes (o que vinha de PUBLIC passa a ser dado a authenticated).
-- Fica liberado para visitante só o necessário ao funcionamento: api_guard (roda em toda requisição)
-- e android_cert_fingerprint (verificação do app Android em /.well-known/assetlinks.json).

do $$
declare r record;
begin
  -- Tabelas, visões e sequências: nada para anon.
  for r in select c.oid::regclass as rel from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind in ('r', 'v', 'm', 'p', 'f') loop
    execute format('revoke all on table %s from anon', r.rel);
  end loop;
  for r in select c.oid::regclass as rel from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind = 'S' loop
    execute format('revoke all on sequence %s from anon', r.rel);
  end loop;

  -- Funções: quem tinha execução por PUBLIC continua valendo para authenticated e service_role.
  for r in select p.oid::regprocedure as sig, p.proacl from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.prokind in ('f', 'p') loop
    if r.proacl is null or exists (select 1 from aclexplode(r.proacl) a where a.grantee = 0 and a.privilege_type = 'EXECUTE') then
      execute format('grant execute on function %s to authenticated, service_role', r.sig);
      execute format('revoke execute on function %s from public', r.sig);
    end if;
    execute format('revoke execute on function %s from anon', r.sig);
  end loop;
end $$;

grant execute on function public.api_guard() to anon;
grant execute on function public.android_cert_fingerprint() to anon;

-- Daqui em diante, objetos novos também nascem fechados para visitantes.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from anon;
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public grant execute on functions to authenticated, service_role;

-- "Avise-me" (Explorar): agora só para quem está logado, e passa a funcionar para essas pessoas.
grant insert on public."Waitlist" to authenticated;
