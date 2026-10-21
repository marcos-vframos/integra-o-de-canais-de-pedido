type Voucher={type:string;targetProductId?:string|null;discountAmount?:number;discountPercent?:number}
export function voucherDiscount(voucher:Voucher|null,lines:{productId:string;total:number}[],deliveryFee:number):number {
 if(!voucher)return 0
 const subtotal=lines.reduce((n,line)=>n+Math.max(0,line.total),0)
 if(voucher.type==='free_delivery')return Math.max(0,deliveryFee)
 const eligible=voucher.type==='product_discount'&&voucher.targetProductId?lines.filter(l=>l.productId===voucher.targetProductId).reduce((n,l)=>n+Math.max(0,l.total),0):subtotal
 if(voucher.type==='voucher_10'||(voucher.type==='product_discount'&&Number(voucher.discountPercent)>0))return Math.round(eligible*Math.min(100,Math.max(0,Number(voucher.discountPercent)||(voucher.type==='voucher_10'?10:0))))/100
 if(voucher.type==='product_discount')return Math.min(eligible,Math.max(0,Number(voucher.discountAmount)||0))
 return 0
}
