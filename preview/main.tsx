import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ArrowUpRight,BookOpen,ExternalLink,Layers,Moon,ShieldCheck,Sun,X} from 'lucide-react';
import UniversePanel from '../app/universe';
import './theme.css';

const destinationNames={
  calendar:'Calendários',apps:'Oficina Craft',library:'Biblioteca',study:'Estúdio de estudo'
} as const;
type Destination=keyof typeof destinationNames;

function Preview(){
  const [theme,setTheme]=useState<'light'|'dark'>(()=>
    typeof matchMedia==='function'&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
  const [destination,setDestination]=useState<Destination|null>(null);
  useEffect(()=>{document.documentElement.dataset.theme=theme},[theme]);
  useEffect(()=>{if(!destination)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setDestination(null)};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[destination]);
  return <>
    <header className="preview-toolbar">
      <div className="preview-toolbar-content">
        <div className="preview-brand">
          <span className="preview-mark"><Layers size={21}/></span>
          <span><strong>Universo JBFS</strong><small>Prévia navegável · mesma seção React da Central</small></span>
        </div>
        <div className="preview-actions">
          <button className="preview-action" onClick={()=>setTheme(v=>v==='light'?'dark':'light')}
            aria-label={theme==='dark'?'Ativar modo claro':'Ativar modo escuro'}>
            {theme==='dark'?<Sun size={16}/>:<Moon size={16}/>}
            {theme==='dark'?'Claro':'Escuro'}
          </button>
          <a className="preview-action primary" href="https://github.com/jairobfs/central-jbfs" target="_blank" rel="noopener noreferrer">
            <ExternalLink size={15}/>Código
          </a>
        </div>
      </div>
    </header>
    <main className="preview-main">
      <div className="preview-disclaimer" role="note"><ShieldCheck size={16}/><span><strong>Ambiente de avaliação.</strong> Este endereço executa o componente `app/universe.tsx` do repositório, sem dados simulados ou credenciais. A navegação para os demais módulos da Central ainda depende do aplicativo original. Não é uma cópia da sua sessão no Sites.</span></div>
      <UniversePanel onNavigate={setDestination}/>
    </main>
    <footer className="preview-footer">
      <span>Universo JBFS · primeira camada visual em avaliação</span>
      <span>Atualizações versionadas no GitHub · sem modificar o Sites</span>
    </footer>
    {destination&&<div className="preview-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setDestination(null)}}>
      <section className="preview-modal" role="dialog" aria-modal="true" aria-label="Módulo da Central">
        <div style={{display:'flex',justifyContent:'space-between',gap:10}}>
          <BookOpen size={24}/><button className="preview-action" aria-label="Fechar" onClick={()=>setDestination(null)}><X size={16}/></button>
        </div>
        <h2>{destinationNames[destination]}</h2>
        <p>Este módulo existe na Central JBFS, mas ainda não foi transportado para esta prévia estática. Para preservar os dados e não simular funcionamento, o acesso aqui permanece identificado como pendente. O componente Universo que você acabou de utilizar é o mesmo código da Central.</p>
        <div className="preview-modal-actions"><button className="preview-action primary" onClick={()=>setDestination(null)}>Voltar ao Universo</button>
          <a className="preview-action" href="https://github.com/jairobfs/central-jbfs" target="_blank" rel="noopener noreferrer">Ver código <ArrowUpRight size={15}/></a></div>
      </section>
    </div>}
  </>
}
const root=document.getElementById('root');
if(!root)throw new Error('Missing preview root');
createRoot(root).render(<Preview/>);
