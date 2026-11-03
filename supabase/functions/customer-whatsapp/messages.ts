export function validConnection(c:any):boolean{return !!c&&/^v\d{2}\.0$/.test(c.apiVersion||'')&&/^\d+$/.test(c.phoneNumberId||'')&&typeof c.accessToken==='string'&&c.accessToken.length>20&&['otpTemplate','orderTemplate','birthdayTemplate'].every(k=>/^[a-z0-9_]{1,100}$/.test(c[k]||''))}
export function templateMessage(c:any,j:any){
 const values=j.kind==='otp'?[j.payload.code]:j.kind==='birthday'?[j.payload.name,j.payload.code,'72 horas']:[j.payload.name,String(j.payload.ticket),j.payload.phase]
 const components:any[]=[{type:'body',parameters:values.map(text=>({type:'text',text:String(text||'Cliente').replace(/\s+/g,' ').trim().slice(0,200)}))}]
 if(j.kind==='otp')components.push({type:'button',sub_type:'url',index:'0',parameters:[{type:'text',text:j.payload.code}]})
 return {messaging_product:'whatsapp',to:j.phone,type:'template',template:{name:c[j.kind==='otp'?'otpTemplate':j.kind==='birthday'?'birthdayTemplate':'orderTemplate'],language:{code:'pt_BR'},components}}
}
