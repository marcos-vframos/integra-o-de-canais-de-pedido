import { calculateDistanceKm, type DeliveryFeeItem } from './geoDistance'
import { zoneMeta, type Neighborhood } from './deliveryAreas'
export type DeliveryZoneType = 'urban' | 'rural' | 'central' | 'district'
export const DELIVERY_ZONES: Record<DeliveryZoneType,{label:string;color:string}> = {
 urban:{label:'Urbana',color:'#94a3b8'}, rural:{label:'Rural',color:'#6b8e72'}, central:{label:'Central',color:'#ad956d'}, district:{label:'Distrito',color:'#9583ad'},
}
export const DISTANCE_BANDS = [
 {max:3,color:'#22c55e'}, {max:5,color:'#84cc16'}, {max:7,color:'#eab308'}, {max:9,color:'#f59e0b'}, {max:11,color:'#f97316'},
 {max:13,color:'#ef4444'}, {max:15,color:'#ec4899'}, {max:17,color:'#a855f7'}, {max:19,color:'#6366f1'}, {max:21,color:'#06b6d4'},
]
export const DEFAULT_DELIVERY_ORIGIN={name:"Loyola's Lanches",lat:-22.9238,lng:-45.4740,confirmed:false}
export type DeliveryOrigin=typeof DEFAULT_DELIVERY_ORIGIN
export const normalizeNeighborhood=(name:string)=>name.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR')
export const validCoordinates=(lat:number,lng:number)=>Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180
export function distanceBand(km:number){
 const i=DISTANCE_BANDS.findIndex(b=>km<=b.max)
 if(!Number.isFinite(km)||km<0)return {label:'Sem coordenadas',color:'#71717a'}
 return i<0?{label:'Acima de 21 km',color:'#d4d4d8'}:{...DISTANCE_BANDS[i],label:i===0?'Até 3 km':`>${DISTANCE_BANDS[i-1].max} a ${DISTANCE_BANDS[i].max} km`}
}
export const distanceFromOrigin=(row:Pick<DeliveryFeeItem,'lat'|'lng'>,origin:DeliveryOrigin)=>validCoordinates(row.lat!,row.lng!)?calculateDistanceKm(origin.lat,origin.lng,row.lat!,row.lng!):NaN
export function deliveryZone(row:{description?:string}):DeliveryZoneType {
 const zone=zoneMeta(row.description).zoneType
 return zone in DELIVERY_ZONES?zone:'urban'
}
export function neighborhoodDescription(row:Neighborhood&{description?:string}, changes:Record<string,unknown>={}){
 const metadata=zoneMeta(row.description)
 return JSON.stringify({...metadata,...(!Object.keys(metadata).length&&row.description?{note:row.description}:{}),...changes})
}
