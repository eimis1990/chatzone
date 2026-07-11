'use client'

import Image from 'next/image'
import { useRef, useState, useTransition } from 'react'
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  CopyIcon,
  ExternalLinkIcon,
  GripVerticalIcon,
  ImageIcon,
  LightbulbIcon,
  Loader2Icon,
  MegaphoneIcon,
  PencilIcon,
  PlusIcon,
  SendIcon,
  Trash2Icon,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { LinkedInPost, LinkedInPostStatus } from '@/lib/types'
import {
  createLinkedInPost,
  deleteLinkedInPost,
  updateLinkedInPost,
  updateLinkedInPostPositions,
} from '@/app/(owner)/owner/linkedin/actions'

const COLUMNS: {
  key: LinkedInPostStatus
  label: string
  description: string
  dot: string
  icon: typeof LightbulbIcon
}[] = [
  {
    key: 'idea',
    label: 'Ideas',
    description: 'Promising angles to develop',
    dot: 'bg-muted-foreground/50',
    icon: LightbulbIcon,
  },
  {
    key: 'draft',
    label: 'Drafts',
    description: 'Ready to review and publish',
    dot: 'bg-amber-500',
    icon: PencilIcon,
  },
  {
    key: 'posted',
    label: 'Posted',
    description: 'Published content archive',
    dot: 'bg-emerald-500',
    icon: SendIcon,
  },
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
  image_url: string
  image_alt: string
  status: LinkedInPostStatus
  sort_order?: number
}

type BoardState = Record<LinkedInPostStatus, LinkedInPost[]>

const EMPTY: FormState = {
  title: '',
  body: '',
  link: '',
  image_url: '',
  image_alt: '',
  status: 'draft',
}

function normalizeBoard(board: BoardState): BoardState {
  return {
    idea: board.idea.map((post, index) => ({ ...post, status: 'idea', sort_order: index })),
    draft: board.draft.map((post, index) => ({ ...post, status: 'draft', sort_order: index })),
    posted: board.posted.map((post, index) => ({ ...post, status: 'posted', sort_order: index })),
  }
}

function boardFromPosts(posts: LinkedInPost[]): BoardState {
  const sorted = [...posts].sort(
    (a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at),
  )
  return normalizeBoard({
    idea: sorted.filter((post) => post.status === 'idea'),
    draft: sorted.filter((post) => post.status === 'draft'),
    posted: sorted.filter((post) => post.status === 'posted'),
  })
}

function replacePost(board: BoardState, saved: LinkedInPost): BoardState {
  const next: BoardState = {
    idea: board.idea.filter((post) => post.id !== saved.id),
    draft: board.draft.filter((post) => post.id !== saved.id),
    posted: board.posted.filter((post) => post.id !== saved.id),
  }
  next[saved.status].splice(Math.min(saved.sort_order, next[saved.status].length), 0, saved)
  return normalizeBoard(next)
}

function postCount(board: BoardState): number {
  return board.idea.length + board.draft.length + board.posted.length
}

