import type {Entry} from './types';

export const knowledgeAppIds=['quick-notes','knowledge-base','flashcard-deck','notes-search'] as const;
export type KnowledgeApp=typeof knowledgeAppIds[number];
export function isKnowledgeApp(value:string):value is KnowledgeApp{return (knowledgeAppIds as readonly string[]).includes(value)}

export const knowledgeAppDetails:Record<KnowledgeApp,{number:string;kicker:string;title:string;description:string;action:string}>={
 'quick-notes':{number:'05',kicker:'CAPTURA E ORGANIZAÇÃO',title:'Notas rápidas',description:'Registre ideias, organize por contexto e encontre o que escreveu. Cada nota abre no editor único da Central.',action:'Escrever nota'},
 'knowledge-base':{number:'06',kicker:'ACERVO PESSOAL',title:'Biblioteca de conhecimento',description:'Leia notas, fontes e prompts em uma estante pesquisável, organizada pelos seus próprios assuntos.',action:'Adicionar conhecimento'},
 'flashcard-deck':{number:'07',kicker:'EVOCAR E CONSOLIDAR',title:'Baralho de revisão ativa',description:'Enunciados, respostas e explicações em cartões interativos com revisão agendada em 1, 3 ou 7 dias.',action:'Criar cartão'},
 'notes-search':{number:'08',kicker:'BUSCA TRANSVERSAL',title:'Pesquisa no universo JBFS',description:'Uma busca unificada em notas, questões, recursos, prompts e tarefas salvos, com filtros e leitura imediata.',action:'Novo registro'}
};

export function normalized(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR')}
export function knowledgeEntries(entries:Entry[],app:KnowledgeApp){
 return entries.filter(e=>!e.data.catalogId&&(app==='quick-notes'?e.kind==='note':app==='knowledge-base'?['note','resource','prompt'].includes(e.kind):app==='flashcard-deck'?e.kind==='question':e.kind!=='session')).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
}
export function searchKnowledge(entries:Entry[],query:string,tag:string,favoritesOnly:boolean){
 const terms=normalized(query).trim().split(/\s+/).filter(Boolean);
 return entries.filter(e=>(!tag||e.tag===tag)&&(!favoritesOnly||!!e.data.favorite)&&terms.every(term=>normalized([e.title,e.body,e.tag,e.data.source||'',e.data.url||'',e.kind].join(' ')).includes(term)));
}
export function reviewQueue(entries:Entry[],now:number){
 return entries.filter(e=>e.kind==='question'&&(!e.data.reviewDue||new Date(e.data.reviewDue).getTime()<=now)).sort((a,b)=>(a.data.reviewDue||'').localeCompare(b.data.reviewDue||''));
}
