-- ============================================================================
-- Comunidades — Testes de segurança da arquitetura de identidade/cargos/propriedade
-- Rollback-safe: cria uma comunidade de teste, exercita os papéis e reverte tudo
-- ao final via um RAISE 'RELATORIO ...' (nada é persistido).
--
-- Regra central verificada: CARGO ≠ PROPRIEDADE. Ações críticas (transferir,
-- desativar, excluir) são exclusivas do proprietário e checadas no backend,
-- mesmo que o frontend seja manipulado.
--
-- Uso: psql/execute_sql. Ajuste U1/U2 para dois usuários reais se necessário.
-- ============================================================================
do $$
declare
  U2 text := 'aebf7afb-5878-496d-b7f9-7c507e441b66'; -- proprietário no teste
  U1 text := 'edf1889f-feba-4ffb-a502-95400ef3b059'; -- membro comum no teste
  cid text := 'zzz-test-comm';
  rep text := E'\n'; rid text; res jsonb; at text;
begin
  insert into "Community"(id,name,slug,username,"isPrivate","memberCount","createdById","ownerId",status)
    values (cid,'Clube Teste','zzz-clube-teste','zzzclubeteste',false,2,U2,U2,'active');
  insert into "CommunityMember"(id,"userId","communityId",role) values (cid||'-o',U2,cid,'owner');
  insert into "CommunityMember"(id,"userId","communityId",role) values (cid||'-m',U1,cid,'member');

  -- OWNER cria cargo personalizado
  perform set_config('request.jwt.claims', json_build_object('sub',U2,'role','authenticated')::text, true);
  rid := community_save_role(cid, jsonb_build_object('name','Vice-Presidente','rank',50,'icon','crown','color','#ec4899',
    'permissions', jsonb_build_array('publish_as_community','manage_events','post')));
  rep := rep || '1  owner cria cargo Vice => OK'||E'\n';

  -- MEMBRO não pode criar cargo nem publicar como comunidade
  perform set_config('request.jwt.claims', json_build_object('sub',U1,'role','authenticated')::text, true);
  begin perform community_save_role(cid, jsonb_build_object('name','Hacker','rank',10,'permissions',jsonb_build_array('post')));
    rep := rep || '2  membro cria cargo => FALHA'||E'\n';
  exception when others then rep := rep || '2  membro cria cargo => bloqueado'||E'\n'; end;
  rep := rep || '3  publish_as_community(membro) = '||community_perm(U1,cid,'publish_as_community')::text||' (esperado false)'||E'\n';
  begin perform community_create_post(cid, jsonb_build_object('kind','text','content','oi','asCommunity',true));
    rep := rep || '4  membro posta como comunidade => FALHA'||E'\n';
  exception when others then rep := rep || '4  membro posta como comunidade => bloqueado'||E'\n'; end;

  -- OWNER atribui o cargo; agora o membro herda a permissão
  perform set_config('request.jwt.claims', json_build_object('sub',U2,'role','authenticated')::text, true);
  perform community_assign_role(cid,U1,rid,true);
  rep := rep || '5  apos atribuir Vice: publish(membro) = '||community_perm(U1,cid,'publish_as_community')::text||' (esperado true)'||E'\n';

  -- MEMBRO com cargo publica como comunidade (autoria pública = comunidade; autor real preservado)
  perform set_config('request.jwt.claims', json_build_object('sub',U1,'role','authenticated')::text, true);
  res := community_create_post(cid, jsonb_build_object('kind','text','content','Reuniao sabado 20h','asCommunity',true));
  select "authorType"||'/'||"authorId" into at from "Post" where id = res->>'id';
  rep := rep || '6  post => authorType/authorId = '||at||' (esperado community/'||left(U1,8)||'…)'||E'\n';

  -- MEMBRO não pode ações exclusivas do proprietário
  begin perform community_transfer_owner(cid,U1); rep := rep || '7  membro transfere => FALHA'||E'\n';
  exception when others then rep := rep || '7  membro transfere => bloqueado (owner_only)'||E'\n'; end;
  begin perform community_delete(cid,'Clube Teste'); rep := rep || '8  membro exclui => FALHA'||E'\n';
  exception when others then rep := rep || '8  membro exclui => bloqueado (owner_only)'||E'\n'; end;
  begin perform community_set_status(cid,'disabled'); rep := rep || '9  membro desativa => FALHA'||E'\n';
  exception when others then rep := rep || '9  membro desativa => bloqueado (owner_only)'||E'\n'; end;

  -- OWNER: exclusão exige nome exato; transferência funciona
  perform set_config('request.jwt.claims', json_build_object('sub',U2,'role','authenticated')::text, true);
  begin perform community_delete(cid,'nome errado'); rep := rep || '10 owner exclui nome errado => FALHA'||E'\n';
  exception when others then rep := rep || '10 owner exclui nome errado => bloqueado (name_mismatch)'||E'\n'; end;
  perform community_transfer_owner(cid,U1);
  rep := rep || '11 apos transferir: novo dono = '||left((select "ownerId" from "Community" where id=cid),8)||'… ; antigo dono = '
    ||(select role from "CommunityMember" where "communityId"=cid and "userId"=U2)||' (esperado admin)'||E'\n';

  raise exception 'RELATORIO %', rep;   -- reverte todo o teste
end $$;
