#!/usr/bin/env node
/**
 * Seed the owner (super-admin) account.
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-owner.mjs <email> <password>
 *
 * Requires in the environment:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * What it does:
 *   1. Creates (or updates) an auth user with the given email + password,
 *      skipping email verification.
 *   2. Upserts the `profiles` row setting role = 'owner'.
 *
 * It is safe to run multiple times against the same email — it will update
 * the password if the user already exists.
 */

import { createClient } from '@supabase/supabase-js'

const [, , email, password] = process.argv

if (!email || !password) {
  console.error('Usage: node --env-file=.env.local scripts/seed-owner.mjs <email> <password>')
  process.exit(1)
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY\n' +
      'Make sure you run with --env-file=.env.local',
  )
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

async function main() {
  console.log(`\nSeeding owner account for: ${email}`)

  // ── Try to find an existing user ─────────────────────────────────────────
  const { data: existingList, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) {
    console.error('Failed to list users:', listError.message)
    process.exit(1)
  }

  const existing = existingList.users.find((u) => u.email === email)

  let userId

  if (existing) {
    console.log(`  Found existing user (${existing.id}). Updating password…`)
    const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    })
    if (updateError) {
      console.error('Failed to update user:', updateError.message)
      process.exit(1)
    }
    userId = existing.id
  } else {
    console.log('  Creating new auth user…')
    const { data, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createError || !data.user) {
      console.error('Failed to create user:', createError?.message ?? 'unknown error')
      process.exit(1)
    }
    userId = data.user.id
    console.log(`  Created user: ${userId}`)
  }

  // ── Upsert profile with role = 'owner' ────────────────────────────────────
  console.log('  Setting profiles.role = owner…')
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: userId, role: 'owner', full_name: 'Owner' }, { onConflict: 'id' })

  if (profileError) {
    console.error('Failed to upsert profile:', profileError.message)
    process.exit(1)
  }

  console.log('\n  Owner account ready.')
  console.log(`  Email:    ${email}`)
  console.log(`  Role:     owner`)
  console.log(`  User ID:  ${userId}`)
  console.log('\n  Log in at /login')
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
