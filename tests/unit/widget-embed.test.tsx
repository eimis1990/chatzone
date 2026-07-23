import { fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WidgetEmbed } from '@/components/landing/WidgetEmbed'

describe('WidgetEmbed', () => {
  afterEach(() => {
    document.body.replaceChildren()
    vi.useRealTimers()
  })

  // Regression: the idle pre-load timer used to survive a manual proxy open,
  // fire at 6s, and toggle the already-open widget shut — after which the
  // scheduled greeting fired into the closed state as if freshly loaded.
  it('cancels the idle pre-load on a real open and never toggles an open widget shut', () => {
    vi.useFakeTimers()
    const { getByTestId } = render(<WidgetEmbed botKey="k" loadingPolicy="idle" launcher={{
      color: '#c04b0c', iconColor: '#fff', icon: 'chat', bottom: 20, side: 20,
    }} />)

    // Stand in for the widget.js launcher, already OPEN after the user's click.
    const launcher = document.createElement('button')
    launcher.setAttribute('data-cbz-launcher', '')
    launcher.setAttribute('aria-expanded', 'true')
    const clickSpy = vi.fn()
    launcher.addEventListener('click', clickSpy)
    document.body.appendChild(launcher)

    fireEvent.click(getByTestId('deferred-widget-launcher'))
    vi.advanceTimersByTime(8000) // well past the 6s idle delay

    expect(clickSpy).not.toHaveBeenCalled()
  })

  it('opens the widget when the proxy is clicked and the launcher is closed', () => {
    const { getByTestId } = render(<WidgetEmbed botKey="k" loadingPolicy="idle" launcher={{
      color: '#c04b0c', iconColor: '#fff', icon: 'chat', bottom: 20, side: 20,
    }} />)

    const launcher = document.createElement('button')
    launcher.setAttribute('data-cbz-launcher', '')
    launcher.setAttribute('aria-expanded', 'false')
    const clickSpy = vi.fn()
    launcher.addEventListener('click', clickSpy)
    document.body.appendChild(launcher)

    fireEvent.click(getByTestId('deferred-widget-launcher'))

    expect(clickSpy).toHaveBeenCalledTimes(1)
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
