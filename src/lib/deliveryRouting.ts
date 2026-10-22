import pb from '@/lib/pocketbase/client'
import type {RoadRoute} from '../../supabase/functions/_shared/roadRouting'
export type {RoadRoute}
export const routePointKey=(p:{lat:number;lng:number})=>`${p.lat},${p.lng}`
export async function loadRoutingCapabilities(){return pb.send<{roadRouting:boolean;liveTraffic:boolean}>('/backend/v1/delivery/routes',{body:{action:'capabilities'}})}
export async function loadRoadRoute(destination:{lat:number;lng:number},traffic=false){return pb.send<{route:RoadRoute;origin:{lat:number;lng:number;confirmed:boolean}}>('/backend/v1/delivery/routes',{body:{action:'route',destination,traffic}})}
export async function loadRoadMatrix(targets:{id:string;lat:number;lng:number}[]){return pb.send<{routes:{id:string;route:RoadRoute|null}[]}>('/backend/v1/delivery/routes',{body:{action:'matrix',targets}})}
export async function loadDeliveryQuote(destination:{lat:number;lng:number}){return pb.send<{route:RoadRoute;fee:number;nearestName:string}>('/backend/v1/delivery/routes',{body:{action:'quote',destination}})}