export function LinkedInBoard({ initialPosts }: { initialPosts: LinkedInPost[] }) {
  const initialBoard = boardFromPosts(initialPosts)
  const [board, setBoard] = useState<BoardState>(initialBoard)
  const boardRef = useRef(initialBoard)
  const dragStartBoard = useRef(initialBoard)
  const [activePostId, setActivePostId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [pending, startTransition] = useTransition()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const commitBoard = (next: BoardState) => {
    const normalized = normalizeBoard(next)
    boardRef.current = normalized
    setBoard(normalized)
  }

  function openNew(status: LinkedInPostStatus = 'draft') {
    setForm({ ...EMPTY, status })
    setOpen(true)
  }

  function openEdit(post: LinkedInPost) {
    setForm({
      id: post.id,
      title: post.title,
      body: post.body,
      link: post.link ?? '',
      image_url: post.image_url ?? '',
      image_alt: post.image_alt ?? '',
      status: post.status,
      sort_order: post.sort_order,
    })
    setOpen(true)
  }

  function save() {
    if (!form.title.trim()) {
      toast.error('Give the post a title')
      return
    }
    if (form.status !== 'idea' && !form.body.trim()) {
      toast.error('Drafts and posted entries need post copy')
      return
    }
    if (form.body.length > 3000) {
      toast.error('LinkedIn post copy must stay under 3,000 characters')
      return
    }

    const payload = {
      title: form.title,
      body: form.body,
      link: form.link,
      image_url: form.image_url,
      image_alt: form.image_alt,
      status: form.status,
      sort_order: form.sort_order,
    }

    startTransition(async () => {
      try {
        const saved = form.id
          ? await updateLinkedInPost(form.id, payload)
          : await createLinkedInPost(payload)
        commitBoard(replacePost(boardRef.current, saved))
        toast.success(form.id ? 'Post updated' : 'Post added')
        setOpen(false)
      } catch (error) {
        toast.error((error as Error).message)
      }
    })
  }

  function persistBoard(next: BoardState, rollback: BoardState) {
    const updates = COLUMNS.flatMap(({ key }) =>
      next[key].map((post, sortOrder) => ({
        id: post.id,
        status: key,
        sort_order: sortOrder,
        posted_at: post.posted_at,
      })),
    )

    startTransition(async () => {
      try {
        const saved = await updateLinkedInPostPositions(updates)
        const savedById = new Map(saved.map((post) => [post.id, post]))
        commitBoard(
          normalizeBoard({
            idea: boardRef.current.idea.map((post) => savedById.get(post.id) ?? post),
            draft: boardRef.current.draft.map((post) => savedById.get(post.id) ?? post),
            posted: boardRef.current.posted.map((post) => savedById.get(post.id) ?? post),
          }),
        )
      } catch (error) {
        commitBoard(rollback)
        toast.error((error as Error).message)
      }
    })
  }

  function moveTo(post: LinkedInPost, status: LinkedInPostStatus) {
    if (status === post.status) return
    const rollback = boardRef.current
    const next: BoardState = {
      idea: rollback.idea.filter((item) => item.id !== post.id),
      draft: rollback.draft.filter((item) => item.id !== post.id),
      posted: rollback.posted.filter((item) => item.id !== post.id),
    }
    next[status].push({ ...post, status })
    const normalized = normalizeBoard(next)
    commitBoard(normalized)
    persistBoard(normalized, rollback)
  }

  function remove(post: LinkedInPost) {
    if (!window.confirm('Delete this post? This cannot be undone.')) return
    startTransition(async () => {
      try {
        await deleteLinkedInPost(post.id)
        commitBoard({
          idea: boardRef.current.idea.filter((item) => item.id !== post.id),
          draft: boardRef.current.draft.filter((item) => item.id !== post.id),
          posted: boardRef.current.posted.filter((item) => item.id !== post.id),
        })
        toast.success('Post deleted')
      } catch (error) {
        toast.error((error as Error).message)
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

  function findColumn(id: string): LinkedInPostStatus | null {
    if (id === 'idea' || id === 'draft' || id === 'posted') return id
    return COLUMNS.find(({ key }) => boardRef.current[key].some((post) => post.id === id))?.key ?? null
  }

  const activePost = activePostId
    ? COLUMNS.flatMap(({ key }) => board[key]).find((post) => post.id === activePostId) ?? null
    : null

  return (
    <>
      <div className="flex h-full min-h-0 flex-col gap-5">
        <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">LinkedIn posts</h1>
              <Badge variant="outline" className="font-normal text-muted-foreground">
                {postCount(board)} planned
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Shape the content pipeline, drag posts into place, and publish with a consistent voice.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden font-normal sm:inline-flex">
              <GripVerticalIcon data-icon="inline-start" />
              Drag to reorder
            </Badge>
            <Button onClick={() => openNew()} className="shrink-0">
              <PlusIcon data-icon="inline-start" />
              New post
            </Button>
          </div>
        </div>

        <DndContext
          id="linkedin-posts-board"
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={({ active }) => {
            dragStartBoard.current = boardRef.current
            setActivePostId(String(active.id))
          }}
          onDragOver={({ active, over }) => {
            if (!over) return
            const activeColumn = findColumn(String(active.id))
            const overColumn = findColumn(String(over.id))
            if (!activeColumn || !overColumn || activeColumn === overColumn) return

            const current = boardRef.current
            const activeItems = current[activeColumn]
            const overItems = current[overColumn]
            const activeIndex = activeItems.findIndex((post) => post.id === active.id)
            if (activeIndex < 0) return
            const overIndex = overItems.findIndex((post) => post.id === over.id)
            const insertAt = overIndex < 0 ? overItems.length : overIndex
            const movedPost = { ...activeItems[activeIndex], status: overColumn }
            commitBoard({
              ...current,
              [activeColumn]: activeItems.filter((post) => post.id !== active.id),
              [overColumn]: [
                ...overItems.slice(0, insertAt),
                movedPost,
                ...overItems.slice(insertAt),
              ],
            })
          }}
          onDragCancel={() => {
            setActivePostId(null)
            commitBoard(dragStartBoard.current)
          }}
          onDragEnd={({ active, over }) => {
            setActivePostId(null)
            if (!over) {
              commitBoard(dragStartBoard.current)
              return
            }

            const current = boardRef.current
            const activeColumn = findColumn(String(active.id))
            const overColumn = findColumn(String(over.id))
            let next = current
            if (activeColumn && overColumn && activeColumn === overColumn && active.id !== over.id) {
              const items = current[activeColumn]
              const oldIndex = items.findIndex((post) => post.id === active.id)
              const newIndex = items.findIndex((post) => post.id === over.id)
              if (oldIndex >= 0 && newIndex >= 0) {
                next = { ...current, [activeColumn]: arrayMove(items, oldIndex, newIndex) }
              }
            }
            next = normalizeBoard(next)
            commitBoard(next)
            persistBoard(next, dragStartBoard.current)
          }}
        >
          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-3">
            {COLUMNS.map((column) => (
              <PostColumn
                key={column.key}
                column={column}
                posts={board[column.key]}
                pending={pending}
                activePostId={activePostId}
                onAdd={() => openNew(column.key)}
                onEdit={openEdit}
                onDelete={remove}
                onCopy={copy}
                onMove={moveTo}
              />
            ))}
          </div>
          <DragOverlay>
            {activePost ? (
              <div className="w-80 rounded-xl border bg-card p-3 shadow-xl">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {STATUS_LABEL[activePost.status]}
                </p>
                <p className="mt-1 text-sm font-semibold leading-snug">{activePost.title}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit LinkedIn post' : 'Create LinkedIn post'}</DialogTitle>
            <DialogDescription>
              Lead with a specific observation, earn the reader&rsquo;s attention, and keep the link as supporting context.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="li-title">Working title / hook</FieldLabel>
              <Input
                id="li-title"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="A specific observation the reader will recognize"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="li-body">Post copy</FieldLabel>
              <Textarea
                id="li-body"
                value={form.body}
                onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                placeholder={form.status === 'idea' ? 'A short angle or evidence to explore…' : 'The complete LinkedIn post…'}
                maxLength={3000}
                className="min-h-64 whitespace-pre-wrap"
              />
              <FieldDescription className="flex justify-between gap-3">
                <span>{form.status === 'idea' ? 'Ideas can stay brief.' : 'Use short paragraphs and one clear takeaway.'}</span>
                <span className="shrink-0 tabular-nums">{form.body.length} / 3000</span>
              </FieldDescription>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="li-link">Supporting link</FieldLabel>
                <Input
                  id="li-link"
                  value={form.link}
                  onChange={(event) => setForm((current) => ({ ...current, link: event.target.value }))}
                  placeholder="https://www.loqara.com/blog/…"
                />
                <FieldDescription>Optional; LinkedIn can use it in the post or first comment.</FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="li-status">Pipeline stage</FieldLabel>
                <Select
                  value={form.status}
                  onValueChange={(value) => setForm((current) => ({ ...current, status: value as LinkedInPostStatus }))}
                >
                  <SelectTrigger id="li-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="idea">Idea</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="posted">Posted</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid gap-4 rounded-xl border bg-muted/30 p-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="li-image">Post image URL</FieldLabel>
                <Input
                  id="li-image"
                  value={form.image_url}
                  onChange={(event) => setForm((current) => ({ ...current, image_url: event.target.value }))}
                  placeholder="/linkedin/post-visual.webp"
                />
                <FieldDescription>Landscape 1.91:1 works well in the feed.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="li-image-alt">Image alt text</FieldLabel>
                <Input
                  id="li-image-alt"
                  value={form.image_alt}
                  onChange={(event) => setForm((current) => ({ ...current, image_alt: event.target.value }))}
                  placeholder="Describe what the image communicates"
                />
                <FieldDescription>Copy this into LinkedIn&rsquo;s image alt-text field.</FieldDescription>
              </Field>
            </div>

            {form.image_url && (
              <div className="overflow-hidden rounded-xl border bg-muted/30">
                <Image
                  src={form.image_url}
                  alt={form.image_alt || 'LinkedIn post visual preview'}
                  width={1200}
                  height={628}
                  unoptimized
                  className="aspect-[1.91/1] w-full object-cover"
                />
              </div>
            )}
          </FieldGroup>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
              {form.id ? 'Save changes' : 'Add to board'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function PostColumn({
  column,
  posts,
  pending,
  activePostId,
  onAdd,
  onEdit,
  onDelete,
  onCopy,
  onMove,
}: {
  column: (typeof COLUMNS)[number]
  posts: LinkedInPost[]
  pending: boolean
  activePostId: string | null
  onAdd: () => void
  onEdit: (post: LinkedInPost) => void
  onDelete: (post: LinkedInPost) => void
  onCopy: (post: LinkedInPost) => void
  onMove: (post: LinkedInPost, status: LinkedInPostStatus) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.key,
    data: { status: column.key },
  })
  const Icon = column.icon

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`linkedin-column-${column.key}`}
      className={cn(
        'flex min-h-[280px] flex-col overflow-hidden rounded-xl border bg-muted/30 transition-colors lg:min-h-0',
        isOver && 'border-primary/40 bg-primary/5 ring-2 ring-primary/10',
      )}
    >
      <header className="flex shrink-0 items-center gap-3 border-b bg-card px-3 py-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('size-2 rounded-full', column.dot)} aria-hidden="true" />
            <h2 id={`linkedin-column-${column.key}`} className="text-sm font-semibold">
              {column.label}
            </h2>
          </div>
          <p className="truncate text-xs text-muted-foreground">{column.description}</p>
        </div>
        <Badge variant="secondary" className="ml-auto tabular-nums">
          {posts.length}
        </Badge>
        <Button variant="ghost" size="icon-sm" onClick={onAdd} aria-label={`Add to ${column.label}`}>
          <PlusIcon />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        <SortableContext items={posts.map((post) => post.id)} strategy={verticalListSortingStrategy}>
        {posts.length === 0 ? (
          <button
            type="button"
            onClick={onAdd}
            className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-card/50 p-5 text-center text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <PlusIcon className="size-5" aria-hidden="true" />
            <span className="text-sm font-medium">Add the first {STATUS_LABEL[column.key].toLowerCase()}</span>
            <span className="text-xs">You can also drop a card here.</span>
          </button>
        ) : (
          posts.map((post, index) => (
            <PostCard
              key={post.id}
              post={post}
              index={index}
              pending={pending}
              active={activePostId === post.id}
              onEdit={() => onEdit(post)}
              onDelete={() => onDelete(post)}
              onCopy={() => void onCopy(post)}
              onMove={(status) => onMove(post, status)}
            />
          ))
        )}
        </SortableContext>
      </div>
    </section>
  )
}

function PostCard({
  post,
  index,
  pending,
  active,
  onEdit,
  onDelete,
  onCopy,
  onMove,
}: {
  post: LinkedInPost
  index: number
  pending: boolean
  active: boolean
  onEdit: () => void
  onDelete: () => void
  onCopy: () => void
  onMove: (status: LinkedInPostStatus) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: post.id,
    disabled: pending,
    data: { status: post.status },
  })

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group shrink-0 overflow-hidden rounded-xl border bg-card shadow-sm transition-[box-shadow,opacity,border-color] duration-200',
        isOver && 'border-primary/40 ring-2 ring-primary/10',
        (isDragging || active) && 'opacity-40 shadow-none',
      )}
    >
      {post.image_url ? (
        <div className="relative overflow-hidden border-b bg-muted">
          <Image
            src={post.image_url}
            alt={post.image_alt || ''}
            width={1200}
            height={628}
            unoptimized
            className="h-28 w-full object-cover transition-transform duration-300 motion-reduce:transition-none group-hover:scale-[1.01]"
          />
        </div>
      ) : (
        <div className="flex h-12 items-center gap-2 border-b bg-muted/40 px-3 text-xs text-muted-foreground">
          <ImageIcon className="size-4" aria-hidden="true" />
          Visual not attached yet
        </div>
      )}

      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-start gap-2">
          <button
            ref={setActivatorNodeRef}
            type="button"
            disabled={pending}
            {...attributes}
            {...listeners}
            aria-label={`Drag ${post.title}`}
            title="Drag to reorder or move column"
            className="flex size-8 shrink-0 cursor-grab items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
          >
            <GripVerticalIcon className="size-4" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <MegaphoneIcon className="size-3" aria-hidden="true" />
              {STATUS_LABEL[post.status]}
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">#{index + 1}</span>
            </div>
            <h3 className="text-sm font-semibold leading-snug">{post.title}</h3>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button variant="ghost" size="icon-xs" onClick={onCopy} aria-label={`Copy ${post.title}`}>
              <CopyIcon />
            </Button>
            <Button variant="ghost" size="icon-xs" onClick={onEdit} aria-label={`Edit ${post.title}`}>
              <PencilIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onDelete}
              disabled={pending}
              aria-label={`Delete ${post.title}`}
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2Icon />
            </Button>
          </div>
        </div>

        {post.body && (
          <p className="line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
            {post.body}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className="tabular-nums">{post.body.length.toLocaleString()} chars</span>
          {post.image_url && (
            <span className="inline-flex items-center gap-1">
              <ImageIcon className="size-3" aria-hidden="true" /> Visual ready
            </span>
          )}
        </div>

        {post.link && (
          <a
            href={post.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 self-start rounded-lg bg-muted px-2 py-1.5 text-[11px] font-medium text-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ExternalLinkIcon className="size-3 shrink-0" />
            <span className="truncate">{post.link.replace(/^https?:\/\//, '')}</span>
          </a>
        )}

        <Select value={post.status} onValueChange={(value) => onMove(value as LinkedInPostStatus)}>
          <SelectTrigger size="sm" className="w-full">
            <span className="text-muted-foreground">Move to</span>
            <SelectValue>{STATUS_LABEL[post.status]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="idea">Idea</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="posted">Posted</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </article>
  )
}
