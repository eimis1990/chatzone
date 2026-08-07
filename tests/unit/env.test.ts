import { describe, it, expect } from 'vitest'
import { parseEnv } from '@/lib/env'

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  OPENAI_API_KEY: 'sk-test',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
}

describe('parseEnv', () => {
  it('parses a fully-populated environment', () => {
    const env = parseEnv(valid)
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://abc.supabase.co')
    expect(env.OPENAI_API_KEY).toBe('sk-test')
  })

  it('throws when a required variable is missing', () => {
    const { OPENAI_API_KEY, ...partial } = valid
    void OPENAI_API_KEY
    expect(() => parseEnv(partial)).toThrow(/OPENAI_API_KEY/)
  })

  it('throws when a URL variable is malformed', () => {
    expect(() => parseEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: 'not-a-url' })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    )
  })

  it('keeps GitHub publishing credentials server-only and validates the repository shape', () => {
    const env = parseEnv({
      ...valid,
      GITHUB_CONTENT_TOKEN: 'github_pat_test',
      GITHUB_CONTENT_REPOSITORY: 'eimis1990/chatzone',
      GITHUB_CONTENT_BASE_BRANCH: 'main',
    })
    expect(env.GITHUB_CONTENT_REPOSITORY).toBe('eimis1990/chatzone')
    expect(() => parseEnv({ ...valid, GITHUB_CONTENT_REPOSITORY: 'not-a-repository' })).toThrow(/GITHUB_CONTENT_REPOSITORY/)
  })
})
