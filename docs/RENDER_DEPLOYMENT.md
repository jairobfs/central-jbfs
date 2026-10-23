# Central JBFS · execução independente

Base visual e funcionalidades: publicação Sites 12, fonte 7e7df537198ce1106a532a6b78904f80020105c4. Mesmos componentes, temas, calendário e 12 módulos; não é uma reconstrução reduzida.

## Comandos

- Instalar: pnpm install --frozen-lockfile (pnpm 11.25.0).
- Compilar: npm run build:render.
- Iniciar: npm run start:render.
- Verificar: node --test tests/independent-runtime.mjs, node --test tests/entries-client.mjs e node_modules/.bin/tsc --noEmit.

Frontend Vite/React, servidor Node, API própria e armazenamento PostgreSQL. O build do Sites e seus arquivos continuam preservados. O build independente não usa Cloudflare Workers nem autenticação ChatGPT. Links para projetos externos permanecem nos endereços originais.

## Estado inicial de publicação

Publicação de validação em serviço web gratuito: https://central-jbfs.onrender.com. Serviço srv-dbdr2fu7bikc738594r0 no workspace My Workspace. Sem DATABASE_URL e configuração de acesso, a API recusa leitura/escrita com explicação. Nenhum dado privado é embutido no frontend ou no repositório. O endereço original continua ativo e mantém os registros existentes. Uma publicação Render com o shell carregando não significa que a migração dos dados foi concluída.

O sistema de arquivos de um serviço gratuito Render é efêmero. Não usar SQLite local, JSON local ou dados em memória para simular persistência. O PostgreSQL gratuito Render expira em 30 dias; por isso não foi criado como armazenamento definitivo. Um PostgreSQL persistente precisa ser provisionado e conectado antes da ativação.

## Variáveis de runtime

| Chave | Origem | Uso |
| --- | --- | --- |
| DATABASE_URL | Conexão PostgreSQL privada fornecida pelo provedor | Dados persistentes |
| CENTRAL_SESSION_SECRET | Segredo aleatório de pelo menos 32 caracteres | Assinatura das sessões |
| CENTRAL_PASSWORD_HASH | Verificador scrypt do código ou senha escolhido pelo proprietário | Acesso próprio da Central |
| APP_ORIGIN | URL canônica opcional; padrão RENDER_EXTERNAL_URL | Conferência de origem nas escritas |
| NODE_VERSION | 24 | Runtime de build e servidor |
| NPM_CONFIG_PREFIX | /opt/render/project/.npm-global | Destino gravável da instalação do pnpm no build Render |

Configurar segredos no ambiente Render, nunca no GitHub ou no código. O login usa cookie HttpOnly, Secure, SameSite=Strict, validade de sete dias e limite de tentativas. Esta configuração atende um único proprietário; não replica os quatro perfis do MED JITA.

## Transferência dos dados

1. Ler o estado atualizado da origem pelo conector Sites, com páginas completas e sem truncamento.
2. Confirmar um único proprietário e suspender mudanças na origem durante a conferência final.
3. Fornecer a exportação por stdin a `dist-independent-server/import-d1.mjs`, com DATABASE_URL no ambiente; não adicionar exportação ao repositório.
4. O importador usa transação, preserva IDs, conteúdo, dados completos, revisão e timestamps; recusa conflitos de conteúdo. Faz leitura de volta de cada registro antes de confirmar.
5. Comparar contagem, impressão SHA-256 e comportamento autenticado no destino. Somente então anunciar o novo endereço como principal.

A origem não é apagada ou desativada pelo importador. Mudanças posteriores na origem não são sincronizadas automaticamente.

## Limites da verificação

15 testes do runtime próprio usam os handlers reais e SQLite em memória como adaptador das consultas parametrizadas. Isso não equivale a operação real do driver PostgreSQL no Render. Testes da conexão cliente abrangem sessão expirada, falha de rede, HTML inesperado e timeout. Login e salvamento reais no Render precisam ser conferidos depois da configuração persistente.

## Publicação e conferência de 23/10/2026

Deploy `dep-dbdr31a9lscs73aftto0` em estado **live**, fonte `9bda259835f97c3daf9f8a2570473e64d9e5f718`. A primeira tentativa falhou por diretório global npm somente leitura; a variável NPM_CONFIG_PREFIX corrigiu a instalação.

No navegador, o endereço público carregou a Central e foram abertos e fechados os 12 módulos: Grade de aulas, Calendário de provas, Baralho de revisão, Hábitos, Base de conhecimento, Leitor de aulas, Ambulatório, Busca de notas, Central de projetos, Notas rápidas, Simulados e Plano de estudo. Os editores de novo compromisso e nova questão abriram com os campos esperados e a indicação explícita de salvamento indisponível. Nenhuma gravação de usuário foi executada. Verificação em navegador desktop; iPhone físico não testado.

O banco original Sites tinha dois registros lidos sem truncamento. Eles não foram copiados para o repositório nem para o frontend Render. A transferência continua pendente de banco persistente e configuração do acesso próprio. Não tratar esta publicação de validação como substituição definitiva.
