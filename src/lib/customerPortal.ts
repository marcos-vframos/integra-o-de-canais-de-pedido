import {customerPortalRequest} from './supabase/compat'
export {customerPortalRequest}
export const CUSTOMER_TOKEN_KEY='loyolas_customer_verified_v1'
export const getCustomerToken=()=>{try{return localStorage.getItem(CUSTOMER_TOKEN_KEY)||''}catch{return ''}}
export const setCustomerToken=(token:string)=>{try{if(token)localStorage.setItem(CUSTOMER_TOKEN_KEY,token);else localStorage.removeItem(CUSTOMER_TOKEN_KEY)}catch{/* In-memory session still works. */}}
export const ORDER_STAGES=['aceito','em preparo','pronto','enviado'] as const
export function customerOrderStatus(order:{status?:string;motoboyId?:string}){
 const s=(order.status||'pendente').toLowerCase()
 return s==='pronto'&&order.motoboyId?'enviado':s==='em_preparo'?'em preparo':s==='despachado'?'enviado':s
}
const TRACKING_KEY='loyolas_order_tracking_v1'
export function readTrackedOrders():{id:string;key:string;created:number}[]{try{return JSON.parse(localStorage.getItem(TRACKING_KEY)||'[]').filter((r:any)=>typeof r.id==='string'&&typeof r.key==='string'&&r.key.length>=30&&r.created>Date.now()-7*86400000).slice(0,5)}catch{return []}}
export function rememberTrackedOrder(id:string,key:string){if(key.length<30)return;try{localStorage.setItem(TRACKING_KEY,JSON.stringify([{id,key,created:Date.now()},...readTrackedOrders().filter(r=>r.id!==id)].slice(0,5)));window.dispatchEvent(new Event('loyolas:tracked-order'))}catch{/* Tracking cannot survive a reload when storage is blocked. */}}
