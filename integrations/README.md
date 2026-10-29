# Central JBFS como módulo interno do Universo original

Este pacote é um **artefato incorporável**, não outro aplicativo Sites e não substitui a publicação original.

## Compilação

```bash
pnpm run build:universe-module
```

Saída: `dist-universe-module/central-module.js` e folhas CSS emitidas pelo Vite. O workflow do GitHub guarda o diretório completo como artefato após uma compilação bem-sucedida em `main`.

## Contrato de montagem

O projeto original do Universo deve possuir uma rota interna dedicada (p. ex. `/central`) sob **seu próprio domínio**, instalar os arquivos compilados dessa pasta e executar:

```ts
import {mountCentralModule} from '/modules/central/central-module.js';
const root=document.getElementById('central-root');
const detach=mountCentralModule(root,{
  migrationVerified:true, // Somente depois da auditoria completa D1 versus Craft
  transport: async (method,payload)=>{
    // Injetar adaptador autorizado do backend do Universo que responde ao
    // contrato requestEntries; não declarar endpoints fictícios nem token no código.
    return authorizedUniverseTransport(method,payload);
  }
});
// Na saída da rota: detach()
```

**Atenção:** `authorizedUniverseTransport` é o adaptador real a ser fornecido pelo Universo, não uma função já implementada neste pacote. Ele deve resolver autenticação no servidor, utilizar a Collection Craft `c2d21455-7247-c96f-0800-167ae049c385`, validar leitura/escrita e limitar o acesso ao proprietário. Não expor URL bearer `connect.craft.do/link/...` em scripts públicos.

## Dados e integridade

- O código conserva os componentes React originais: agenda, planejamento, oficina, promptoteca, biblioteca, simulados e modo foco.
- O transporte é injetado **antes** de renderizar; sem homologação da migração, `mountCentralModule` recusa montagem.
- O contrato no Craft inclui GET/POST/PATCH e arquivamento reversível de DELETE; RESTORE pode ser incorporado a uma interface de lixeira.
- IDs, campos, alternativas, tentativas de simulados e revisões são mantidos no documento JSON versionado.
- A exclusão é lógica (`deletedAt`), com incremento da revisão e possibilidade de restauração; migração D1 não sobrescreve registros do Craft mais novos.
- O armazenamento principal futuro é Craft; D1 deve permanecer intacto até exportação completa, comparação de contagens e homologação do usuário.
- **Sem CAS atômico na API Craft:** um backend serializado por chave é necessário para evitar atualização simultânea. Releitura antes/depois detecta, mas não elimina, todas as disputas.

## Aparência e navegação

- O bundle usa o mesmo componente `app/central.tsx`; a identidade visual usa `universoJBFS` quando `hosting='universo'`.
- O item de navegação que reabriria o Universo externo é ocultado no modo incorporado.
- As folhas CSS originais são globais. O módulo deve ser servido em rota de página dedicada no mesmo domínio, não injetado lado a lado na tela do Anki até haver escopo CSS próprio.
- Não usar iframe permanente e não criar domínio alternativo.

## Limite explícito

Este repositório GitHub **não consegue publicar diretamente** o projeto ChatGPT Sites `appgprj_6adfa501fe3481919c22717de6adda94`. Até integrar a rota no código fonte mais recente do Universo e homologar dados reais, o módulo é um pacote de migração, não a fusão publicada.
