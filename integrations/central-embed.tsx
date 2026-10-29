import React from 'react';
import {createRoot,type Root} from 'react-dom/client';
import Central from '../app/central';
import {configureEntriesTransport,type EntriesTransport} from '../lib/entries-client';
import '../app/globals.css';
import '../app/create-menu.css';
import '../app/personal-shortcuts.css';
import '../app/calendar-hub.css';

/**
 * Módulo da Central para uma ROTA INTERNA do Universo original.
 *
 * O host é responsável por:
 *  - preservar a mesma origem e sessão do Universo;
 *  - validar integralmente D1 vs Craft antes de habilitar o transporte;
 *  - fornecer um transporte autenticado, sem passar URLs-bearer ao bundle;
 *  - montar este módulo em um contêiner de página dedicado (CSS global).
 *
 * Não cria um servidor, domínio ou armazenamento próprio.
 */
export type CentralModuleOptions={
 transport:EntriesTransport;
 migrationVerified:boolean;
};
export function mountCentralModule(container:HTMLElement,options:CentralModuleOptions):()=>void{
 if(!(container instanceof HTMLElement))throw new Error('Contêiner da Central inválido.');
 if(!options||options.migrationVerified!==true)throw new Error('Migração D1 → Craft não homologada.');
 if(typeof options.transport!=='function')throw new Error('Transporte Craft indisponível.');
 configureEntriesTransport(options.transport,{cutoverVerified:true});
 const root:Root=createRoot(container);
 root.render(<Central hosting="universo"/>);
 return ()=>root.unmount();
}
