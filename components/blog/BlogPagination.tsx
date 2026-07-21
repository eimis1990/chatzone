import Link from 'next/link'

function pageHref(page: number): string {
  return page === 1 ? '/blog' : `/blog/page/${page}`
}

function visiblePages(page: number, totalPages: number): Array<number | 'ellipsis'> {
  const pages = new Set([1, totalPages, page - 1, page, page + 1])
  const sorted = [...pages].filter((item) => item >= 1 && item <= totalPages).sort((a, b) => a - b)
  const result: Array<number | 'ellipsis'> = []

  for (const item of sorted) {
    const previous = result.at(-1)
    if (typeof previous === 'number' && item - previous > 1) result.push('ellipsis')
    result.push(item)
  }
  return result
}

const linkClass =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-black/[0.08] px-4 text-sm font-semibold text-gray-700 transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary'

export function BlogPagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Blog pagination" className="mt-14 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link href={pageHref(page - 1)} prefetch={false} rel="prev" className={linkClass}>
          <span aria-hidden="true">←</span>
          <span className="ml-2">Previous</span>
        </Link>
      )}

      {visiblePages(page, totalPages).map((item, index) =>
        item === 'ellipsis' ? (
          <span key={`ellipsis-${index}`} aria-hidden="true" className="px-1 text-gray-400">
            …
          </span>
        ) : (
          <Link
            key={item}
            href={pageHref(item)}
            prefetch={false}
            aria-label={`Blog page ${item}`}
            aria-current={item === page ? 'page' : undefined}
            className={`${linkClass} px-0 ${
              item === page ? 'border-primary bg-primary text-white hover:bg-primary hover:text-white' : ''
            }`}
          >
            {item}
          </Link>
        ),
      )}

      {page < totalPages && (
        <Link href={pageHref(page + 1)} prefetch={false} rel="next" className={linkClass}>
          <span className="mr-2">Next</span>
          <span aria-hidden="true">→</span>
        </Link>
      )}
    </nav>
  )
}
