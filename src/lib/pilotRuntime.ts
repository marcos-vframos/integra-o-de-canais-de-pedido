import pb from '@/lib/pocketbase/client'

export type PilotStatus = {
 managed: boolean
 state: 'PREPARED' | 'RUNNING' | 'EXPIRED' | 'UNAVAILABLE'
 mode?: string
 startedAt?: string | null
 expiresAt?: string | null
 serverNow: string
 acceptsOrders: boolean
 integrationTest: boolean
}

export function readPilotStatus(): Promise<PilotStatus> {
 return pb.send('/backend/v1/pilot/status', { method: 'POST' })
}
export function activatePilot(): Promise<PilotStatus> {
 return pb.send('/backend/v1/pilot/activate', { method: 'POST' })
}
