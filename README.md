# Central JBFS

Aplicação pessoal unificada · simulados e histórico · 23/10/2026.

## Publicação independente em preparação

Execução Node/React/PostgreSQL adicionada para Render, usando os mesmos componentes da versão 12. Configuração, transferência e limites em [docs/RENDER_DEPLOYMENT.md](docs/RENDER_DEPLOYMENT.md). Sem banco persistente e acesso configurados, o destino permanece em validação e não grava registros. A origem segue ativa.

## Correção de interação e conexão · 23/10/2026

- Botões de criação em Calendários, apps de agenda, notas, questões, projetos, aulas e fichas da oficina abrem o editor mesmo com a conta desconectada. Controles que gravam dados ou corrigem tentativas continuam exigindo acesso confirmado.
- Faixa de conexão visível em todas as seções, com reconexão e login nativo quando oferecido pela API. O editor também permite tentar reconectar.
- Cliente da API com prazo de 15 segundos, mensagens para sessão expirada, resposta HTML, falha de rede e confirmação incompleta. Uma mutação recusada por sessão ou infraestrutura atualiza o estado global de conexão. Nenhuma operação é reportada como salva sem confirmação.
- Ao usar “Preservar rascunho e entrar”, o rascunho e a revisão original são guardados em sessionStorage nesta aba e recuperados após o acesso, com validade de 1 hora. O item temporário é removido ao recuperar. Isto não é backup nem salvamento online.
- Publicação atual continua em ChatGPT Sites, autenticação ChatGPT e D1. GitHub jairobfs/central-jbfs existe, mas seu README consultado ainda descreve uma versão anterior. Nenhum serviço Central JBFS foi encontrado no Render/My Workspace nesta checagem. Não foi concluída migração independente.
- Validação: 10 testes do cliente de conexão, 18 testes dos handlers, TypeScript e build. A prévia gerenciada recusou conexão do navegador; não foi possível homologar cliques, retorno do login ou gravação autenticada em produção. Logs 401/404 encontrados vieram de chamadas do crawler, portanto não comprovam a causa exata da sessão do usuário.

## Atualização · Simulados operacionais

O template `quiz-maker` ganhou um aplicativo próprio e saiu dos candidatos genéricos: agora são 12 apps em uso e 476 candidatos, preservando os 488 registros do censo.

- Seleção de questões por contexto e pesquisa integral, quantidade até 50 e ordem opcionalmente misturada.
- Gabarito por alternativa definido explicitamente no editor; respostas em texto não são inferidas como uma opção correta. Questões antigas permanecem intactas e entram no simulado depois de receberem esse gabarito.
- Correção da alternativa escolhida, resposta integral, explicação e referência; o próximo item só é liberado após confirmação de salvamento.
- Tentativas online no mesmo registro de questão; até 50 recentes por questão e contadores acumulados. IDs estáveis evitam duplicar uma tentativa em uma confirmação repetida. Um detector de mudança sinaliza conteúdo alterado desde a tentativa, sem reclassificar o resultado antigo.
- Estado de erro mantém a resposta em tela. Se a questão muda durante a tentativa, a gravação é bloqueada até que ela seja reaberta. O resumo da sessão aberta é transitório; as tentativas confirmadas ficam persistidas e reaparecem no histórico após recarregar.
- Campos opcionais novos no JSON existente; sem migração ou alteração de permissões. Sem importação automática de conteúdo médico ou conexão nova com Craft.

Validação: 19 testes da lógica de simulados e 18 casos de integração dos handlers com Drizzle sobre SQLite de teste, além dos testes existentes e TypeScript. A prévia gerenciada não pôde ser inspecionada nesta atualização: o navegador retornou conexão recusada, mesmo após reinício do supervisor. As páginas temporárias de teste foram removidas. Essas execuções não equivalem a inspeção visual ou login/gravação autenticados na hospedagem. O gabarito é autoral; o aplicativo não atesta correção científica dos conteúdos cadastrados.

## Versão 1.2 · calendários acadêmicos

