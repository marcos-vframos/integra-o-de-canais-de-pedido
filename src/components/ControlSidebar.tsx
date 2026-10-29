import {Link} from 'react-router-dom'
import {LayoutDashboard,Bell,ChevronRight,Settings,ArrowLeft} from 'lucide-react'
export const controlAreas=[
 {id:'finance',title:'Financeiro',pages:[['pricing','Custos e precificação'],['cash','Fluxo de caixa'],['expenses','Registro de despesas'],['payables','Contas a pagar'],['receivables','Contas a receber'],['reconciliation','Conciliação financeira'],['profit','Produtos e margens']]},
 {id:'operation',title:'Operação',pages:[['operation','Pedidos e capacidade'],['stock','Estoque e desperdício'],['quality','Qualidade dos pedidos']]},
 {id:'relationship',title:'Relacionamento',pages:[['journey','Clientes e leads'],['relationship','Histórico e retornos'],['promotions','Promoções']]},
 {id:'control',title:'Controle',pages:[['goals','Metas e limites'],['sources','Origens e atualização'],['audit','Histórico de ações']]}
]
type Props={section:string;go:(id:string)=>void;menuOpen:boolean;toggleMenu:()=>void;expanded:Record<string,boolean>;toggleArea:(id:string)=>void}
export default function ControlSidebar({section,go,menuOpen,toggleMenu,expanded,toggleArea}:Props){
 const page=(id:string,title:string,Icon?:typeof Bell)=><button key={id} type="button" aria-current={section===id?'page':undefined} onClick={()=>go(id)}>{Icon&&<Icon size={16}/>}<span>{title}</span></button>
 return <aside className={'cp-sidebar '+(menuOpen?'expanded':'')}><div className="cp-brand"><div><b>LOYOLA’S</b><small>PAINEL DO PROPRIETÁRIO</small></div><button type="button" className="cp-action cp-menu" aria-controls="control-navigation" aria-expanded={menuOpen} onClick={toggleMenu}>Menu</button></div><nav id="control-navigation" aria-label="Painel de Controle"><div className="cp-nav-primary">{page('overview','Visão geral',LayoutDashboard)}{page('attention','Precisa da sua atenção',Bell)}</div>{controlAreas.map(group=>{const selected=group.pages.some(([id])=>id===section),isOpen=expanded[group.id]??selected;return <div key={group.id} className="cp-nav-group"><button className={'cp-nav-group-toggle '+(selected?'has-selection':'')} type="button" aria-expanded={isOpen} aria-controls={'cp-nav-'+group.id} onClick={()=>toggleArea(group.id)}><ChevronRight size={12} className={isOpen?'rotated':''}/>{group.title}</button><div id={'cp-nav-'+group.id} hidden={!isOpen} className="cp-nav-subareas">{group.pages.map(([id,title])=>page(id,title))}{group.id==='control'&&<Link to="/painel-de-controle/configuracoes"><Settings size={14}/>Configurações</Link>}</div></div>})}<div className="cp-sidebar-bottom"><p>Visão estratégica.<br/>Ação no mesmo lugar.</p><Link to="/gestao"><ArrowLeft size={14}/>Voltar ao gestor</Link></div></nav></aside>
}

