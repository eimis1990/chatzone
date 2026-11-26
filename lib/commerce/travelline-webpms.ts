import { z } from 'zod'
import type { CommerceDeps } from './types'

const roomId = z.union([z.string().trim().min(1), z.number().int()]).transform(String)
const roomsSchema = z.array(z.object({ id: roomId, roomTypeId: roomId }))

/** The key selects the hotel. Only aggregate counts leave the connector. */
export async function fetchWebPmsInventory(key: string | undefined, deps: CommerceDeps = {}) {
  if (!key?.trim()) throw new Error('Missing WebPMS key')
  const response = await (deps.fetchImpl ?? fetch)('https://partner.tlintegration.com/api/webpms/v1/rooms', {
    headers: { 'X-API-KEY': key.trim(), Accept: 'application/json' },
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error(`WebPMS inventory request failed (${response.status})`)
  const rooms = roomsSchema.parse(await response.json())
  return {
    roomCount: new Set(rooms.map(room => room.id)).size,
    roomTypeCount: new Set(rooms.map(room => room.roomTypeId)).size,
  }
}
