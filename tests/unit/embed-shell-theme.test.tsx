import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EmbedShell } from '@/app/embed/[publicKey]/EmbedShell'

describe('EmbedShell first-paint theme', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses the server-supplied widget colors while config is loading', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))

    render(
      <EmbedShell
        publicKey="dark-bot"
        initialLoaderColor="#f2762e"
        initialBackgroundColor="#0f2420"
      />,
    )

    const loader = screen.getByRole('status', { name: 'Loading' })
    expect(loader.parentElement).toHaveStyle({ backgroundColor: '#0f2420' })
    expect(loader).toHaveStyle({ '--cbz-loader-color': '#f2762e' })
  })
})
