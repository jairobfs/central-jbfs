# Central JBFS

Aplicação pessoal unificada · primeira versão · 23/10/2026.

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
