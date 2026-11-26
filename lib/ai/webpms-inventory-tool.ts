import { tool } from 'ai'
import { z } from 'zod'
import { fetchWebPmsInventory } from '@/lib/commerce/travelline-webpms'

export function makeWebPmsInventoryTool(key: string | undefined) {
  return tool({
    description: 'Get the total physical rooms and distinct room types for this hotel. Counts cover the entire inventory, regardless of occupancy.',
    inputSchema: z.object({}),
    execute: async () => {
      try {
        return await fetchWebPmsInventory(key)
      } catch {
        return { error: 'Room inventory could not be verified.' }
      }
    },
  })
}
