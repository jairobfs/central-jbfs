'use client';
import {useMemo,useState} from 'react';
import {
  AlertTriangle,ArrowRight,ArrowUpRight,BookOpen,CheckCircle2,ChevronRight,
  Cloud,Database,Download,ExternalLink,FileText,GraduationCap,Layers,
  LockKeyhole,RefreshCw,Search,ShieldCheck,Smartphone,Stethoscope,X
} from 'lucide-react';
import {readUniverseCraft,UNIVERSE_BASELINE,UNIVERSE_SPACE,type UniverseSnapshot} from '@/lib/universe-craft';
import './universe.css';

type LocalView='calendar'|'apps'|'library'|'study';
type Props={onNavigate:(view:LocalView)=>void};
const modules=[
  {title:'Universo JBFS',category:'APLICATIVO ORIGINAL',description:'Modelos MMI, MIO, AION e acervo de revisão preservados na aplicação original.',url:'https://universo-jbfs-craft.jairobfs7.chatgpt.site',Icon:GraduationCap,tone:'indigo'},
  {title:'Atlas Vivo · Craft Studio',category:'ATLAS E AUTORIA',description:'Estudo visual, documentos, imagens, pranchas e ferramentas editoriais.',url:'https://atlas-vivo-craft-git.vercel.app',Icon:BookOpen,tone:'teal'},
  {title:'MED JITA',category:'VIDA ACADÊMICA',description:'Notas, cálculos e histórico acadêmico no aplicativo independente.',url:'https://jairobfs.github.io/med-jita/',Icon:Stethoscope,tone:'rose'},
] as const;
const localModules=[
  {view:'study' as const,title:'Estúdio de estudo',description:'Questões, gabaritos e revisões existentes na Central.',Icon:GraduationCap},
  {view:'apps' as const,title:'Oficina Craft',description:'Catálogo dos 488 aplicativos e módulos já implementados.',Icon:Layers},
  {view:'calendar' as const,title:'Calendários',description:'T11, Ambulatório, Grupo 10 e IESC.',Icon:Smartphone},
  {view:'library' as const,title:'Biblioteca',description:'Notas, links e recursos salvos na Central.',Icon:FileText}
];
const nativeSpace='craftdocs://open?spaceId='+UNIVERSE_SPACE+'&blockId=424290f3-1f1c-fd20-4338-bdca2024e402';
const txt=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function fmtDate(value:string){return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'}).format(new Date(value))}
export default function UniversePanel({onNavigate}:Props){
  const [connection,setConnection]=useState('');
  const [reveal,setReveal]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [snapshot,setSnapshot]=useState<UniverseSnapshot|null>(null);
  const [search,setSearch]=useState('');
  const [onlyIssue,setOnlyIssue]=useState(false);
  const filtered=useMemo(()=>snapshot?.notes.filter(item=>!search||txt(item.title+' '+item.modelId).includes(txt(search)))||[],[snapshot,search]);
  async function verify(){
    if(busy)return;
    setBusy(true);setError('');
    try{
      const data=await readUniverseCraft(connection);
      setSnapshot(data);
      setSearch('');
    }catch(e){
      setSnapshot(null);
      setError(e instanceof Error?e.message:'Falha na leitura da conexão Craft.');
    }finally{setBusy(false)}
  }
  function exportInventory(){
    if(!snapshot||snapshot.integrity==='outro espaço')return;
    const safe={exportedAt:new Date().toISOString(),spaceName:snapshot.spaceName,checkedAt:snapshot.checkedAt,
      counts:snapshot.counts,sources:snapshot.sources,integrity:snapshot.integrity,issues:snapshot.issues,notes:snapshot.notes};
    const url=URL.createObjectURL(new Blob([JSON.stringify(safe,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='universo-jbfs-inventario-craft.json';a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <div className="univ">
    <header className="univ-hero">
      <div className="univ-hero-copy">
        <span className="univ-kicker"><span className="univ-kicker-dot"/>UNIVERSO JBFS · V1 UNIFICADA</span>
        <h1>Um universo.<br/><em>Tudo conectado.</em></h1>
        <p>Seus aplicativos continuam existindo com todos os recursos. Aqui você acessa cada módulo e consulta o acervo original do Craft em uma única experiência.</p>
        <div className="univ-hero-actions"><a href={modules[0].url} target="_blank" rel="noopener noreferrer" className="univ-primary">Abrir Universo original <ArrowUpRight size={18}/></a><a href={nativeSpace} className="univ-secondary">Abrir acervo no Craft <ExternalLink size={17}/></a></div>
      </div>
      <div className="univ-hero-emblem" aria-hidden="true">
        <span className="univ-orbit univ-orbit-one"/><span className="univ-orbit univ-orbit-two"/>
        <span className="univ-core"><Layers size={37} strokeWidth={1.35}/></span>
        <span className="univ-satellite univ-s1"><BookOpen size={21}/></span>
        <span className="univ-satellite univ-s2"><Database size={20}/></span>
        <span className="univ-satellite univ-s3"><GraduationCap size={21}/></span>
      </div>
    </header>

    <section className="univ-section" aria-labelledby="univ-modules-title">
      <div className="univ-section-title"><div><span className="univ-eyebrow">AMBIENTES ORIGINAIS PRESERVADOS</span><h2 id="univ-modules-title">Seus aplicativos, reunidos.</h2></div><span className="univ-muted">Sem migração destrutiva</span></div>
      <div className="univ-product-grid">{modules.map(({title,category,description,url,Icon,tone})=><a className={'univ-product univ-'+tone} href={url} target="_blank" rel="noopener noreferrer" key={title}>
        <div className="univ-product-top"><span className="univ-product-icon"><Icon size={23} strokeWidth={1.75}/></span><ArrowUpRight size={19} aria-hidden="true"/></div>
        <span className="univ-eyebrow">{category}</span><h3>{title}</h3><p>{description}</p><span className="univ-product-link">Abrir aplicativo <ArrowRight size={16}/></span>
      </a>)}</div>
    </section>

    <section className="univ-section" aria-labelledby="univ-central-title">
      <div className="univ-section-title"><div><span className="univ-eyebrow">NA CENTRAL JBFS</span><h2 id="univ-central-title">Continuar de onde parou.</h2></div></div>
      <div className="univ-local-grid">{localModules.map(({view,title,description,Icon})=><button className="univ-local-card" key={view} onClick={()=>onNavigate(view)}>
        <span className="univ-local-icon"><Icon size={20}/></span><span className="univ-local-copy"><strong>{title}</strong><small>{description}</small></span><ChevronRight size={19}/>
      </button>)}</div>
    </section>

    <section className="univ-section univ-craft" aria-labelledby="univ-craft-title">
      <div className="univ-section-title"><div><span className="univ-eyebrow">CRAFT · INTEGRAÇÃO READ-ONLY</span><h2 id="univ-craft-title">Seu acervo, sem cópias paralelas.</h2></div><span className="univ-craft-status"><ShieldCheck size={15}/>Somente leitura</span></div>
      <p className="univ-section-intro">Informe uma conexão autorizada para o espaço ⌕ TUT. O endereço não é incorporado ao código, não é salvo no navegador e não é enviado à Central. A leitura acontece diretamente entre esta aba e o Craft.</p>
      <div className="univ-connect">
        <label htmlFor="univ-connection">URL da conexão API Craft</label>
        <div className="univ-connect-row"><input id="univ-connection" type={reveal?'url':'password'} autoComplete="off" spellCheck={false} value={connection} onChange={e=>{setConnection(e.target.value);setError('')}} placeholder="https://connect.craft.do/link/…/docs/v1" aria-describedby="univ-connection-help"/>
        <button type="button" className="univ-secondary univ-reveal" onClick={()=>setReveal(x=>!x)} aria-label={reveal?'Ocultar URL':'Mostrar URL'}>{reveal?'Ocultar':'Mostrar'}</button>
        <button type="button" className="univ-primary univ-check" disabled={busy||!connection.trim()} onClick={verify}>{busy?<RefreshCw size={17} className="univ-spinning"/>:<Cloud size={17}/>} {busy?'Consultando…':'Verificar acervo'}</button></div>
        <p id="univ-connection-help"><LockKeyhole size={14}/>Não compartilhe essa conexão em repositórios públicos. Nenhum dado será alterado.</p>
      </div>
      {error&&<div className="univ-error" role="alert"><AlertTriangle size={18}/>{error}<button aria-label="Dispensar mensagem" onClick={()=>setError('')}><X size={16}/></button></div>}
      <div className="univ-stats" aria-label="Inventário do acervo">
        {([{key:'models',label:'Modelos',base:UNIVERSE_BASELINE.models},
           {key:'decks',label:'Baralhos',base:UNIVERSE_BASELINE.decks},
           {key:'notes',label:'Notas',base:UNIVERSE_BASELINE.notes},
           {key:'cards',label:'Cartões',base:UNIVERSE_BASELINE.cards}] as const).map(s=><div className="univ-stat" key={s.key}>
          <span>{s.label}</span><strong>{snapshot?.counts[s.key]??s.base}</strong>
          <small>{snapshot?.counts[s.key]===null||!snapshot?'Referência anterior':'Leitura atual'}</small>
        </div>)}
      </div>
      {snapshot&&<div className="univ-result" aria-live="polite">
        <div className="univ-result-head"><div><span className={'univ-signal '+(snapshot.integrity==='verificada'?'univ-ok':'univ-attention')}>{snapshot.integrity==='verificada'?<CheckCircle2 size={17}/>:<AlertTriangle size={17}/>} {snapshot.integrity==='verificada'?'Acervo verificado':snapshot.integrity==='outro espaço'?'Conexão de outro espaço':'Leitura incompleta'}</span><p>{snapshot.spaceName} · {fmtDate(snapshot.checkedAt)}</p></div><button className="univ-secondary" type="button" disabled={snapshot.integrity==='outro espaço'} onClick={exportInventory}><Download size={16}/>Exportar inventário</button></div>
        <div className="univ-source-line">{(Object.keys(snapshot.sources) as (keyof typeof snapshot.sources)[]).map(key=><span key={key} className={snapshot.sources[key]==='ok'?'univ-source-ok':'univ-source-off'}>{key==='models'?'Modelos':key==='decks'?'Baralhos':key==='notes'?'Notas':'Revisões FSRS'}: {snapshot.sources[key]==='ok'?snapshot.counts[key]:snapshot.sources[key]}</span>)}</div>
        {snapshot.issues.length>0&&<div className="univ-warnings" role="status">{snapshot.issues.map((problem,index)=><p key={index}><AlertTriangle size={15}/>{problem}</p>)}</div>}
        {snapshot.counts.reviews===0&&<p className="univ-fsrs"><AlertTriangle size={16}/>A Collection FSRS existe, mas ainda não contém registros. A sincronização de revisões não está ativada.</p>}
        {snapshot.notes.length>0&&<div className="univ-note-list">
          <div className="univ-list-head"><h3>Notas importadas da leitura</h3><label><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar notas" aria-label="Pesquisar notas do Craft"/></label></div>
          <div className="univ-note-rows">{filtered.slice(0,60).map(note=><a href={'craftdocs://open?spaceId='+UNIVERSE_SPACE+'&blockId='+encodeURIComponent(note.craftId)} key={note.craftId} className="univ-note-row"><FileText size={16}/><span><strong>{note.title}</strong><small>{note.cardCount} cartões · Modelo {note.modelId||'não informado'}</small></span><ArrowUpRight size={16}/></a>)}
          {!filtered.length&&<p className="univ-note-empty">Nenhuma nota encontrada com esta pesquisa.</p>}</div>
          {filtered.length>60&&<p className="univ-list-limit">Mostrando 60 de {filtered.length} notas. Refine a pesquisa ou exporte o inventário completo.</p>}
        </div>}
      </div>}
      {!snapshot&&<p className="univ-pending"><Database size={16}/>As contagens exibidas acima vêm do inventário anterior. Só serão identificadas como atuais depois de uma consulta bem-sucedida ao Craft.</p>}
    </section>
    <footer className="univ-footer"><ShieldCheck size={17}/>Primeira integração não destrutiva: links originais, dados existentes e modelos de estudo preservados. Sem criação ou exclusão de registros.</footer>
  </div>
}