- Navegação nova **Calendários**, também na barra inferior do iPhone; visão mensal com navegação por mês, seleção de dia e filtros **T11**, **Ambulatório VII**, **Grupo 10/10B**, **IESC/UBS Paulista** e **Pessoal**.
- Cartões de fontes já localizadas: acervo T11 (calendário de problemas 2025.2 e rodízio de 5º módulo 2025 — ambos marcados históricos), pasta Ambulatório VII 2026 e pasta de materiais IESC Ambulatório. Para Grupo 10, a referência específica atual ainda não foi localizada; a interface deixa explícito que a fonte precisa ser vinculada.
- Registro de compromissos via tarefa com data, hora inicial/final opcional e frente de calendário. Usa o **mesmo armazenamento D1 por usuário**, sem migração. É possível editar, concluir, consultar eventos futuros e vincular novas fontes por meio dos registros de link existentes.
- A Central **não consome automaticamente** conteúdo de pastas Drive, PDFs ou Google Agenda. O vínculo de fonte é um atalho editável, não sincronização de eventos. O conector de calendário para Sites não pôde ser declarado, porque a ação de elegibilidade não está exposta nesta sessão.
- A página inicial ganhou uma entrada para a agenda. Foram mantidos todos os módulos anteriores, incluindo atalhos pessoais, pesquisa e o editor existente.
- Verificação local: TypeScript, 12 testes de integração da API, 9 casos de busca e 13 verificações de data/categoria; prévia do módulo em temas claro e escuro, filtro Grupo 10 e navegação mensal. Teste real de gravação de eventos na hospedagem autenticada ainda depende de acesso da pessoa à publicação.

## Versão 1.1 · refinamento de fluxo

- O botão **Novo** mantém a criação contextual de um toque e ganhou seletor de cinco tipos (nota, tarefa, questão, prompt e link).
- A pesquisa global e os filtros textuais passaram a encontrar também respostas, explicações, alternativas, URLs e fontes, ignorando acentos e diferenças de maiúsculas/minúsculas.
- A página inicial mostra os **atalhos pessoais** cadastrados como links na Biblioteca, até oito, com favoritos primeiro. Os sete projetos fixos permanecem preservados.
- Novas interações usam os mesmos registros online e o esquema D1 original, sem migração, importação ou alteração de permissões.
- Verificações: TypeScript sem erros; 12 testes de integração de API; 9 casos de busca; inspeção visual dos temas claro/escuro e interação com os formulários de questão e link na prévia gerenciada.

Site privado: notas, links, prompts integrais, tarefas por etapa/data, questões de revisão e sessões de foco. A página inicial inclui sete acessos aos projetos existentes, descobertos no estado real da conta em 23/10/2026. O conteúdo desses aplicativos permanece em seus projetos originais.

## Persistência e contratos

Os registros são salvos online em D1 e vinculados à identidade autenticada do visitante. A publicação é restrita ao proprietário. O navegador guarda somente preferência de tema e o cronômetro em andamento; os registros salvos são consultados no servidor. Alterações usam revisão condicional; novos registros usam IDs estáveis durante uma tentativa para não duplicar o envio. Erros de consulta não apagam os dados já carregados e erros de escrita não fecham o rascunho.

O formulário de questões preserva título, enunciado completo, alternativas, resposta, explicação e fonte. A revisão usa intervalos explícitos de 1, 3 ou 7 dias escolhidos pela pessoa. Não implementa FSRS ou validação automática de conteúdo clínico. Nenhum conteúdo médico novo foi gerado nesta versão.

## Conexão com os projetos Craft

O Atlas abre sua nota nativa por IDs lidos no espaço TUT. A base de auditoria abre o hub central no Drive. São acessos diretos; esta aplicação ainda não replica os registros no Craft nem importa automaticamente o seu acervo. A ação Sites de descoberta de elegibilidade de conectores não está exposta nesta sessão; nenhuma integração de visitante foi declarada ou simulada. A sincronização validada em outros projetos, como MED JITA, é uma trilha independente.

## Desenvolvimento e verificação

Usar os helpers da habilidade Sites, preservando .openai/hosting.json e o project_id. O projeto usa o starter Vinext e o lockfile pnpm fornecido. A migração em drizzle/ foi gerada pelo Drizzle e é aplicada pela publicação; migrações locais usam os comandos do starter.

- TypeScript: node_modules/.bin/tsc --noEmit.
- Integração dos handlers: node tests/route-integration.mjs.
- Build: node /root/.codex/plugins/cache/openai-curated-remote/sites/1.1.1/scripts/build-site.mjs neste ambiente.

O teste executa os handlers reais e Drizzle com um adaptador compatível com D1 sobre SQLite em memória, contexto de identidade sintético e dados descartáveis. Abrange leitura sem identidade, dados completos, envio repetido, isolamento, origem da escrita, revisão condicional e exclusão. Os 12 casos passaram. Não é teste HTTP autenticado da hospedagem nem teste operacional do serviço Cloudflare D1. A migração também foi aplicada na base local de prévia sem erros. O acesso HTTP ao loopback não está disponível entre os processos deste ambiente.

A prévia gerenciada foi inspecionada no navegador em desktop: módulos, formulário, duração de foco e temas claro/escuro. A criação de UUID foi ajustada para o contexto HTTP da prévia. A conferência física no iPhone e o ciclo de gravação autenticado na hospedagem não foram executados pelo agente. A interface tem regras responsivas para 320–430 px e navegação inferior em telas pequenas.

Sem credenciais de Craft, tokens de conexão ou dados de acesso nos arquivos do aplicativo.
