import {createContext,useContext,useEffect,useState,type ReactNode} from 'react'
import {tenantId,backendConfigured} from '@/lib/pocketbase/client'
import {profileUsable,googleOpenStatus,googleWeeklyHours,type GoogleBusinessProfile} from '../../supabase/functions/_shared/googleBusinessProfile'
const BusinessContext=createContext<{profile:GoogleBusinessProfile|null;configured:boolean;stale:boolean;status:ReturnType<typeof googleOpenStatus>|null;hours:ReturnType<typeof googleWeeklyHours>|null}>({profile:null,configured:false,stale:false,status:null,hours:null})
export function BusinessProfileProvider({children}:{children:ReactNode}) {
 const [profile,setProfile]=useState<GoogleBusinessProfile|null>(null),[configured,setConfigured]=useState(false),[stale,setStale]=useState(false),[now,setNow]=useState(Date.now())
 useEffect(()=>{
  if(!backendConfigured)return
  let stopped=false,pending=false
  const controller=new AbortController()
  const refresh=async()=>{if(pending)return;pending=true;try {
   const url=String(import.meta.env.VITE_SUPABASE_URL||'https://awgqpfdfsyslpqpfzoul.supabase.co').replace(/\/$/,'')
   const key=String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||'')
   const response=await fetch(url+'/functions/v1/google-business-profile?tenant='+encodeURIComponent(tenantId),{headers:{apikey:key},signal:controller.signal})
   if(!response.ok)throw new Error('Unavailable')
   const result=await response.json();if(!stopped){setConfigured(result.configured===true);setStale(result.stale===true);setProfile(profileUsable(result.profile)?result.profile:null)}
  }catch{if(!stopped)setStale(true)}finally{pending=false}}
  void refresh();const interval=setInterval(()=>void refresh(),15*60*1000),clock=setInterval(()=>setNow(Date.now()),30000)
  return()=>{stopped=true;controller.abort();clearInterval(interval);clearInterval(clock)}
 },[])
 const current=profileUsable(profile,now)?profile:null
 const hasHours=!!current&&(current.periods.length>0||current.special.length>0||current.businessStatus.startsWith('CLOSED'))
 return <BusinessContext.Provider value={{profile:current,configured,stale,status:current&&hasHours?googleOpenStatus(current,new Date(now)):null,hours:current&&current.periods.length?googleWeeklyHours(current):null}}>{children}</BusinessContext.Provider>
}
export const useBusinessProfile=()=>useContext(BusinessContext)
