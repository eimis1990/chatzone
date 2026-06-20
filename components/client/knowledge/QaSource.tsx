'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createBrowserClient } from '@/lib/supabase/browser'
import type { KnowledgeSource } from '@/lib/types'

interface QaPair {
  question: string
  answer: string
}

interface QaSourceProps {
  botId: string
  onSourceAdded: (source: KnowledgeSource) => void
}

const EMPTY_PAIR: QaPair = { question: '', answer: '' }

export function QaSource({ botId, onSourceAdded }: QaSourceProps) {
  const [name, setName] = useState('')
  const [pairs, setPairs] = useState<QaPair[]>([{ ...EMPTY_PAIR }])
  const [loading, setLoading] = useState(false)

  const addPair = useCallback(() => {
    setPairs((prev) => [...prev, { ...EMPTY_PAIR }])
  }, [])

  const removePair = useCallback((index: number) => {
    setPairs((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const updatePair = useCallback(
    (index: number, field: keyof QaPair, value: string) => {
      setPairs((prev) =>
        prev.map((pair, i) => (i === index ? { ...pair, [field]: value } : pair)),
      )
    },
    [],
  )

  const isValid =
    name.trim() !== '' &&
    pairs.length > 0 &&
    pairs.every((p) => p.question.trim() !== '' && p.answer.trim() !== '')

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (!isValid) return

      setLoading(true)
      try {
        const supabase = createBrowserClient()

        const filteredPairs = pairs
          .filter((p) => p.question.trim() && p.answer.trim())
          .map((p) => ({ question: p.question.trim(), answer: p.answer.trim() }))

        const { data: source, error: insertError } = await supabase
          .from('knowledge_sources')
          .insert({
            bot_id: botId,
            type: 'qa',
            name: name.trim(),
            status: 'pending',
            metadata: { pairs: filteredPairs },
          })
          .select('*')
          .single<KnowledgeSource>()

        if (insertError || !source) {
          throw new Error(insertError?.message ?? 'Failed to create source')
        }

        onSourceAdded(source)

        const ingestRes = await fetch('/api/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceId: source.id }),
        })
        if (!ingestRes.ok) {
          throw new Error('Ingestion request failed')
        }

        toast.success('Q&A source added and ingestion started')
        setName('')
        setPairs([{ ...EMPTY_PAIR }])
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    },
    [botId, name, pairs, isValid, onSourceAdded],
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      <div className="space-y-1.5">
        <Label htmlFor="qa-name">Source name</Label>
        <Input
          id="qa-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Product Q&A"
          required
          disabled={loading}
        />
      </div>

      <div className="space-y-3">
        <Label>Question &amp; Answer pairs</Label>

        {pairs.map((pair, index) => (
          <div key={index} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Pair {index + 1}
              </span>
              {pairs.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removePair(index)}
                  disabled={loading}
                  aria-label={`Remove pair ${index + 1}`}
                >
                  <TrashIcon />
                </Button>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`qa-question-${index}`} className="text-xs">
                Question
              </Label>
              <Input
                id={`qa-question-${index}`}
                value={pair.question}
                onChange={(e) => updatePair(index, 'question', e.target.value)}
                placeholder="What is your return policy?"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`qa-answer-${index}`} className="text-xs">
                Answer
              </Label>
              <Textarea
                id={`qa-answer-${index}`}
                value={pair.answer}
                onChange={(e) => updatePair(index, 'answer', e.target.value)}
                placeholder="We offer a 30-day return policy…"
                className="min-h-20"
                required
                disabled={loading}
              />
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addPair}
          disabled={loading}
        >
          <PlusIcon />
          Add another pair
        </Button>
      </div>

      <Button type="submit" disabled={loading || !isValid}>
        {loading ? 'Adding…' : 'Add Q&A source'}
      </Button>
    </form>
  )
}
