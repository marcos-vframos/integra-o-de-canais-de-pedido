import {useCallback,useEffect,useRef,useState} from 'react'
import {useAuth} from '@/context/AuthContext'
import pb from '@/lib/pocketbase/client'
import {controlAccess} from '@/lib/controlApi'
import type {ControlRecord} from '@/lib/controlPanel'
import type {OrderRecord,InventoryItem,MenuItem} from '@/types/loyolas'
export type ControlSnapshot={orders:OrderRecord[];inventory:InventoryItem[];menu:MenuItem[];customers:any[];seasonal_campaigns:any[];control_records:ControlRecord[];operation_audit:any[]}
export type ControlSource={table:keyof ControlSnapshot;label:string;updated:string|null;error:string}
const empty=():ControlSnapshot=>({orders:[],inventory:[],menu:[],customers:[],seasonal_campaigns:[],control_records:[],operation_audit:[]})
const definitions:[keyof ControlSnapshot,string][]=[['orders','Pedidos'],['inventory','Estoque'],['menu','Cardápio'],['customers','Clientes'],['seasonal_campaigns','Campanhas'],['control_records','Financeiro e acompanhamento'],['operation_audit','Auditoria']]
export function useControlData(){
 const {user}=useAuth(),[data,setData]=useState(empty),[sources,setSources]=useState<ControlSource[]>(()=>definitions.map(([table,label])=>({table,label,updated:null,error:''}))),[access,setAccess]=useState(false),[checking,setChecking]=useState(true),[refreshing,setRefreshing]=useState(false),[error,setError]=useState(''),[loadedFor,setLoadedFor]=useState('')
 const userId=user?.id
 const generation=useRef(0),busy=useRef<number|null>(null)
 const refresh=useCallback(async()=>{
  if(!userId||busy.current===generation.current)return
  const version=generation.current;busy.current=version;setRefreshing(true)
  try{
   const allowed=await controlAccess();if(version!==generation.current)return;setAccess(allowed);setLoadedFor(userId)
   if(!allowed){setData(empty());setError('Este ambiente é exclusivo à conta proprietária da empresa.');return}
   const results=await Promise.allSettled(definitions.map(([table])=>pb.collection(table).getFullList({sort:table==='operation_audit'?'-created':table==='control_records'?'-updated':''})))
   if(version!==generation.current)return
   const stamp=new Date().toISOString()
   setData(previous=>{const next={...previous};results.forEach((r,i)=>{if(r.status==='fulfilled')(next as any)[definitions[i][0]]=r.value});return next})
   setSources(previous=>definitions.map(([table,label],i)=>({table,label,updated:results[i].status==='fulfilled'?stamp:previous.find(s=>s.table===table)?.updated||null,error:results[i].status==='rejected'?String((results[i] as PromiseRejectedResult).reason?.message||'Fonte indisponível'):''})))
   setError('')
  }catch(e:any){if(version===generation.current)setError(e.message)}finally{if(busy.current===version)busy.current=null;if(version===generation.current){setChecking(false);setRefreshing(false)}}
 },[userId])
 useEffect(()=>{generation.current++;setData(empty());setAccess(false);setChecking(Boolean(userId));setError('');if(userId)void refresh();else setChecking(false);const tick=()=>{if(document.visibilityState==='visible')void refresh()};const timer=setInterval(tick,15000);window.addEventListener('focus',tick);window.addEventListener('online',tick);return()=>{generation.current++;clearInterval(timer);window.removeEventListener('focus',tick);window.removeEventListener('online',tick)}},[refresh,userId])
 return {data,sources,access:access&&loadedFor===userId,checking,refreshing,error,refresh}
}
