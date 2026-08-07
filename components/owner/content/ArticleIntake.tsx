'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRightIcon, BookOpenCheckIcon, FilePlus2Icon, RefreshCwIcon } from 'lucide-react'
import { toast } from 'sonner'
import { createContentItem } from '@/app/(owner)/owner/content/actions'
import { ContentStudioGuide, ContentStudioHeader } from '@/components/owner/content/ContentStudioChrome'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { ContentMode } from '@/lib/content-studio/types'

interface ArticleOption { slug: string; title: string }
interface TopicOption { slug: string; name: string }

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : 'Could not create the article'
}

export function ArticleIntake({ articles, topics }: { articles: ArticleOption[]; topics: TopicOption[] }) {
  const router = useRouter()
  const [mode, setMode] = useState<ContentMode>('new')
  const [title, setTitle] = useState('')
  const [targetQuery, setTargetQuery] = useState('')
  const [topic, setTopic] = useState(topics[0]?.slug ?? '')
  const [searchIntent, setSearchIntent] = useState('Learn and compare options')
  const [readerJob, setReaderJob] = useState('')
  const [refreshSlug, setRefreshSlug] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    try {
      const item = await createContentItem({
        mode,
        title,
        target_query: targetQuery,
        topic,
        search_intent: searchIntent,
        reader_job: readerJob,
        refresh_slug: mode === 'refresh' ? refreshSlug : null,
        notes,
      })
      toast.success('Article workspace created')
      router.push(`/owner/content/${item.id}`)
    } catch (caught) {
      const message = messageFromError(caught)
      setError(message)
      toast.error(message)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-5">
      <ContentStudioHeader
        title="Create an article brief"
        badge="Private workspace"
        description="Give the Studio a clear reader outcome and search need. Everything else can be refined before review."
        backHref="/owner/content"
      />

      <ContentStudioGuide
        icon={BookOpenCheckIcon}
        eyebrow="Step 1 · Brief"
        title="Start with the reader need"
        description="A focused brief gives research, writing, and quality checks one shared direction. Nothing is published from this step."
        currentStage={0}
        action={<Badge variant="secondary">Private draft</Badge>}
      />

      <form onSubmit={submit} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="gap-0 py-0">
          <CardHeader className="border-b bg-muted/35 p-5">
            <CardTitle>Article brief</CardTitle>
            <CardDescription>Define the job before asking the Studio to research and write.</CardDescription>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <FieldGroup>
              <Field>
                <FieldLabel>Content type</FieldLabel>
                <ToggleGroup
                  variant="outline"
                  size="lg"
                  value={[mode]}
                  onValueChange={(value) => {
                    const nextMode = value[0] as ContentMode | undefined
                    if (!nextMode) return
                    setMode(nextMode)
                    if (nextMode === 'new') setRefreshSlug(null)
                  }}
                  className="grid w-full gap-2 sm:grid-cols-2"
                  aria-label="Content type"
                >
                  <ToggleGroupItem value="new" className="min-h-12 w-full justify-start data-pressed:border-primary data-pressed:bg-primary/10 data-pressed:text-primary">
                    <FilePlus2Icon data-icon="inline-start" /> New article
                  </ToggleGroupItem>
                  <ToggleGroupItem value="refresh" className="min-h-12 w-full justify-start data-pressed:border-primary data-pressed:bg-primary/10 data-pressed:text-primary">
                    <RefreshCwIcon data-icon="inline-start" /> Refresh existing
                  </ToggleGroupItem>
                </ToggleGroup>
              </Field>

              {mode === 'refresh' && (
                <Field>
                  <FieldLabel htmlFor="content-refresh-source">Article to refresh</FieldLabel>
                  <Select value={refreshSlug} onValueChange={(value) => setRefreshSlug(value)}>
                    <SelectTrigger id="content-refresh-source" className="w-full"><SelectValue placeholder="Choose an existing article" /></SelectTrigger>
                    <SelectContent><SelectGroup>{articles.map((article) => <SelectItem key={article.slug} value={article.slug}>{article.title}</SelectItem>)}</SelectGroup></SelectContent>
                  </Select>
                </Field>
              )}

              <Field>
                <FieldLabel htmlFor="content-title">Working title</FieldLabel>
                <Input id="content-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. How AI shopping assistants help customers choose" required minLength={3} maxLength={180} />
                <FieldDescription>A useful direction, not a final headline.</FieldDescription>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="content-query">Target query</FieldLabel>
                  <Input id="content-query" value={targetQuery} onChange={(event) => setTargetQuery(event.target.value)} placeholder="AI shopping assistant" required maxLength={180} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="content-topic">Topic cluster</FieldLabel>
                  <Select value={topic} onValueChange={(value) => value && setTopic(value)}>
                    <SelectTrigger id="content-topic" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectGroup>{topics.map((option) => <SelectItem key={option.slug} value={option.slug}>{option.name}</SelectItem>)}</SelectGroup></SelectContent>
                  </Select>
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="content-intent">Search intent</FieldLabel>
                <Select value={searchIntent} onValueChange={(value) => value && setSearchIntent(value)}>
                  <SelectTrigger id="content-intent" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectGroup>
                    <SelectItem value="Learn how it works">Learn how it works</SelectItem>
                    <SelectItem value="Learn and compare options">Learn and compare options</SelectItem>
                    <SelectItem value="Solve a specific problem">Solve a specific problem</SelectItem>
                    <SelectItem value="Evaluate a purchase">Evaluate a purchase</SelectItem>
                  </SelectGroup></SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="content-reader-job">What should the reader be able to do afterwards?</FieldLabel>
                <Textarea id="content-reader-job" value={readerJob} onChange={(event) => setReaderJob(event.target.value)} placeholder="Understand the tradeoffs and choose whether this is worth implementing for their store." className="min-h-24" required maxLength={500} />
              </Field>

              <Field>
                <FieldLabel htmlFor="content-notes">Notes <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel>
                <Textarea id="content-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Examples, product context, claims to verify, or angles to avoid." className="min-h-24" maxLength={4000} />
              </Field>

              {error && <Alert variant="destructive"><AlertTitle>Could not create article</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

              <div className="flex justify-end border-t pt-5">
                <Button type="submit" size="lg" className="min-h-11" disabled={pending}>
                  {pending ? <><Spinner /> Creating workspace…</> : <>Create workspace <ArrowRightIcon data-icon="inline-end" /></>}
                </Button>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <aside className="grid content-start gap-3 lg:sticky lg:top-5">
          <Card className="gap-0 py-0">
            <CardHeader className="border-b p-5"><CardTitle>What happens next</CardTitle><CardDescription>The Studio guides the work, but you own every publishing decision.</CardDescription></CardHeader>
            <CardContent className="grid gap-4 p-5 text-sm text-muted-foreground">
              <p><strong className="mr-2 text-foreground">1.</strong>A private article workspace is created.</p>
              <p><strong className="mr-2 text-foreground">2.</strong>Research and writing use the real Loqara blog contract.</p>
              <p><strong className="mr-2 text-foreground">3.</strong>Required checks must pass before human review.</p>
              <p><strong className="mr-2 text-foreground">4.</strong>Publishing creates a draft GitHub PR for final approval.</p>
            </CardContent>
          </Card>
        </aside>
      </form>
    </div>
  )
}
