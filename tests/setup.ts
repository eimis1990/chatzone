import '@testing-library/jest-dom/vitest'
import { config } from 'dotenv'

// Load .env.local (gitignored) so integration tests can reach a real Supabase
// project. Unit tests don't need it; integration tests skip when it's absent.
config({ path: '.env.local' })
