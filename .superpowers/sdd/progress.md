# Language Selection Feature — Progress Ledger

Base commit: 02b337dccc1cbc2e8f3f03cf59d80d5ece70aa0d
Branch: feat/language-selection
Plan: docs/superpowers/plans/2026-07-07-language-selection.md

## Tasks
(none complete yet)
Task 1: complete (commit 7c9fd40, review clean)
  Minor (for final review): ChatWindow languageMeta() falls back to English for out-of-union codes vs old '🌐' fallback — cosmetic, only en/lt exist.
Task 2: complete (commit ad27ad9, review clean)
Task 3: complete (commit d373b7b, review clean)
  Deviation from plan (reviewer-approved): clamp reorders primary-first ONLY when limit<configured.length, else config order passes through — keeps paid-plan order + pre-existing tests green. Plan's literal snippet would have reordered always.
Task 4: complete (commits 77a299c + b05aa2a, review clean after comment fix)
  Beyond brief (reviewer-approved): fixed lib/ai/prompt.ts contentFor fallback (real latent bug exposed by optional content.en). Important finding fixed: stale lib/types.ts comments.
Task 5: complete (commit af1e0a9, review clean)
Task 6: complete (commits 03d4870 + dd2125e, review clean after free-tier-lock fix)
  Important fixed: free-tier controls now gate on entitlement + initial languages clamped to maxLanguages (downgrade-safe).
ALL TASKS COMPLETE — pending final whole-branch review.
Minor roll-up for final review:
  - ChatWindow languageMeta() English fallback for out-of-union codes (cosmetic, only en/lt exist)
  - tests/unit/botConfig.test.ts:132 stale comment references removed withEnabledLanguagesOnly
  - Defense-in-depth: saveConfig does NOT clamp stored languages to maxLanguages (free bot could persist 2 langs on re-save; live widget still clamps via publicBotConfig, so visitor-safe)
FINAL WHOLE-BRANCH REVIEW: Ready to merge — Yes (no Critical/Important). Minor #3 (stale comment) fixed in follow-up commit. Minor #1 (saveConfig server clamp) + informational (free re-save prunes non-primary content, vs spec §4 reversibility) left for user decision.
