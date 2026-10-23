import {ArrowUpRight,Link2,PenLine,Plus,Star} from 'lucide-react';
import {safeUrl} from '@/lib/shared';
import type {Entry} from '@/lib/types';

export default function PersonalShortcuts({entries,onCreate,onEdit}:{entries:Entry[];onCreate:()=>void;onEdit:(entry:Entry)=>void}){
  const links=entries.filter(entry=>entry.kind==='resource'&&safeUrl(entry.data.url))
    .sort((a,b)=>Number(!!b.data.favorite)-Number(!!a.data.favorite)||b.updatedAt.localeCompare(a.updatedAt))
    .slice(0,8);

  return <section className="personal-shortcuts" aria-label="Atalhos adicionados por você">
    <div className="section-head personal-shortcuts-head">
      <div><span className="eyebrow">VOCÊ DECIDE O QUE FICA POR PERTO</span><h2>Seus atalhos pessoais</h2></div>
      <button className="text-button" onClick={onCreate}><Plus size={16}/>Adicionar link</button>
    </div>
    {links.length?<div className="personal-links-grid">{links.map(entry=><article className="personal-link" key={entry.id}>
      <div className="personal-link-top"><span className="personal-link-icon"><Link2 size={20}/></span><span className="personal-link-kind">{entry.data.favorite?<><Star size={12} fill="currentColor"/>Favorito</>:entry.tag}</span></div>
      <h3>{entry.title}</h3><p>{entry.body||entry.data.url}</p>
      <div className="personal-link-actions"><a href={safeUrl(entry.data.url)!} target={entry.data.url?.startsWith('craftdocs:')?undefined:'_blank'} rel="noopener noreferrer">Abrir atalho<ArrowUpRight size={15}/></a><button aria-label={`Editar atalho ${entry.title}`} onClick={()=>onEdit(entry)}><PenLine size={15}/></button></div>
    </article>)}</div>:<div className="personal-shortcuts-empty"><span className="personal-shortcuts-emblem"><Link2 size={23}/></span><div><h3>Seu espaço pode crescer com você.</h3><p>Adicione links de notas Craft, documentos, projetos e sites. Eles ficarão acessíveis aqui, em qualquer dispositivo.</p></div><button className="primary" onClick={onCreate}><Plus size={16}/>Meu primeiro atalho</button></div>}
    {entries.filter(entry=>entry.kind==='resource').length>links.length&&<p className="personal-shortcuts-note">Mostrando até 8 atalhos recentes, com favoritos primeiro. Os demais continuam na Biblioteca.</p>}
  </section>
}
