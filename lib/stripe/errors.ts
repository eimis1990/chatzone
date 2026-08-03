interface StripeErrorLike {
  type?: unknown
  code?: unknown
  message?: unknown
}

/** Stripe uses resource_missing for many resource types; narrow it to customers. */
export function isMissingStripeCustomerError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as StripeErrorLike
  return (
    candidate.type === 'StripeInvalidRequestError' &&
    candidate.code === 'resource_missing' &&
    typeof candidate.message === 'string' &&
    /^No such customer\b/i.test(candidate.message)
  )
}
