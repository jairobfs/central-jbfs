# Gateway privado · Central no Universo JBFS

Este módulo tem **execução exclusiva no servidor do Universo original**. O endereço privado `https://connect.craft.do/link/…/api/v1` funciona como credencial e **nunca** deve ser colocado no bundle React, código público ou URLs do navegador.

## Dependências exigidas pelo host

`integrations/central-craft-api.mjs` exporta `createCentralCraftHttpHandler`.

A aplicação Sites canônica deve injetar:

- `resolveUserId(req)`: identidade do usuário validada pelo provedor de autenticação do Sites, não cabeçalhos ou JSON enviados pelo navegador.
- `ownerId`: identificador privado do proprietário autorizado.
- `gatewayFactory(req)`: cria um `CraftCentralGateway` com a conexão privada do Craft disponível **apenas no servidor** e com escopo na Collection de registros da Central.
- `validateDraft(value)`: valida com o esquema Zod de entradas da Central; para PATCH recebe o rascunho sem campo `revision`.
- `withKeyLock(key,fn)`: operação serializada **entre instâncias** para criar, editar ou arquivar a mesma chave. Um `Map` em memória não é suficiente para Workers distribuídos; usar Durable Object, transação/lock distribuído equivalente ou única fila de escrita.
- `cutoverVerified`: deve ser true **somente quando** exportação D1, contagens, IDs, revisões e leitura Craft estiverem homologadas.

## Contrato HTTP

O host deve rotear GET, POST, PATCH e DELETE para um endpoint relativo da mesma origem, por exemplo `/api/central/entries`, e POST de restauração para `/api/central/entries/restore`. GET devolve `{entries,truncated:false,savedOnline:true}`; POST/PATCH devolvem `{entry}`; DELETE devolve `{deleted:true}`.

Mutação com `Origin` diferente da origem do Universo é rejeitada. Requisições sem login confiável retornam 401; visitantes autenticados que não sejam o proprietário, 403. Requisições inválidas recebem 400. Conflitos de revisão retornam 409. Erros na API Craft retornam 503 sem mostrar a URL da conexão.

A biblioteca no cliente pode usar `configureEntriesTransport` para apontar o método de dados da Central ao endpoint **relativo** do mesmo domínio. O browser nunca deve chamar diretamente a URL-bearer do Craft.

## Estado

Código de gateway e testes são preparatórios. Não há acesso de edição ao projeto Sites canônico neste ambiente, portanto esta rota **não está implantada** e o D1 original permanece intocado. A infraestrutura de backend no Sites ainda precisa ser conectada à versão mais recente do Universo e passar por autenticação real, revisões conflitantes e testes com dispositivo móvel.
