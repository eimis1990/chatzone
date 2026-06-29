'use client'

import { useState, useTransition } from 'react'
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  CopyIcon,
  ExternalLinkIcon,
  Loader2Icon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { LinkedInPost, LinkedInPostStatus } from '@/lib/types'
import {
  createLinkedInPost,
  updateLinkedInPost,
  setLinkedInPostStatus,
  deleteLinkedInPost,
} from '@/app/(owner)/owner/linkedin/actions'

const COLUMNS: { key: LinkedInPostStatus; label: string; dot: string }[] = [
  { key: 'idea', label: 'Ideas', dot: 'bg-muted-foreground/40' },
  { key: 'draft', label: 'Drafts', dot: 'bg-amber-500' },
  { key: 'posted', label: 'Posted', dot: 'bg-green-500' },
]

const STATUS_LABEL: Record<LinkedInPostStatus, string> = {
  idea: 'Idea',
  draft: 'Draft',
  posted: 'Posted',
}

interface FormState {
  id?: string
  title: string
  body: string
  link: string
  status: LinkedInPostStatus
}

const EMPTY: FormState = { title: '', body: '', link: '', status: 'draft' }

export function LinkedInBoard({ initialPosts }: { initialPosts: LinkedInPost[] }) {
  const [posts, setPosts] = useState<LinkedInPost[]>(initialPosts)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [pending, startTransition] = useTransition()

  function openNew() {
    setForm(EMPTY)
    setOpen(true)
  }

  function openEdit(p: LinkedInPost) {
    setForm({ id: p.id, title: p.title, body: p.body, link: p.link ?? '', status: p.status })
    setOpen(true)
  }

  function save() {
    if (!form.title.trim()) {
      toast.error('Give the post a title')
      return
    }
    const payload = { title: form.title, body: form.body, link: form.link, status: form.status }
    startTransition(async () => {
      try {
        if (form.id) {
          const saved = await updateLinkedInPost(form.id, payload)
          setPosts((prev) => prev.map((p) => (p.id === saved.id ? saved : p)))
          toast.success('Post updated')
        } else {
          const saved = await createLinkedInPost(payload)
          setPosts((prev) => [saved, ...prev])
          toast.success('Post added')
        }
        setOpen(false)
      } catch (err) {
        toast.error((err as Error).message)
      }
    })
  }

  function move(post: LinkedInPost, status: LinkedInPostStatus) {
    if (status === post.status) return
    startTransition(async () => {
      try {
        const saved = await setLinkedInPostStatus(post.id, status)
        setPosts((prev) => prev.map((p) => (p.id === saved.id ? saved : p)))
      } catch (err) {
        toast.error((err as Error).message)
      }
    })
  }

  function remove(post: LinkedInPost) {
    if (!window.confirm('Delete this post? This cannot be undone.')) return
    startTransition(async () => {
      try {
        await deleteLinkedInPost(post.id)
        setPosts((prev) => prev.filter((p) => p.id !== post.id))
        toast.success('Post deleted')
      } catch (err) {
        toast.error((err as Error).message)
      }
    })
  }

  async function copy(post: LinkedInPost) {
    const text = post.link ? `${post.body}\n\n${post.link}` : post.body
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied — paste into LinkedIn')
    } catch {
      toast.error('Could not copy to clipboard')
    }
  }

  return (
    <>
      <div className="flex h-full min-h-0 flex-col gap-5">
        {/* Header — stays static at the top */}
        <div className="flex shrink-0 items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">LinkedIn posts</h1>
            <p className="text-sm text-muted-foreground">
              Plan posts, draft the copy, and tick them off once they&rsquo;re live.
            </p>
          </div>
          <Button onClick={openNew} className="shrink-0">
            <PlusIcon className="size-4" /> New post
          </Button>
        </div>

        {/* Board — fills the rest; on desktop each column scrolls under its static white header */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
          {COLUMNS.map((col) => {
            const items = posts.filter((p) => p.status === col.key)
            return (
              <div
                key={col.key}
                className="flex flex-col rounded-xl bg-muted/40 md:min-h-0 md:min-w-0 md:flex-1 md:overflow-hidden"
              >
                <div className="flex shrink-0 items-center gap-2 rounded-t-xl border-b border-border bg-white px-3 py-2.5">
                  <span className={`size-2 rounded-full ${col.dot}`} aria-hidden="true" />
                  <span className="text-sm font-semibold">{col.label}</span>
                  <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                    {items.length}
                  </span>
                </div>

                <div className="flex flex-col gap-3 p-3 md:min-h-0 md:flex-1 md:overflow-y-auto">
                  {items.length === 0 ? (
                    <p className="px-1 py-6 text-center text-xs text-muted-foreground">Nothing here yet.</p>
                  ) : (
                    items.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        pending={pending}
                        onEdit={() => openEdit(post)}
                        onDelete={() => remove(post)}
                        onCopy={() => copy(post)}
                        onMove={(s) => move(post, s)}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Create / edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit post' : 'New post'}</DialogTitle>
            <DialogDescription>
              Write a native, hook-first post. Drop any link in the field below — paste it into the
              first comment on LinkedIn for best reach.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-1">
            <div className="grid gap-1.5">
              <Label htmlFor="li-title">Title / hook</Label>
              <Input
                id="li-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Most store chatbots lie to customers. Here's the fix."
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="li-body">Post body</Label>
              <Textarea
                id="li-body"
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="The full post copy…"
                className="min-h-56 whitespace-pre-wrap"
              />
              <span className="text-right text-[11px] text-muted-foreground tabular-nums">
                {form.body.length} / 3000
              </span>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="li-link">Link (optional)</Label>
              <Input
                id="li-link"
                value={form.link}
                onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
                placeholder="https://www.loqara.com/blog/…"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="li-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as LinkedInPostStatus }))}
              >
                <SelectTrigger id="li-status" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="idea">Idea</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="posted">Posted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending && <Loader2Icon className="size-4 animate-spin" />}
              {form.id ? 'Save changes' : 'Add post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function PostCard({
  post,
  pending,
  onEdit,
  onDelete,
  onCopy,
  onMove,
}: {
  post: LinkedInPost
  pending: boolean
  onEdit: () => void
  onDelete: () => void
  onCopy: () => void
  onMove: (status: LinkedInPostStatus) => void
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{post.title}</p>
        <div className="flex shrink-0 gap-0.5">
          <button
            type="button"
            onClick={onCopy}
            title="Copy body + link"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <CopyIcon className="size-4" />
          </button>
          <button
            type="button"
            onClick={onEdit}
            title="Edit"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <PencilIcon className="size-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            title="Delete"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          >
            <Trash2Icon className="size-4" />
          </button>
        </div>
      </div>

      {post.body && (
        <p className="mt-1.5 line-clamp-4 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
          {post.body}
        </p>
      )}

      {post.link && (
        <a
          href={post.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex max-w-full items-center gap-1 truncate rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-foreground/80 hover:text-foreground"
        >
          <ExternalLinkIcon className="size-3 shrink-0" />
          <span className="truncate">{post.link.replace(/^https?:\/\//, '')}</span>
        </a>
      )}

      <div className="mt-3 border-t border-border pt-2">
        <Select value={post.status} onValueChange={(v) => onMove(v as LinkedInPostStatus)}>
          <SelectTrigger className="h-7 w-full text-xs">
            <span className="text-muted-foreground">Move to:&nbsp;</span>
            <SelectValue>{STATUS_LABEL[post.status]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="idea">Idea</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="posted">Posted</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
