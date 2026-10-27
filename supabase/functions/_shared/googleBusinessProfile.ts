export type BusinessPeriod={openDay:number;closeDay:number;open:number;close:number}
export type SpecialPeriod={startDate:string;endDate:string;closed:boolean;open:number;close:number}
export type GoogleBusinessProfile={title:string;address:string;phone:string;mapsUri:string;timeZone:string;periods:BusinessPeriod[];special:SpecialPeriod[];businessStatus:string;fetchedAt:string}
const days=['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY']
const names=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado']
const short=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
function minute(value:any){if(typeof value==='string'){const [h,m]=value.split(':').map(Number);return h*60+(m||0)}return Number(value?.hours||0)*60+Number(value?.minutes||0)}
function dateKey(value:any){return `${value?.year}-${String(value?.month).padStart(2,'0')}-${String(value?.day).padStart(2,'0')}`}
function safeMinute(n:number){return Number.isFinite(n)&&n>=0&&n<=1440}
export function normalizeGoogleProfile(raw:any,timeZone:string,now=new Date()):GoogleBusinessProfile {
 new Intl.DateTimeFormat('en',{timeZone}).format(now)
 const periods=(raw.regularHours?.periods||[]).map((p:any)=>({openDay:days.indexOf(p.openDay),closeDay:days.indexOf(p.closeDay||p.openDay),open:minute(p.openTime),close:minute(p.closeTime)})).filter((p:BusinessPeriod)=>p.openDay>=0&&p.closeDay>=0&&safeMinute(p.open)&&safeMinute(p.close))
 const special=(raw.specialHours?.specialHourPeriods||[]).map((p:any)=>({startDate:dateKey(p.startDate),endDate:dateKey(p.endDate||p.startDate),closed:!!p.closed,open:minute(p.openTime),close:minute(p.closeTime)})).filter((p:SpecialPeriod)=>/^\d{4}-\d{2}-\d{2}$/.test(p.startDate)&&/^\d{4}-\d{2}-\d{2}$/.test(p.endDate)&&safeMinute(p.open)&&safeMinute(p.close))
 const address=raw.storefrontAddress||{}
 const candidate=String(raw.metadata?.mapsUri||'')
 return {title:String(raw.title||'').slice(0,200),address:[...(Array.isArray(address.addressLines)?address.addressLines:[]),address.locality,address.administrativeArea,address.postalCode].filter(Boolean).join(', ').slice(0,800),phone:String(raw.phoneNumbers?.primaryPhone||'').slice(0,60),mapsUri:/^https:\/\/(www\.)?google\.[a-z.]+\/maps(?:[/?]|$)/.test(candidate)?candidate:'',timeZone,periods,special,businessStatus:String(raw.openInfo?.status||'OPEN'),fetchedAt:now.toISOString()}
}
export function profileUsable(profile:GoogleBusinessProfile|null|undefined,now=Date.now()){const age=now-Date.parse(profile?.fetchedAt||'');return !!profile&&Number.isFinite(age)&&age>=-60000&&age<24*60*60*1000}
const clock=(n:number)=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`
export function googleWeeklyHours(profile:GoogleBusinessProfile){return [1,2,3,4,5,6,0].map(dayIndex=>{const periods=profile.periods.filter(p=>p.openDay===dayIndex);return {dayIndex,dayName:names[dayIndex],closed:!periods.length,hours:periods.length?periods.map(p=>`${clock(p.open)} – ${clock(p.close)}${p.closeDay!==p.openDay?' (+1 dia)':''}`).join(' / '):'Encerrado'}})}
export function googleOpenStatus(profile:GoogleBusinessProfile,now=new Date()) {
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:profile.timeZone,weekday:'short',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now)
 const get=(key:string)=>parts.find(p=>p.type===key)?.value||''
 const dayIndex=short.indexOf(get('weekday')),today=`${get('year')}-${get('month')}-${get('day')}`,m=Number(get('hour'))*60+Number(get('minute'))
 const match=profile.special.filter(p=>today>=p.startDate&&today<=p.endDate)
 let isOpen=false
 if(profile.businessStatus==='OPEN'){
  if(match.length)isOpen=match.some(p=>!p.closed&&(p.close>p.open?m>=p.open&&m<p.close:m>=p.open))
  else {
   // The previous day's special closing time takes precedence over the weekly overnight period.
   const previous=new Date(today+'T12:00:00Z');previous.setUTCDate(previous.getUTCDate()-1);const yesterday=previous.toISOString().slice(0,10)
   const prior=profile.special.filter(p=>yesterday>=p.startDate&&yesterday<=p.endDate)
   isOpen=prior.some(p=>!p.closed&&p.close<=p.open&&m<p.close)
   const week=dayIndex*1440+m
   if(!isOpen)isOpen=profile.periods.some(p=>{let start=p.openDay*1440+p.open,end=p.closeDay*1440+p.close;if(end<=start)end+=10080;const carried=dayIndex===(p.openDay+1)%7;if(carried&&prior.length)return false;return (week>=start&&week<end)||(week+10080>=start&&week+10080<end)})
  }
 }
 return {dayIndex,isOpen,statusText:isOpen?'Aberto agora':'Fechado no momento',nextInfo:match.length?'Horário especial informado no Google':'Horário informado no Google'}
}
