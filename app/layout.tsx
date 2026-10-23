import type {Metadata} from 'next';
import './globals.css';
import './create-menu.css';
import './personal-shortcuts.css';
import './calendar-hub.css';
export const metadata:Metadata={title:'Central JBFS · Seu espaço, conectado',description:'Calendários T11, Ambulatório e Grupo 10, estudos, ideias, prompts e projetos em um espaço pessoal com salvamento online.',icons:{icon:'/favicon.svg'},appleWebApp:{capable:true,title:'Central JBFS',statusBarStyle:'default'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="pt-BR" suppressHydrationWarning><body>{children}</body></html>}
