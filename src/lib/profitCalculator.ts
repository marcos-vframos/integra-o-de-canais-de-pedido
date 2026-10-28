export type ProfitIngredient={id:string;name:string;unit:string;purchasePrice:string;purchaseQty:string;usedQty:string;yieldPercent:string}
export type ProfitDraft={productId:string;name:string;channel:string;price:string;discount:string;discountMode:'amount'|'percent';ingredientMode:'total'|'recipe';ingredientCost:string;ingredients:ProfitIngredient[];packaging:string;otherCost:string;deliverySubsidy:string;tax:string;cardFee:string;commission:string;fixedCost:string;targetMargin:string}
export const emptyProfitDraft=():ProfitDraft=>({productId:'',name:'',channel:'Balcão',price:'',discount:'',discountMode:'amount',ingredientMode:'total',ingredientCost:'',ingredients:[{id:'first',name:'',unit:'g',purchasePrice:'',purchaseQty:'',usedQty:'',yieldPercent:'100'}],packaging:'',otherCost:'',deliverySubsidy:'',tax:'',cardFee:'',commission:'',fixedCost:'',targetMargin:''})
const read=(raw:string,label:string,optional=false)=>{
 if(raw.trim()===''){if(optional)return 0;throw Error('Preencha '+label+'.')}
 const n=Number(raw.replace(',','.'))
 if(!Number.isFinite(n)||n<0||n>1e9)throw Error('Informe um valor válido para '+label+'.')
 return n
}
const money=(raw:string,label:string,optional=false)=>{const n=read(raw,label,optional);if(Math.abs(n*100-Math.round(n*100))>1e-5)throw Error(label+' deve ter até duas casas decimais.');return Math.round(n*100)/100}
const percent=(raw:string,label:string,optional=false)=>{const n=read(raw,label,optional);if(n>100)throw Error(label+' não pode ultrapassar 100%.');if(Math.abs(n*100-Math.round(n*100))>1e-5)throw Error(label+' deve ter até duas casas decimais.');return n}
export function ingredientUnitCost(row:ProfitIngredient){
 const price=money(row.purchasePrice,'valor da compra'),quantity=read(row.purchaseQty,'quantidade comprada'),used=read(row.usedQty,'quantidade na receita'),yieldRate=percent(row.yieldPercent,'aproveitamento')
 if(!quantity||!yieldRate)throw Error('Quantidade comprada e aproveitamento precisam ser maiores que zero.')
 const cost=price/(quantity*yieldRate/100)*used
 if(!Number.isFinite(cost)||cost>1e9)throw Error('Custo do ingrediente fora do limite da simulação.')
 return cost
}
export function calculateProfit(draft:ProfitDraft){
 const price=money(draft.price,'preço de venda');if(!price)throw Error('O preço de venda precisa ser maior que zero.')
 const discountInput=draft.discountMode==='percent'?percent(draft.discount,'desconto',true):money(draft.discount,'desconto',true)
 const discountCents=draft.discountMode==='percent'?Math.round(Math.round(price*100)*Math.round(discountInput*100)/10000):Math.round(discountInput*100)
 const revenueCents=Math.round(price*100)-discountCents
 if(revenueCents<=0)throw Error('O desconto precisa ser menor que o preço de venda.')
 let ingredients=0
 if(draft.ingredientMode==='total')ingredients=money(draft.ingredientCost,'custo dos ingredientes')
 else {if(!draft.ingredients.length)throw Error('Adicione pelo menos um ingrediente.');ingredients=draft.ingredients.reduce((sum,row)=>sum+ingredientUnitCost(row),0)}
 const packaging=money(draft.packaging,'embalagem',true),other=money(draft.otherCost,'outros custos variáveis',true),delivery=money(draft.deliverySubsidy,'subsídio de entrega',true)
 const costCents=Math.round((ingredients+packaging+other+delivery)*100)
 if(costCents>1e11)throw Error('Custo total fora do limite da simulação.')
 const rates=[percent(draft.tax,'impostos',true),percent(draft.cardFee,'taxa de pagamento',true),percent(draft.commission,'comissão do canal',true)]
 const feeCents=(net:number)=>rates.reduce((sum,rate)=>sum+Math.round(net*Math.round(rate*100)/10000),0)
 const fees=feeCents(revenueCents),contribution=revenueCents-costCents-fees
 const fixed=draft.fixedCost.trim()===''?null:money(draft.fixedCost,'despesa fixa por unidade')
 const profit=fixed===null?null:contribution-Math.round(fixed*100)
 const target=draft.targetMargin.trim()===''?null:percent(draft.targetMargin,'margem desejada')
 const totalRate=rates.reduce((sum,n)=>sum+n,0)/100
 let suggestedPrice:number|null=null,suggestionMessage='',suggestedMargin:number|null=null
 if(target!==null){
  if(fixed===null)suggestionMessage='Informe a parcela de despesa fixa por unidade para sugerir um preço.'
  else if(costCents===0&&fixed===0&&profit!==null&&profit/revenueCents*100+1e-10>=target){suggestedPrice=price;suggestedMargin=profit/revenueCents*100}
  else if(1-totalRate-target/100<=0)suggestionMessage='Meta inviável: taxas e margem desejada somam 100% ou mais.'
  else {
   const denominator=1-totalRate-target/100,discountFactor=draft.discountMode==='percent'?1-discountInput/100:1
   const minimumNet=(costCents+Math.round(fixed*100))/denominator
   let candidate=Math.max(1,Math.ceil(draft.discountMode==='percent'?minimumNet/discountFactor:minimumNet+discountInput*100))
   const meets=(priceCents:number)=>{const discount=draft.discountMode==='percent'?Math.round(priceCents*Math.round(discountInput*100)/10000):Math.round(discountInput*100);const net=priceCents-discount,earnings=net-costCents-feeCents(net)-Math.round(fixed*100);return {ok:net>0&&earnings/net+1e-10>=target/100,margin:net>0?earnings/net*100:0}}
   // Round each fee separately and verify the target again at the suggested currency price.
   for(let step=0;step<100;step++,candidate++){if(meets(candidate).ok)break}
   if(!meets(candidate).ok)candidate+=Math.ceil(3/(denominator*discountFactor))
   if(candidate<=1e11&&meets(candidate).ok){suggestedPrice=candidate/100;suggestedMargin=meets(candidate).margin}
   else suggestionMessage='Não foi possível sugerir um preço dentro do limite desta simulação.'
  }
 }
 return {price,discount:discountCents/100,revenue:revenueCents/100,ingredients,packaging,other,delivery,variableCost:costCents/100,fees:fees/100,contribution:contribution/100,contributionMargin:contribution/revenueCents*100,fixedCost:fixed,profit:profit===null?null:profit/100,profitMargin:profit===null?null:profit/revenueCents*100,targetMargin:target,suggestedPrice,suggestedMargin,suggestionMessage}
}
