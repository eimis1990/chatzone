import { describe, expect, it } from 'vitest'
import {
  isKnownMetaMaskConnectionError,
  METAMASK_DEV_OVERLAY_GUARD_SCRIPT,
} from '@/lib/browser-extension-errors'

const EXTENSION_STACK = `Error: Failed to connect to MetaMask
    at Object.connect (chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn/scripts/inpage.js:7:84179)`

describe('browser extension error guard', () => {
  it('matches only the exact MetaMask extension connection error', () => {
    const error = Object.assign(new Error('Failed to connect to MetaMask'), { stack: EXTENSION_STACK })

    expect(isKnownMetaMaskConnectionError(error)).toBe(true)
    expect(isKnownMetaMaskConnectionError(new Error('Failed to connect to MetaMask'))).toBe(false)
    expect(isKnownMetaMaskConnectionError(new Error('Application failed'))).toBe(false)
  })

  it('prevents the extension rejection from reaching a later bubble listener', () => {
    window.eval(METAMASK_DEV_OVERLAY_GUARD_SCRIPT)
    let reachedOverlayListener = false
    window.addEventListener('unhandledrejection', () => {
      reachedOverlayListener = true
    }, { once: true })

    const event = new Event('unhandledrejection', { cancelable: true })
    Object.defineProperty(event, 'reason', {
      value: Object.assign(new Error('Failed to connect to MetaMask'), { stack: EXTENSION_STACK }),
    })
    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(reachedOverlayListener).toBe(false)
  })
})
