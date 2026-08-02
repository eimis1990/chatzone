import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProductCards } from '@/components/widget/ProductCards'
import type { CommerceProduct } from '@/lib/commerce/types'

const products: CommerceProduct[] = Array.from({ length: 6 }, (_, i) => ({
  id: `p${i}`,
  title: `Fotelis ${i}`,
  price: `${100 + i} €`,
  url: `https://shop.test/p/${i}`,
  imageUrl: `https://shop.test/img/${i}.jpg`,
  inStock: i !== 2,
}))

describe('ProductCards grid variant', () => {
  it('renders 4 square tiles, each linking to its own product page', () => {
    render(<ProductCards products={products} variant="grid" language="lt" />)
    const tiles = screen.getAllByRole('listitem')
    expect(tiles).toHaveLength(4)
    tiles.forEach((tile, i) => {
      expect(tile).toHaveAttribute('href', `https://shop.test/p/${i}`)
      expect(tile.className).toContain('aspect-square')
    })
    // The rest sit behind "See all" like every other variant.
    expect(screen.getByRole('button', { name: /Žiūrėti visus \(6\)/ })).toBeInTheDocument()
  })

  it('marks out-of-stock tiles', () => {
    render(<ProductCards products={products.slice(0, 4)} variant="grid" language="lt" />)
    expect(screen.getByText('Nėra sandėlyje')).toBeInTheDocument()
  })
})
