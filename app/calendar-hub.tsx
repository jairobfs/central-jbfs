'use client';
import {useMemo,useState} from 'react';
import {ArrowRight,ArrowUpRight,CalendarDays,Check,ChevronLeft,ChevronRight,Clock3,ExternalLink,FolderOpen,Plus} from 'lucide-react';
import type {CalendarId,Entry} from '@/lib/types';
import {addMonths,calendarForEntry,calendarProjects,longMonth,monthDates,saoPauloDate} from '@/lib/calendar';

type Props={entries:Entry[];online:boolean;onAddEvent:(date:string,calendarId:CalendarId)=>void;onAddSource:(calendarId:CalendarId)=>void;onEdit:(entry:Entry)=>void;onComplete:(entry:Entry)=>void};
const weekDays=['SEG','TER','QUA','QUI','SEX','SÁB','DOM'];
const projects=calendarProjects.filter(p=>p.id!=='pessoal');
const isEvent=(entry:Entry)=>entry.kind==='task'&&!!entry.data.due;
function formattedDay(date:string){const [year,month,day]=date.split('-').map(Number);return new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(year,month-1,day)))}

export default function CalendarHub({entries,online,onAddEvent,onAddSource,onEdit,onComplete}:Props){
 const today=saoPauloDate();
 const [month,setMonth]=useState(today.slice(0,7));
 const [day,setDay]=useState(today);
 const [filter,setFilter]=useState<CalendarId|'all'>('all');
 const dated=useMemo(()=>entries.filter(isEvent).filter(e=>filter==='all'||calendarForEntry(e)===filter).sort((a,b)=>(a.data.due||'').localeCompare(b.data.due||'')||(a.data.startTime||'').localeCompare(b.data.startTime||'')||a.title.localeCompare(b.title)),[entries,filter]);
 const byDay=useMemo(()=>{const map=new Map<string,Entry[]>();for(const entry of dated){const key=entry.data.due!;map.set(key,[...(map.get(key)||[]),entry])}return map},[dated]);
 const selected=byDay.get(day)||[];
 const upcoming=dated.filter(e=>(e.data.due||'')>=today&&e.status!=='done').slice(0,5);
 const projectSavedLinks=(id:CalendarId)=>entries.filter(e=>e.kind==='resource'&&calendarForEntry(e)===id&&!!e.data.url);
 function navigate(delta:number){const next=addMonths(month,delta);setMonth(next);setDay(next===today.slice(0,7)?today:next+'-01')}
 function chooseDate(date:string){setDay(date);if(date.slice(0,7)!==month)setMonth(date.slice(0,7))}
 return <div className="calendar-hub">
  <section className="calendar-intro">
   <div><span className="eyebrow">ROTINAS REUNIDAS · CENTRAL JBFS</span><h1>Uma agenda para todas as suas frentes.</h1><p>T11, ambulatório, Grupo 10 e IESC no mesmo lugar. Compromissos cadastrados aqui ficam salvos online; as fontes originais seguem acessíveis.</p></div>
   <button className="primary" onClick={()=>onAddEvent(day,filter==='all'?'grupo10':filter)}><Plus size={17}/>Novo compromisso</button>
  </section>
  <div className="calendar-filter-bar" role="group" aria-label="Filtrar frente de calendário">
   <button className={filter==='all'?'selected':''} onClick={()=>setFilter('all')}>Todos <span>{entries.filter(isEvent).length}</span></button>
   {calendarProjects.map(p=><button key={p.id} className={filter===p.id?'selected':''} onClick={()=>setFilter(p.id)}><i className={`calendar-dot ${p.accent}`}/>{p.short}</button>)}
  </div>
  <div className="calendar-workspace">
   <section className="calendar-board panel" aria-label="Calendário mensal">
    <header className="calendar-month-header"><div><span className="eyebrow">VISÃO MENSAL</span><h2>{longMonth(month)}</h2></div><div className="calendar-month-actions"><button onClick={()=>{setMonth(today.slice(0,7));setDay(today)}} className="calendar-today">Hoje</button><button onClick={()=>navigate(-1)} className="icon-button" aria-label="Mês anterior"><ChevronLeft size={20}/></button><button onClick={()=>navigate(1)} className="icon-button" aria-label="Próximo mês"><ChevronRight size={20}/></button></div></header>
    <div className="calendar-grid">{weekDays.map(name=><span key={name} className="calendar-weekday">{name}</span>)}{monthDates(month).map((date,i)=>{
      const events=date?(byDay.get(date)||[]):[];
      return date?<button key={date} className={`calendar-day ${date===today?'is-today':''} ${date===day?'is-selected':''}`} onClick={()=>chooseDate(date)} aria-pressed={date===day} aria-label={`${formattedDay(date)}, ${events.length} compromisso(s)`}><span>{Number(date.slice(-2))}</span><span className="calendar-day-dots" aria-hidden="true">{events.slice(0,3).map(e=><i key={e.id} className={`calendar-dot ${calendarProjects.find(p=>p.id===calendarForEntry(e))?.accent||'gray'}`}/>)}</span>{events.length>3&&<small>+{events.length-3}</small>}</button>:<span key={'blank'+i} className="calendar-day blank"/>})}</div>
    <div className="calendar-footnote"><span><CalendarDays size={15}/>Apenas datas realmente cadastradas</span><span>Horário de Campo Mourão (BRT)</span></div>
   </section>
   <aside className="calendar-side">
    <section className="panel calendar-agenda-card"><div className="calendar-agenda-title"><span className="eyebrow">DIA SELECIONADO</span><h2>{formattedDay(day)}</h2></div>
     {selected.length?<div className="calendar-day-events">{selected.map(e=><article key={e.id} className="calendar-event"><i className={`calendar-dot ${calendarProjects.find(p=>p.id===calendarForEntry(e))?.accent||'gray'}`}/><div><small>{e.data.startTime||'Sem horário'}{e.data.endTime?'–'+e.data.endTime:''} · {calendarProjects.find(p=>p.id===calendarForEntry(e))?.short}</small><button onClick={()=>onEdit(e)}>{e.title}</button>{e.body&&<p>{e.body.slice(0,130)}</p>}</div><button className="calendar-complete" aria-label={e.status==='done'?'Concluído':`Concluir ${e.title}`} disabled={e.status==='done'} onClick={()=>onComplete(e)}><Check size={16}/></button></article>)}</div>:<div className="calendar-day-empty"><CalendarDays size={28}/><strong>Um dia em aberto.</strong><span>Nenhum compromisso registrado nesta data.</span></div>}
     <button className="calendar-add-link" onClick={()=>onAddEvent(day,filter==='all'?'grupo10':filter)}><Plus size={16}/>Adicionar neste dia<ArrowRight size={15}/></button>
    </section>
    <section className="panel calendar-upcoming-card"><div className="calendar-agenda-title"><span className="eyebrow">NO HORIZONTE</span><h2>Próximos compromissos</h2></div>{upcoming.length?<div className="calendar-upcoming-list">{upcoming.map(e=><button onClick={()=>{chooseDate(e.data.due!);onEdit(e)}} key={e.id}><span className="calendar-upcoming-date">{e.data.due!.slice(8,10)}<small>{new Intl.DateTimeFormat('pt-BR',{month:'short',timeZone:'UTC'}).format(new Date(e.data.due!+'T12:00:00Z'))}</small></span><span><strong>{e.title}</strong><small>{calendarProjects.find(p=>p.id===calendarForEntry(e))?.short}{e.data.startTime?' · '+e.data.startTime:''}</small></span><ChevronRight size={15}/></button>)}</div>:<p className="calendar-upcoming-empty">Ainda não há datas futuras registradas. Vincule suas fontes e acrescente eventos confirmados.</p>}</section>
   </aside>
  </div>
  <section className="calendar-sources"><div className="section-head"><div><span className="eyebrow">ACERVOS E PROJETOS</span><h2>Suas fontes de calendário</h2></div><span className="subtle-label">Links verificados · sem sincronização automática</span></div><div className="calendar-sources-grid">{projects.map(p=>{
   const personalLinks=projectSavedLinks(p.id);
   return <article className="calendar-source-card" key={p.id}><div className="calendar-source-top"><span className={`calendar-source-symbol ${p.accent}`}><FolderOpen size={21}/></span><span className="calendar-source-counter">{entries.filter(e=>isEvent(e)&&calendarForEntry(e)===p.id).length} registros</span></div><h3>{p.name}</h3><p>{p.description}</p><div className="calendar-source-links">{p.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer"><span><strong>{s.title}</strong><small>{s.note}</small></span><ExternalLink size={16}/></a>)}{personalLinks.map(e=><div className="calendar-user-source" key={e.id}><a href={e.data.url!} target={e.data.url!.startsWith('craftdocs:')?undefined:'_blank'} rel="noopener noreferrer"><span><strong>{e.title}</strong><small>Fonte adicionada por você</small></span><ExternalLink size={15}/></a><button onClick={()=>onEdit(e)} aria-label={`Editar fonte ${e.title}`}>Editar</button></div>)}{!p.sources.length&&!personalLinks.length&&<span className="calendar-no-source">Fonte atual ainda não vinculada. Nenhuma data foi presumida.</span>}</div><div className="calendar-source-actions"><button onClick={()=>{setFilter(p.id);setMonth(today.slice(0,7));setDay(today)}}>Ver agenda<ArrowRight size={14}/></button><button onClick={()=>onAddSource(p.id)}><Plus size={14}/>Vincular fonte</button></div></article>})}</div>
   <div className="calendar-external-note"><Clock3 size={18}/><p>Os PDFs antigos da T11 são acervo histórico, não escala vigente. As pastas do Drive abrem as fontes originais; arquivos e eventos dessas fontes não são importados automaticamente para a Central. Para registrar um compromisso, use “Novo compromisso”.</p><a href="https://calendar.google.com/calendar/u/0/r" target="_blank" rel="noopener noreferrer">Abrir Google Agenda<ArrowUpRight size={15}/></a></div>
  </section>
 </div>;
}
