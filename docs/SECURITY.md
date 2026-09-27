# Segurança do Órbita X

Este documento resume como a segurança do Órbita X funciona e como manter/validar. O objetivo é
um sistema **resistente, monitorável e capaz de limitar danos** — não há "impossível de hackear".

## Arquitetura e perímetro

O navegador fala direto com o Supabase (PostgREST e RPC) usando a chave `anon` mais o JWT do usuário.
**O banco é o perímetro real de segurança.** O servidor Next tem poucas rotas de API. Portanto:

- Toda autorização é validada no banco (RLS, grants por coluna, funções `SECURITY DEFINER`, gatilhos).
- O frontend nunca é confiável: qualquer regra que importe é aplicada no servidor/banco.
- Nada de `service_role` no frontend. Só `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  (ambas públicas por natureza) chegam ao cliente.

## Camadas (defesa em profundidade)

Autenticação → Autorização → Sessões seguras → API Security → RLS/Banco → Armazenamento protegido →
Rate limiting → Detecção de ataques → Auditoria → Monitoramento → Backups.

### Autenticação e sessões
- Senhas com bcrypt (GoTrue). Política de senha no cliente + proteção contra senhas vazadas (Auth).
- 2FA (TOTP) opcional em `Configurações › Segurança`; exigido no banco a cada requisição para quem ativou.
- Sessões revogáveis: `api_guard` (db-pre-request do PostgREST) recusa REST/RPC de uma sessão encerrada
  (`session_revoked`), de conta suspensa (`account_suspended`) e exige `aal2` quando há 2FA (`mfa_required`).
- Aparelhos conectados: `my_sessions()`, `revoke_session()`, "encerrar as outras" e "sair de todos".
- Recuperação de senha com resposta neutra (não revela se o e-mail existe) e página `/redefinir-senha`.
- Redirecionamentos pós-login restritos ao próprio site (`safeRedirect`).

### Autorização
- RLS em todas as tabelas; grants de escrita por coluna (o cliente só grava o que o app usa).
- Papéis de plataforma: `user < moderator < admin < owner`. Admin de plataforma exige 2FA para escrever.
- Comunidades: `owner/admin/moderator/editor/member`; ações críticas verificam hierarquia no servidor
  (rebaixar/remover/banir alguém de cargo igual ou superior é recusado; desbanir respeita quem baniu).
- `SECURITY DEFINER` com `search_path` fixo; funções de gatilho não são chamáveis pela API.

### API e ataques web
- Cabeçalhos (em `next.config.mjs`): CSP, HSTS (preload), X-Frame-Options DENY, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy, COOP; sem `X-Powered-By`.
- Cookies de sessão: HttpOnly/SameSite/Secure (gerenciados por `@supabase/ssr`).
- Open redirect, XSS via `?redirect=javascript:` e SSRF pelo otimizador de imagens (`/_next/image` desativado): fechados.
- SQLi: sem SQL dinâmico com entrada do usuário; buscas usam parâmetros.

### Rate limiting e detecção
- `RateBucket` + `rate_hit()` e o gatilho `rate_guard` em posts, curtidas, mensagens, denúncias, follows, etc.
- `SecurityEvent` (append-only): login (com risco por múltiplos sinais), troca de senha/e-mail, 2FA,
  mudança de permissão, ações de admin, cargos de comunidade, movimentações de Coins.
- IP e user-agent guardados só para login/sessão e por 90 dias; sempre com hash com pepper (Vault) para correlação.
- Painel `/admin/seguranca` (admin com 2FA): resumo, admins sem 2FA, atividade recente.

### Coins (integridade financeira)
- Saldo só muda por `coins_apply()` (gatilho bloqueia escrita direta em `CoinWallet`).
- `CoinTransaction` é imutável (append-only); índice único impede lançar a mesma referência 2x.
- `admin_coins_reconcile()` compara saldo x soma do razão.

### Uploads
- `src/lib/upload-guard.ts`: valida os *magic bytes* antes de enviar e grava o tipo real (não o declarado).
  Um arquivo que finge ser imagem mas é HTML/SVG/script é recusado. Documentos (pdf, zip/office, texto)
  mantêm o tipo declarado (já restrito pela lista do bucket) e texto que começa com marcação é barrado.
- Buckets privados para o chat; premium com URL assinada; caminhos por usuário validados pela RLS do storage.

## Testes

- **Banco:** `db/security-tests.sql` — roda direto no Postgres, sempre revertido. Simula ataques reais
  (IDOR, forjar moderação/cargo/verificado, comentar post privado, escrever saldo, admin sem 2FA,
  hierarquia de comunidade, `javascript:` em URL, SQLi na busca) e confirma que os fluxos legítimos seguem
  funcionando. "Passar" = ataque bloqueado; a suíte falha se algum ataque conseguir escrever/ler.
  Uso: `psql "<conn>" -f db/security-tests.sql`.
- **Advisors:** `Supabase → Advisors → Security` após cada migração.
- **Build:** `npm run build` e `npm audit --omit=dev` (deve ficar em 0 vulnerabilidades).

## Configuração necessária para produção

No painel do Supabase (Auth): ativar proteção contra senhas vazadas e CAPTCHA em login/cadastro/recuperação;
reduzir a validade do JWT (15–30 min); confirmar TOTP ligado; incluir `https://orbitax.social.br/auth/callback`
nas Redirect URLs. Infra: WAF/CDN (Cloudflare/Netlify) para volume/DDoS; PITR e teste de restauração de backup.

## Riscos residuais conhecidos

- **Mídia pública por link:** quem tiver o link de uma mídia pública consegue abri-la. Mitigação completa
  seria migrar para links assinados.
- **Realtime/links após revogação:** uma sessão revogada ainda recebe eventos em tempo real e abre links
  públicos até o token expirar (mitigado por JWT curto).
- **Uploads:** validação por magic bytes no cliente + lista do bucket no servidor; sem re-encode/antivírus.
  Conteúdo é servido em outro domínio sob CSP, então não permite XSS no Órbita X.
- **Captura de tela:** o app Android é TWA; bloquear print exigiria app nativo (FLAG_SECURE).
- **DDoS volumétrico:** depende de WAF/CDN, fora do código da aplicação.
