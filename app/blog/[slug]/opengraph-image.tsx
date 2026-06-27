import { ImageResponse } from 'next/og'
import { getAllPosts, getPostBySlug } from '@/lib/blog'

export const alt = 'Loqara blog post'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }))
}

// Branded social card: the post title on the dark Loqara background.
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  const title = post?.title ?? 'Loqara Blog'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#101213',
          color: '#ffffff',
          padding: '72px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 42, fontWeight: 700 }}>
          Loqara<span style={{ color: '#e97634' }}>.</span>
        </div>
        <div style={{ display: 'flex', fontSize: 56, fontWeight: 700, lineHeight: 1.15, maxWidth: 1010 }}>
          {title}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 26,
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          <span>AI chat &amp; voice agent for modern stores</span>
          <span style={{ color: '#e97634' }}>loqara.com/blog</span>
        </div>
      </div>
    ),
    { ...size },
  )
}
