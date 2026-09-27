-- Órbita X — suíte de testes de segurança (autorização, RLS, papéis, Coins, uploads).
--
-- Roda direto no banco e SEMPRE é revertida: cria usuários e dados temporários, executa cada
-- ataque como se fosse um cliente real (papel `authenticated`, com o JWT da vítima/atacante),
-- confere que o banco recusa e, no fim, levanta uma exceção com o relatório — o que desfaz tudo.
--
-- Uso (psql conectado ao projeto):  \i db/security-tests.sql
-- "Passou" = o ataque foi BLOQUEADO. A suíte falha se qualquer ataque conseguir passar.
--
-- Nota: a RLS reduz a zero linhas os UPDATE/DELETE em recursos de terceiros (não dá erro,
-- simplesmente não altera nada). Por isso `run()` devolve o número de linhas afetadas e um
-- ataque só "passou" quando escreveu de fato (OK com 1+ linhas) ou leu o que não podia.

begin;

-- Executa `q` como o usuário `u` (nível `aal`); devolve 'OK:<linhas>' ou 'ERR:<mensagem>'.
create or replace function pg_temp.run(u text, aal text, q text) returns text language plpgsql as $$
declare r text; n int;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated', 'aal', aal)::text, true);
  set local role authenticated;
  begin execute q; get diagnostics n = row_count; r := 'OK:' || n;
  exception when others then r := 'ERR:' || left(sqlerrm, 90); end;
  reset role;
  return r;
end $$;

-- Escrita/chamada que deveria ser bloqueada: falha se escreveu 1+ linhas.
create or replace function pg_temp.deny(nome text, res text) returns text language sql as
$$ select case when res ~ '^OK:[1-9]' then nome || ' -> deveria BLOQUEAR, mas escreveu' end $$;
-- Leitura que deveria ser bloqueada: falha se enxergou 1+ linhas.
create or replace function pg_temp.deny_read(nome text, res text) returns text language sql as
$$ select case when res ~ '^OK:[1-9]' then nome || ' -> deveria BLOQUEAR a leitura, mas enxergou' end $$;
-- Ação legítima: falha se deu erro ou não afetou nada.
create or replace function pg_temp.allow(nome text, res text) returns text language sql as
$$ select case when res ~ '^OK:[1-9]' then null else nome || ' -> deveria PERMITIR, mas ' || res end $$;
-- Rodou com segurança (sem erro) — usado quando o número de linhas não importa (ex.: SQLi neutralizada).
create or replace function pg_temp.no_error(nome text, res text) returns text language sql as
$$ select case when left(res, 3) = 'ERR' then nome || ' -> deveria rodar sem erro, mas ' || res end $$;

do $$
declare
  atacante text := gen_random_uuid()::text; extra text := gen_random_uuid()::text; vitima text;
  c text; own text;
  post_pub text := gen_random_uuid()::text; post_seg text := gen_random_uuid()::text; post_atk text := gen_random_uuid()::text;
  falhas text[] := '{}';
