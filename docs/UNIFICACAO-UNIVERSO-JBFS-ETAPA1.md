# Universo JBFS · Contrato da unificação · Etapa 1 (29/10/2026)

**Status:** branch de migração do código-fonte da Central. Nenhuma alteração publicada no Sites, D1 ou Craft.

## Projeto canônico
- Produto final: https://universo-jbfs-craft.jairobfs7.chatgpt.site — Sites ID appgprj_6adfa501fe3481919c22717de6adda94.
- Origem: https://central-jbfs.jairobfs7.chatgpt.site — Sites ID appgprj_6adaf8dd4c588191acfe056c47aa1132.
- Craft de destino: espaço ⌕ TUT, ID 8b335448-6499-3d04-91c1-5f99c399aca8.
- A branch não cria outro aplicativo, não substitui a publicação e não copia dados pessoais para GitHub.

## Inventário confirmado
- O banco D1 da Central possui tabela entries: id UUID, owner_id, kind, title, body, tag, status, data JSON, revision, created_at, updated_at.
- Tipos aceitos: note, task, prompt, resource, question, session.
- A consulta de entries na versão atual limita a 1000 linhas e sinaliza truncated. Uma exportação truncada impede migração segura.
- Dados Anki (notas, modelos, cartões e FSRS) permanecem nas Collections atuais do Universo; não os misturar a registros da Central.

## Implementado
- lib/unification-migration.mjs: normalização completa, chave estável central-jbfs:d1:entries:<uuid>, payload Craft, dry-run com criação/atualização condicional, detecção de divergências e duplicatas, retenção obrigatória de dados exclusivos do Craft.
- scripts/plan-central-to-craft.mjs: leitura de JSON local e emissão de resumo sem conteúdo pessoal; arquivo de plano opcional é exclusivo (flag wx) com permissão 0600.
- tests/unification-migration.mjs: testes sem acesso à rede ou bancos reais.

## Collection de destino criada e validada
- Collection real: Registros · Central JBFS, ID c2d21455-7247-c96f-0800-167ae049c385, no documento original do Universo; campo de nome: registro.
- Colunas de texto: chave, tipo, conteudojson, revisao, atualizado, origem.
- Teste real sintético concluído: criação → releitura → atualização de conteúdo/revisão/tentativa → releitura → limpeza. A Collection está vazia após o teste. Manter JSON integral, inclusive tentativas de questões e sessões. Validar limites para registros grandes; nunca truncar.

## Portões obrigatórios antes de escrita
1. Exportar D1 completo por meio autenticado e registrar integridade/contagem/hash fora de repositório público. Exportar inventário atual de Collections Craft.
2. Validar schema e create/read/update/read-back/delete de um item sintético isolado; preservar dados reais.
3. Executar node --test tests/unification-migration.mjs. Executar node scripts/plan-central-to-craft.mjs export-d1.json [itens-craft.json] [plano-privado.json].
4. Na escrita, reler cada chave e a revisão imediatamente antes de atualizar; nunca usar só timestamp ou realizar exclusão automática.
5. Recuperar o fonte mais recente do Sites Universo original e portar os módulos da Central à mesma árvore de aplicação, com autenticação e rotas únicas.
6. Homologar criação, edição, busca, histórico, FSRS, offline, mobile e alternância de aparelho. Comparar IDs, revisões e conteúdo completo.
7. Desativar a Central somente após cutover, verificação de integridade e backup recuperável. Sites antigo não é migrado por este branch.

## Observação operacional
Um levantamento prévio do D1 revelou três registros de sessão, mas esse resultado não representa um backup atual. Nenhuma exportação privada é incluída aqui.
Este é o início técnico da migração; o aplicativo final único ainda não foi publicado.
