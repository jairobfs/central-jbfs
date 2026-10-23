# Central JBFS — migração isolada para Render

## Estado verificado em 23/10/2026
- Código: `jairobfs/central-jbfs`, branch canônica `main`.
- Produção atual: ChatGPT Sites, autenticação por cabeçalhos confiáveis injetados pela plataforma, dados em Cloudflare D1.
- Render workspace autorizado: `tea-db2q1d7lk1mc738b15mg` (My Workspace).
- Não há serviço `central-jbfs`, PostgreSQL ou Key Value no workspace no momento da inspeção.
- `pnpm start` executa Wrangler local: **não é um comando de produção compatível com Render**.
- `db/index.ts` depende de `cloudflare:workers` e `drizzle-orm/d1`.
- `app/chatgpt-auth.ts` depende dos cabeçalhos `oai-authenticated-user-*`; **não são confiáveis em um servidor público sem gateway autenticador**.

## Etapa 1 — exportação segura (esta branch)
- Rota `POST /api/backup/export` exclusivamente para usuário autenticado no Sites.
- Rejeita chamadas sem identidade e requisições cross-origin.
- Exporta todos os registros do proprietário por paginação de ID, incluindo `revision`, `createdAt`, `updatedAt`, `kind`, `data` e `ownerId`.
- Download JSON com `Cache-Control: private, no-store`, sem escrita em GitHub ou Render.
- Testes sintéticos de autorização, origem, completude e isolamento em `tests/route-integration.mjs`.
- **Não ativa importação, sincronização nem migração automática.** Exportação real só poderá ser usada após a publicação dessa rota no ambiente Sites e uma sessão autenticada.

## Etapa 2 — adaptação em branch isolada (a implementar)
1. Definir estratégia de identidade independente (sessões assinadas e cookies `HttpOnly`, `Secure`, `SameSite`; proteção CSRF e rate limiting). Não aceitar cabeçalhos de identidade enviados diretamente por clientes.
2. Definir persistência durável (por exemplo, PostgreSQL pago no Render ou serviço externo com backup). Não usar disco efêmero, PostgreSQL gratuito com expiração, ou memória do processo para dados reais.
3. Criar adaptador de banco compatível com o esquema `entries`, mantendo IDs, revisões, carimbos temporais e proprietário. Testar importação e reconciliação em base de ensaio, nunca sobre a produção.
4. Substituir o runtime Cloudflare/Vinext por build e start compatíveis com Render, ou implementar um serviço HTTP próprio validado.
5. Garantir que `GET /api/entries`, criação, edição concorrente e exclusão funcionem com identidade própria.
6. Manter 488 templates como inventário original, sem duplicar os 11 apps efetivados entre candidatos.

## Etapa 3 — canário e corte controlado
- Criar um serviço **novo** e isolado no Render somente quando houver build/start funcionais e banco durável.
- Desligar deploy automático inicialmente; nunca apontar o domínio atual ao canário.
- Testar login, logout, cookies, isolamento entre usuários, CRUD, 11 apps, responsividade e preferências.
- Exportar os dados reais pelo Sites; conferir contagem, hashes por registro e correspondência de IDs/revisões no destino.
- Manter a produção atual como referência até validação autenticada e aprovação de corte.
- Rollback: redirecionar ao site original; antes de liberar escrita no novo destino, definir reconciliação para evitar perda de alterações.

## Segurança e custos
- Este repositório é público: nunca incluir backups JSON reais, e-mails, tokens, cookies ou segredos nos commits, issues, logs ou artefatos do Actions.
- A rota de backup deve ser usada apenas no ambiente que injeta identidade autenticada. O arquivo exportado contém dados pessoais e deve permanecer sob controle do proprietário.
- A criação de serviço/banco pago exige verificar plano e custo antes da ação.