begin
  -- Usuários de teste (o gatilho handle_new_user cria a linha em public."User").
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
    (atacante::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'sec-atacante@orbitax.invalid', '{"name":"Atacante"}', now(), now()),
    (extra::uuid,    '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'sec-extra@orbitax.invalid',    '{"name":"Extra"}',    now(), now());
  if not exists (select 1 from "User" where id = atacante) then raise exception 'setup: gatilho de usuario nao criou a linha'; end if;
  select id into vitima from "User" where id <> atacante and id <> extra order by "createdAt" limit 1;
  if vitima is null then raise exception 'setup: e preciso ao menos um usuario existente como vitima'; end if;

  update "User" set "isPrivate" = true where id = vitima;
  insert into "Post"(id,"authorId",content,visibility,"updatedAt") values
    (post_pub, vitima, 'publico', 'public', now()),
    (post_seg, vitima, 'seguidores', 'followers', now()),
    (post_atk, atacante, 'do atacante', 'public', now());
  -- Semeia um evento de segurança da vítima, para o teste de leitura ter o que esconder.
  perform public.security_log(vitima, 'login', 'info');

  -- IDOR / mass assignment (bloqueado = 0 linhas)
  falhas := array_remove(falhas || pg_temp.deny('idor_update_perfil', pg_temp.run(atacante,'aal1', format('update "User" set bio=''x'' where id=%L', vitima))), null);
  falhas := array_remove(falhas || pg_temp.deny('post_em_nome_de_outro', pg_temp.run(atacante,'aal1', format('insert into "Post"(id,"authorId",content,"updatedAt") values (gen_random_uuid()::text,%L,''x'',now())', vitima))), null);
  falhas := array_remove(falhas || pg_temp.deny('inflar_viewcount', pg_temp.run(atacante,'aal1', format('insert into "Post"(id,"authorId",content,"updatedAt","viewCount") values (gen_random_uuid()::text,%L,''x'',now(),9999)', atacante))), null);
  falhas := array_remove(falhas || pg_temp.deny('forjar_moderacao', pg_temp.run(atacante,'aal1', format('update "Post" set "moderationStatus"=''pending'' where id=%L', post_atk))), null);
  falhas := array_remove(falhas || pg_temp.deny('promover_admin', pg_temp.run(atacante,'aal1', format('update "User" set role=''admin'' where id=%L', atacante))), null);
  falhas := array_remove(falhas || pg_temp.deny('forjar_verificado', pg_temp.run(atacante,'aal1', format('update "User" set "isVerified"=true where id=%L', atacante))), null);

  -- Conteúdo privado
  falhas := array_remove(falhas || pg_temp.deny('comentar_post_privado', pg_temp.run(atacante,'aal1', format('insert into "Comment"(id,"postId","userId",content,"updatedAt") values (gen_random_uuid()::text,%L,%L,''oi'',now())', post_seg, atacante))), null);
  falhas := array_remove(falhas || pg_temp.deny_read('ver_post_seguidores', pg_temp.run(atacante,'aal1', format('select 1 from "Post" where id=%L', post_seg))), null);

  -- Coins
  falhas := array_remove(falhas || pg_temp.deny('escrever_saldo', pg_temp.run(atacante,'aal1', format('update "CoinWallet" set balance=999999 where "userId"=%L', atacante))), null);
  falhas := array_remove(falhas || pg_temp.deny('criar_transacao', pg_temp.run(atacante,'aal1', format('insert into "CoinTransaction"("userId",amount,"balanceAfter",kind) values (%L,500,500,''grant'')', atacante))), null);
  falhas := array_remove(falhas || pg_temp.deny('coins_apply_direto', pg_temp.run(atacante,'aal1', format('select public.coins_apply(%L,1000,''grant'',null,null,''x'')', atacante))), null);
  falhas := array_remove(falhas || pg_temp.deny('admin_grant_sem_admin', pg_temp.run(atacante,'aal1', format('select public.admin_grant_coins(%L,1000,''x'')', atacante))), null);

  -- Injeção / gatilhos / auditoria
  falhas := array_remove(falhas || pg_temp.deny('chamar_gatilho', pg_temp.run(atacante,'aal1', 'select public.community_audit()')), null);
  falhas := array_remove(falhas || pg_temp.deny_read('ler_log_alheio', pg_temp.run(atacante,'aal1', format('select 1 from "SecurityEvent" where "userId"=%L', vitima))), null);
  -- A busca com aspas/`;`/`--` não pode derrubar nada nem retornar erro de sintaxe (SQLi neutralizada).
  falhas := array_remove(falhas || pg_temp.no_error('sqli_busca_neutralizada', pg_temp.run(atacante,'aal1', 'select id from public.search_profiles($x$'' or 1=1; drop table "User"; --$x$, 5, 0) limit 1')), null);

  -- URLs perigosas (num post do próprio atacante, para o CHECK realmente disparar)
  falhas := array_remove(falhas || pg_temp.deny('link_javascript', pg_temp.run(atacante,'aal1', format('update "Post" set "linkUrl"=''javascript:alert(1)'' where id=%L', post_atk))), null);
  falhas := array_remove(falhas || pg_temp.deny('avatar_javascript', pg_temp.run(atacante,'aal1', format('update "User" set "avatarUrl"=''javascript:alert(1)'' where id=%L', atacante))), null);

  -- Admin de plataforma exige 2FA (aal2)
  update "User" set role = 'admin' where id = atacante;  -- promovido só neste teste (revertido)
  falhas := array_remove(falhas || pg_temp.deny('admin_sem_2fa_pack', pg_temp.run(atacante,'aal1', 'select public.admin_save_pack(''{}''::jsonb)')), null);
  falhas := array_remove(falhas || pg_temp.deny('admin_sem_2fa_painel', pg_temp.run(atacante,'aal1', 'select public.admin_security_overview(24)')), null);
  falhas := array_remove(falhas || pg_temp.deny('admin_sem_2fa_coins', pg_temp.run(atacante,'aal1', format('select public.admin_grant_coins(%L,10,''x'')', extra))), null);
  update "User" set role = 'user' where id = atacante;

  -- Comunidades: hierarquia de cargos
  select "communityId", "userId" into c, own from "CommunityMember" where role = 'owner' limit 1;
  if c is not null then
    delete from "CommunityMember" where "communityId" = c and "userId" = atacante;
    insert into "CommunityMember"(id,"communityId","userId",role) values (gen_random_uuid()::text, c, atacante, 'moderator');
    falhas := array_remove(falhas || pg_temp.deny('mod_rebaixa_owner', pg_temp.run(atacante,'aal1', format('select public.community_set_role(%L,%L,''member'')', c, own))), null);
    falhas := array_remove(falhas || pg_temp.deny('mod_remove_owner', pg_temp.run(atacante,'aal1', format('select public.community_remove_member(%L,%L,true,''x'')', c, own))), null);
    falhas := array_remove(falhas || pg_temp.deny('mod_muda_privacidade', pg_temp.run(atacante,'aal1', format('select public.community_update(%L,''{"isPrivate":true}''::jsonb)', c))), null);
    falhas := array_remove(falhas || pg_temp.deny('inserir_cargo_direto', pg_temp.run(atacante,'aal1', format('insert into "CommunityMember"(id,"communityId","userId",role) values (gen_random_uuid()::text,%L,%L,''owner'')', c, extra))), null);
  end if;

  -- Fluxos legítimos continuam funcionando (esperado: 1+ linhas)
  falhas := array_remove(falhas || pg_temp.allow('curtir_post_publico', pg_temp.run(atacante,'aal1', format('insert into "Like"(id,"postId","userId",reaction) values (gen_random_uuid()::text,%L,%L,''like'')', post_pub, atacante))), null);
  falhas := array_remove(falhas || pg_temp.allow('editar_proprio_perfil', pg_temp.run(atacante,'aal1', format('update "User" set bio=''nova'' where id=%L', atacante))), null);
  falhas := array_remove(falhas || pg_temp.allow('comentar_post_publico', pg_temp.run(atacante,'aal1', format('insert into "Comment"(id,"postId","userId",content,"updatedAt") values (gen_random_uuid()::text,%L,%L,''oi'',now())', post_pub, atacante))), null);

  if array_length(falhas, 1) is null then
    raise exception E'\n==== SEGURANCA: TODOS OS TESTES PASSARAM ====';
  else
    raise exception E'\n==== SEGURANCA: % FALHA(S) ====\n%', array_length(falhas,1), array_to_string(falhas, E'\n');
  end if;
end $$;

rollback;
