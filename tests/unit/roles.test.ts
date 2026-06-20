import { describe, it, expect } from 'vitest'
import { resolveHome, routeDecision } from '@/lib/auth/roles'

describe('resolveHome', () => {
  it('sends owners to /owner', () => expect(resolveHome('owner')).toBe('/owner'))
  it('sends clients to /app', () => expect(resolveHome('client')).toBe('/app'))
})

describe('routeDecision', () => {
  it('allows public paths regardless of auth', () => {
    expect(routeDecision({ pathname: '/login', role: null }).type).toBe('allow')
    expect(routeDecision({ pathname: '/embed/abc123', role: null }).type).toBe('allow')
    expect(routeDecision({ pathname: '/widget.js', role: null }).type).toBe('allow')
    expect(routeDecision({ pathname: '/api/chat', role: null }).type).toBe('allow')
  })

  it('redirects unauthenticated users away from protected areas to /login', () => {
    expect(routeDecision({ pathname: '/owner', role: null })).toEqual({ type: 'redirect', to: '/login' })
    expect(routeDecision({ pathname: '/app/bots/1', role: null })).toEqual({ type: 'redirect', to: '/login' })
  })

  it('keeps a client out of the owner area', () => {
    expect(routeDecision({ pathname: '/owner/clients', role: 'client' })).toEqual({
      type: 'redirect',
      to: '/app',
    })
  })

  it('keeps an owner out of the client area', () => {
    expect(routeDecision({ pathname: '/app', role: 'owner' })).toEqual({
      type: 'redirect',
      to: '/owner',
    })
  })

  it('allows the correct role into its own area', () => {
    expect(routeDecision({ pathname: '/owner/clients', role: 'owner' }).type).toBe('allow')
    expect(routeDecision({ pathname: '/app/bots/1', role: 'client' }).type).toBe('allow')
  })

  it('redirects an authenticated user from the bare login page to their home', () => {
    expect(routeDecision({ pathname: '/login', role: 'owner' })).toEqual({ type: 'redirect', to: '/owner' })
    expect(routeDecision({ pathname: '/login', role: 'client' })).toEqual({ type: 'redirect', to: '/app' })
  })
})
