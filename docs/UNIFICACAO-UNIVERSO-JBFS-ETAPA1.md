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

## Exportação íntegra da Central (implementada no código, não publicada)
- Endpoint `GET /api/entries/export?limit=250` autentica pelo mesmo contexto do Sites e devolve páginas de até 250 registros do proprietário, com `asOf`, `nextCursor`, `hasMore` e `complete`.
- A paginação é por chave composta de `updated_at` e `id`, com limite temporal `asOf`. É um recorte temporal, não uma transação de snapshot do D1; alterações durante a exportação exigem uma passagem de reconciliação posterior.
- A Central ganhou o botão **Exportar dados** na faixa de conexão, disponível apenas em sessão autenticada. Valida os IDs, impede duplicatas e gera JSON privado somente após receber a última página; a interface informa erros sem emitir arquivo parcial.
- O código exporta todos os campos de cada linha D1 (inclusive `owner_id` no arquivo local de backup autenticado). O conversor `lib/unification-migration.mjs` remove `owner_id` do payload enviado à Collection Craft. O arquivo não deve ser compartilhado publicamente.
- **A API e o botão só poderão ser usados na Central publicada após deploy específico; a branch GitHub não implanta a versão Sites automaticamente.**
- O próximo passo exigirá acesso autorizado à publicação original para executar o export, comparar a integridade e migrar o acervo inteiro de uma vez, com corte incremental.

## Camada de persistência Craft (implementada em código; não publicada)
- \`lib/craft-central-gateway.mjs\`: transporte da API oficial para a Collection real da Central; planeja, relê a revisão remota antes de gravar e verifica criação/atualização após escrever. A API Craft não fornece comparação e troca (CAS) atômica: o backend final deve serializar gravações por chave ou proteger concorrência com lock.
- \`lib/central-craft-repository.mjs\`: leitura/listagem, criação e edição de registros com Craft como fonte principal, sem D1. O reenvio após resposta perdida identifica operações já concluídas e evita duplicar revisões. Excluir/arquivar registro da Central via UI permanece pendente.
- \`scripts/sync-central-to-craft.mjs\`: ferramenta de transição usando a exportação privada. Modo padrão somente análise; \`--apply\` exige autorização explícita, aborta em conflitos e confirma a releitura.
- Testes \`tests/craft-central-gateway.mjs\` e \`tests/central-craft-repository.mjs\`: integração com servidor simulado, falhas de rede, conflito de revisão, idempotência e histórico de questão. A API real Craft já foi testada manualmente com registros sintéticos, mas este adaptador em particular ainda não foi executado com uma URL autenticada real.
- **A migração não foi executada**; as três sessões vistas no banco Sites em consulta anterior não substituem exportação completa/atual. O projeto original Universo continua separado do código deste branch.
