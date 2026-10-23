# Publicação e manutenção · Central JBFS

O repositório `jairobfs/central-jbfs` é a referência principal do **código-fonte**. O site em uso é [Central JBFS](https://central-jbfs.jairobfs7.chatgpt.site), atualmente publicado pelo serviço Sites.

## O que está automatizado

O workflow [Verificar Central JBFS](../.github/workflows/verificar.yml) roda em toda alteração da branch `main`, nos pull requests para `main` e manualmente na aba **Actions**:

- instalação reprodutível com as versões do `package.json` e `pnpm-lock.yaml`;
- compilação de tipos TypeScript;
- testes de APIs, armazenamento simulado e isolamento entre usuários;
- testes de pesquisa, calendários, navegação e catálogo Craft de 488 entradas;
- build portável da aplicação.

O status do workflow pode ser acompanhado em **Actions** no GitHub. O workflow valida o código: **não substitui a publicação nem altera o banco em produção**.

## Infraestrutura atual

| Camada | Estado |
| --- | --- |
| Código e histórico | GitHub, branch `main` |
| CI | GitHub Actions |
| Publicação ativa | Sites, versão publicada separadamente |
| Backend | Worker com D1 (binding `DB`) |
| Identidade | Cabeçalhos de autenticação verificados no ambiente Sites |
| Dados | D1 do projeto publicado; dados **não** estão no repositório |

O arquivo `.openai/hosting.json` identifica o projeto Sites existente. Não alterá-lo em outra cópia para tentar transferir o banco.

## Para tornar a publicação independente

1. Escolher e configurar a hospedagem de produção com suporte a Cloudflare Workers e D1 (ou adaptar o backend e a persistência com testes).
2. Implantar **autenticação independente e confiável** antes de aceitar usuários ou requisições externas. O código atual recebe cabeçalhos de identidade injetados pelo ambiente Sites; esses cabeçalhos **não podem ser tratados como prova de login** em um host aberto.
3. Criar uma base D1 específica da nova hospedagem; executar e validar as migrações do diretório `drizzle/`.
4. Fazer a migração de dados **somente após** conferir o método de exportação, consistência, permissões e possibilidade de recuperação. Não apagar nem reinicializar a base atual.
5. Vincular GitHub Actions ao provedor de hospedagem escolhido com credenciais próprias protegidas. Só habilitar a publicação automática após testes de login, gravação, atualização, separação por usuário, integração mobile e reversão de release.
6. Publicar a nova versão primeiro em endereço de teste privado. Com o conteúdo conciliado e validado, definir o endereço definitivo.

**Importante:** publicar o build em GitHub Pages não funciona como substituto direto. O aplicativo usa rotas de servidor, autenticação e persistência D1.

## Protocolo para alterações

- Fazer novas alterações a partir de `main` no GitHub.
- Para alterações de maior risco, abrir uma branch e um pull request.
- Conferir o resultado em **Actions** e testar o fluxo afetado.
- Manter a versão Sites em uso até que a nova publicação tenha autenticação e dados equivalentes, com procedimento de retorno.
- Nunca incluir PINs, senhas, tokens ou exportações pessoais do banco no repositório público.

Este documento descreve os requisitos e o estado do projeto. **Não afirma que a hospedagem independente ou o deploy GitHub → Sites já estejam configurados.**
