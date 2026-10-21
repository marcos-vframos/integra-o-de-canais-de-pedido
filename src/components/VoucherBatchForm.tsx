import { useState } from 'react'
import pb from '@/lib/pocketbase/client'
type Customer={id:string;name:string}
export default function VoucherBatchForm({customers,onCreated}:{customers:Customer[];onCreated:()=>void}) {
 const [open,setOpen]=useState(false),[quantity,setQuantity]=useState(1),[type,setType]=useState('product_discount'),[value,setValue]=useState(5),[title,setTitle]=useState(''),[description,setDescription]=useState(''),[expires,setExpires]=useState(''),[customer,setCustomer]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setMessage('');try{
 const rows=await pb.send<any[]>('/backend/v1/vouchers/issue',{body:{p_quantity:quantity,p_type:type,p_value:type==='free_delivery'?0:value,p_title:title,p_description:description,p_expires_at:new Date(expires).toISOString(),p_customer:customer||null}})
 if(rows.length!==quantity)throw Error('A quantidade emitida não corresponde à solicitada')
 setMessage(rows.length+' vouchers de uso único criados e salvos.');onCreated()
 }catch(e:any){setMessage(e.message||'Não foi possível criar os vouchers')}finally{setBusy(false)}}
 return <div className="space-y-3"><button type="button" className="sc-btn-primary" onClick={()=>setOpen(x=>!x)}>Criar vouchers</button>
 {open&&<form onSubmit={submit} className="grid gap-3 rounded-xl border border-zinc-700 p-4 sm:grid-cols-2">
 <label>Título<input required minLength={2} value={title} onChange={e=>setTitle(e.target.value)} className="sc-input"/></label>
 <label>Quantidade (1 a 100)<input required type="number" min="1" max="100" value={quantity} onChange={e=>setQuantity(Number(e.target.value))} className="sc-input"/></label>
 <label>Tipo<select value={type} onChange={e=>setType(e.target.value)} className="sc-input"><option value="product_discount">Desconto em R$ no pedido</option><option value="voucher_10">Desconto percentual</option><option value="free_delivery">Entrega grátis</option></select></label>
 {type!=='free_delivery'&&<label>Valor {type==='voucher_10'?'(%)':'(R$)'}<input required type="number" min=".01" step=".01" max={type==='voucher_10'?100:100000} value={value} onChange={e=>setValue(Number(e.target.value))} className="sc-input"/></label>}
 <label>Válido até<input required type="datetime-local" value={expires} onChange={e=>setExpires(e.target.value)} className="sc-input"/></label>
 <label>Destinatário<select value={customer} onChange={e=>setCustomer(e.target.value)} className="sc-input"><option value="">Qualquer cliente com o código</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
 <label className="sm:col-span-2">Descrição<textarea value={description} onChange={e=>setDescription(e.target.value)} maxLength={2000} className="sc-input"/></label>
 <p className="text-xs text-zinc-400 sm:col-span-2">Cada código permite um uso. Valor e prazo são conferidos no servidor ao finalizar o pedido.</p>
 <button disabled={busy||!pb.authStore.isValid} className="sc-btn-primary">{busy?'Salvando...':'Emitir e salvar vouchers'}</button>
 {!pb.authStore.isValid&&<p>Entre como operador para emitir vouchers.</p>}
 </form>}{message&&<p role="status" className="text-sm">{message}</p>}</div>
}
