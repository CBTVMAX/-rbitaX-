# ÓrbitaX

**Seu universo em conexão.** Rede social full-stack construída com Next.js (App Router) e Supabase (Postgres, Auth, Storage, Realtime).

## Stack

- Next.js 14 + TypeScript + Tailwind CSS
- Supabase: autenticação (e-mail/senha e Google), banco Postgres com RLS, Storage e Realtime
- Projeto Supabase: `orbitax-social` (`hrfrwsedjtvkmpaniijl`)

## Funcionalidades desta etapa

- Cadastro e login (e-mail/senha, Google), com criação automática de perfil
- Feed: publicar texto/foto/vídeo, curtir, comentar
- Perfil público com seguidores/seguindo
- Mensagens diretas em tempo real
- Comunidades: criar, listar, entrar/sair
- Música e Vídeos: upload e reprodução

Itens como Fotos, Clipes, Jogos, Adesivos, Mercado e Órbita IA aparecem no menu marcados como "em breve" — serão construídos em etapas seguintes.

## Rodando localmente

```bash
npm install
cp .env.local.example .env.local # preencha com as chaves do projeto Supabase
npm run dev
```
