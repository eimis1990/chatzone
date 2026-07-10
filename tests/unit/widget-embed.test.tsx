import { render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { WidgetEmbed } from '@/components/landing/WidgetEmbed'

describe('WidgetEmbed', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('removes the greeting together with every other widget surface on unmount', () => {
    const { unmount } = render(<WidgetEmbed botKey="TEST_KEY" />)

    const greeting = document.createElement('div')
    greeting.setAttribute('data-cbz-greeting', '')
    document.body.appendChild(greeting)

    const launcher = document.createElement('button')
    launcher.setAttribute('data-cbz-launcher', '')
    document.body.appendChild(launcher)

    const wrapper = document.createElement('div')
    wrapper.setAttribute('data-cbz-wrapper', '')
    document.body.appendChild(wrapper)

    unmount()

    expect(document.querySelector('[data-cbz-greeting]')).toBeNull()
    expect(document.querySelector('[data-cbz-launcher]')).toBeNull()
    expect(document.querySelector('[data-cbz-wrapper]')).toBeNull()
    expect(document.querySelector('script[data-cbz-embed]')).toBeNull()
  })
})
