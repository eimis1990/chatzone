'use client'

/**
 * VisualizerSection — Product visualizer configuration block for ConfigForm.
 *
 * Renders:
 *  - Master enable toggle (roomVisualizer) — lets widget visitors upload a room
 *    photo and see selected products placed in it (AI render)
 *  - Image model picker (roomVisualizerModel) — Nano Banana Pro (default) or
 *    GPT Image 2, shown once the feature is enabled
 *
 * Gating mirrors VoiceSection: the section is always visible, but without the
 * Product visualizer add-on the toggle links to the subscription page instead.
 */

import { Controller, type Control, type UseFormWatch } from 'react-hook-form'
import { SofaIcon } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { CardContent } from '@/components/ui/card'
import { CollapsibleSection, SectionHeader } from '@/components/client/CollapsibleSection'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { z } from 'zod'
import type { botConfigFormSchema } from '@/lib/validation/schemas'

type FormValues = z.input<typeof botConfigFormSchema>

interface VisualizerSectionProps {
  control: Control<FormValues>
  watch: UseFormWatch<FormValues>
  /** Org has the Product visualizer add-on (owner demo bots pass true). */
  canUseVisualizer?: boolean
  /** 'client' links to the client subscription page for the add-on hint. */
  audience?: 'owner' | 'client'
}

const MODEL_OPTIONS = [
  {
    value: 'nano-banana-pro',
    label: 'Nano Banana Pro',
    hint: 'Default — best at keeping the room photo intact.',
  },
  {
    value: 'gpt-image-2',
    label: 'GPT Image 2',
    hint: 'Alternative look; try it if renders miss the mark.',
  },
] as const

export function VisualizerSection({
  control,
  watch,
  canUseVisualizer = true,
  audience = 'owner',
}: VisualizerSectionProps) {
  const enabled = watch('roomVisualizer') ?? false

  return (
    <CollapsibleSection
      header={
        <SectionHeader
          icon={SofaIcon}
          title="Product visualizer"
          description="Let visitors see your products placed in a photo of their own room."
        />
      }
    >
      <CardContent className="flex flex-col gap-3 bg-black/[0.055] py-3">
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
          <div>
            <p className="text-sm font-medium">Enable product visualizer</p>
            <p className="text-xs text-muted-foreground">
              Visitors upload a room photo and get an AI render with the selected products placed
              in it — up to 5 renders per conversation.
            </p>
          </div>
          <Controller
            name="roomVisualizer"
            control={control}
            render={({ field }) => (
              <Switch
                checked={(field.value ?? false) && canUseVisualizer}
                onCheckedChange={field.onChange}
                disabled={!canUseVisualizer}
                aria-label="Enable product visualizer"
              />
            )}
          />
        </div>

        {!canUseVisualizer &&
          (audience === 'client' ? (
            <a href="/app/subscription" className="text-xs text-primary hover:underline">
              Requires the Product visualizer add-on — see plans &amp; add-ons
            </a>
          ) : (
            <p className="text-xs text-muted-foreground">
              Requires the Product visualizer add-on on this organization&apos;s subscription.
            </p>
          ))}

        {canUseVisualizer && enabled && (
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="roomVisualizerModel" className="text-sm font-medium">
                  Image model
                </Label>
                <p className="text-xs text-muted-foreground">
                  {MODEL_OPTIONS.find((o) => o.value === (watch('roomVisualizerModel') ?? 'nano-banana-pro'))?.hint}
                </p>
              </div>
              <Controller
                name="roomVisualizerModel"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? 'nano-banana-pro'} onValueChange={field.onChange}>
                    <SelectTrigger id="roomVisualizerModel" className="w-44 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODEL_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
        )}
      </CardContent>
    </CollapsibleSection>
  )
}
