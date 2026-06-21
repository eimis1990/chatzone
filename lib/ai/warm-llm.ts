/**
 * Fire a cheap authenticated "warmup" request at the custom-LLM endpoint so its
 * serverless lambda is loaded before the first spoken turn. ElevenLabs aborts a
 * turn with "custom_llm generation failed" if the LLM cold-starts and overruns
 * its timeout — warming during call setup hides that latency.
 *
 * Best-effort: never throws, returns nothing. Wrap in `after()` so it runs after
 * the token response is sent without delaying it.
 */
export async function warmCustomLlm(
  appUrl: string,
  publicKey: string,
  llmToken: string | null,
): Promise<void> {
  if (!llmToken) return
  try {
    await fetch(`${appUrl}/api/llm/${publicKey}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${llmToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ warmup: true }),
    })
  } catch {
    // Warmup is best-effort; a failure just means the first turn may cold-start.
  }
}
