import type {CalendarId,Entry} from './types';

export type CalendarProject={id:CalendarId;name:string;short:string;description:string;tag:string;accent:string;sources:{title:string;url:string;note:string}[]};

// Documentos verificados no acervo da conta em 23/10/2026.
// Calendários antigos são referências históricas, nunca eventos futuros presumidos.
export const calendarProjects:CalendarProject[]=[
 {id:'t11',name:'Turma T11',short:'T11',description:'Aulas, avaliações, problemas e rodízios da turma.',tag:'T11',accent:'teal',sources:[
  {title:'Calendário de problemas · 2025.2',url:'https://drive.google.com/file/d/1ykVXSa_yI5lZy-wnsYOuNQ9Rf23bTetB/view',note:'Arquivo histórico'},
  {title:'Rodízio do 5º módulo · 2025',url:'https://drive.google.com/file/d/1qpPtfWvLs5Y0QR8fZJ6dFfbY9YZ6s4Iu/view',note:'Arquivo histórico'}
 ]},
 {id:'ambulatorio',name:'Ambulatório VII',short:'Ambulatório',description:'Atendimentos, preparações, escalas e materiais clínicos.',tag:'Ambulatório',accent:'blue',sources:[
  {title:'Acervo Ambulatório VII',url:'https://drive.google.com/drive/folders/1bclUkHhnExxyqfSHp8ysXLWwLPPRjBWW',note:'Pasta de materiais · 2026'}
 ]},
 {id:'grupo10',name:'Grupo 10 · Subgrupo 10B',short:'Grupo 10',description:'Tutoria, atividades em grupo, entregas e conferências.',tag:'Grupo 10',accent:'violet',sources:[]},
 {id:'iesc',name:'IESC · UBS Paulista',short:'IESC',description:'Vivências na UBS, atividades comunitárias e registros.',tag:'IESC',accent:'amber',sources:[
  {title:'Materiais IESC Ambulatório',url:'https://drive.google.com/drive/folders/1K8XH2z8D7f-fdNJ-wqzi8ElXgvWejxeF',note:'Pasta de referência'}
 ]},
 {id:'pessoal',name:'Pessoal e outros',short:'Pessoal',description:'Compromissos e tarefas sem frente acadêmica específica.',tag:'Pessoal',accent:'gray',sources:[]},
];

export function calendarForEntry(entry:Entry):CalendarId{
 if(entry.data.calendarId)return entry.data.calendarId;
 const tag=entry.tag.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(tag.includes('t11')||tag.includes('turma'))return 't11';
 if(tag.includes('ambulatorio'))return 'ambulatorio';
 if(tag.includes('grupo 10')||tag.includes('10b')||tag.includes('tutoria'))return 'grupo10';
 if(tag.includes('iesc')||tag.includes('ubs paulista'))return 'iesc';
 return 'pessoal';
}

export function saoPauloDate(date=new Date()){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
 const get=(key:string)=>parts.find(p=>p.type===key)?.value||'';
 return `${get('year')}-${get('month')}-${get('day')}`;
}

export function addMonths(month:string,offset:number){
 const [year,num]=month.split('-').map(Number);
 return new Date(Date.UTC(year,num-1+offset,1)).toISOString().slice(0,7);
}

export function monthDates(month:string){
 const [year,num]=month.split('-').map(Number);
 const first=new Date(Date.UTC(year,num-1,1));
 const count=new Date(Date.UTC(year,num,0)).getUTCDate();
 const mondayOffset=(first.getUTCDay()+6)%7;
 const dates:(string|null)[]=[...Array(mondayOffset).fill(null)];
 for(let day=1;day<=count;day++)dates.push(`${month}-${String(day).padStart(2,'0')}`);
 while(dates.length%7)dates.push(null);
 return dates;
}

export function longMonth(month:string){
 const [year,num]=month.split('-').map(Number);
 return new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(year,num-1,1)));
}
